/**
 * Vibe Eyes MCP Client
 * Simple client to send canvas screenshots and console logs to the MCP server
 * Must be explicitly initialized to avoid performance impact on games
 */
import { io } from 'socket.io-client';

// Configuration with defaults
const DEFAULT_CONFIG = {
  serverUrl: 'http://localhost:8869',  // Using socket.io now so we can use HTTP URL
  captureDelay: 1000, // Minimum delay between captures in ms
  maxLogs: 10,        // Maximum number of logs to store
  maxErrors: 10,      // Maximum number of errors to store
  autoConnect: true,  // Connect automatically by default
  autoCapture: false, // Don't start capturing automatically unless specified
  canvasId: null      // Canvas element ID to capture (null = auto-detect)
};

class VibeEyesClient {
  constructor(config = {}) {
    // Merge default config with user config
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize state
    this.socket = null;
    this.canvas = null;
    this.console_logs = [];
    this.console_errors = [];
    this.unhandled_exception = null;
    this.isConnected = false;
    this.isCapturing = false;
    this.captureTimeout = null;
    this.initialized = false;
    this.svgDisplayEnabled = false;
    this.svgContainer = null;
    this.lastSvgData = null;
    
    // Set up console proxies (always do this to collect logs)
    this.setupConsoleProxy();
    
    // Set up global error handling
    this.setupGlobalErrorHandling();
    
    // Check if we should auto-initialize
    if (this.config.autoConnect) {
      // Initialize on DOM ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.initialize());
      } else {
        this.initialize();
      }
    }
  }
  
  /**
   * Initialize the client - must be called explicitly unless autoConnect is true
   * @returns {VibeEyesClient} The client instance for chaining
   */
  initialize() {
    if (this.initialized) {
      return this;
    }
    
    this.initialized = true;
    
    // Find canvas element
    this.findCanvas();
    
    // Connect to server
    this.connectToServer();
    
    return this;
  }
  
  /**
   * Find the canvas element
   */
  findCanvas() {
    // If a specific canvas ID is provided in config, try that first
    if (this.config.canvasId) {
      this.canvas = document.getElementById(this.config.canvasId);
      if (this.canvas) {
        return;
      }
      // Log warning if specified canvas not found
      console.warn(`[Vibe-Eyes] Canvas with ID "${this.config.canvasId}" not found, falling back to auto-detection`);
    }
    
    // Try common canvas IDs
    this.canvas = document.getElementById('game-canvas') || document.getElementById('gameCanvas');
    
    // Fall back to query selector for any canvas
    if (!this.canvas) {
      const canvases = document.querySelectorAll('canvas');
      if (canvases.length > 0) {
        this.canvas = canvases[0];
      }
    }
  }
  
  /**
   * Connect to the vectorizer server
   */
  connectToServer() {
    try {
      // Try both websocket and polling transport for better compatibility
      this.socket = io(this.config.serverUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      
      // Log socket connection events for debugging
      this.socket.on('connecting', () => {
        // Silent connecting
      });
      
      this.socket.on('connect', () => {
        this.isConnected = true;
        
        // Start capture loop after connection, but only if autoCapture is enabled
        if (this.config.autoCapture) {
          this.startCaptureLoop();
        }
      });
      
      this.socket.on('disconnect', () => {
        this.isConnected = false;
        
        // Stop capture loop on disconnect
        this.stopCaptureLoop();
      });
      
      this.socket.on('error', (error) => {
        console.error('[Vibe-Eyes] Socket error:', error);
      });
      
      // Listen for SVG data from server
      this.socket.on('svgData', (svgData) => {
        this.lastSvgData = svgData;
        if (this.svgDisplayEnabled && this.svgContainer) {
          this.updateSvgDisplay();
        }
      });
    } catch (error) {
      console.error('[Vibe-Eyes] Failed to connect:', error);
    }
  }
  
  /**
   * Set up console proxy to capture logs
   */
  setupConsoleProxy() {
    // Store original console methods with proper binding
    const originalLog = console.log.bind(console);
    const originalError = console.error.bind(console);
    
    // Store reference to this for closure
    const self = this;
    
    // Override console.log
    console.log = function(...args) {
      // Call original method
      originalLog(...args);
      
      // Add to our log queue
      self.console_logs.push({
        timestamp: Date.now(),
        data: args
      });
      
      // Keep queue at configured length
      while (self.console_logs.length > self.config.maxLogs) {
        self.console_logs.shift();
      }
    };
    
    // Override console.error
    console.error = function(...args) {
      // Call original method
      originalError(...args);
      
      // Add to our error queue
      self.console_errors.push({
        timestamp: Date.now(),
        data: args
      });
      
      // Keep queue at configured length
      while (self.console_errors.length > self.config.maxErrors) {
        self.console_errors.shift();
      }
    };
  }
  
  /**
   * Set up global error handling to catch unhandled exceptions
   */
  setupGlobalErrorHandling() {
    const self = this;
    
    // Capture unhandled exceptions
    window.addEventListener('error', function(event) {
      const error = event.error || new Error(event.message);
      const stack = error.stack || 'No stack trace available';
      
      // Store the error with timestamp
      self.unhandled_exception = {
        timestamp: Date.now(),
        message: error.message || 'Unknown error',
        stack: stack,
        source: event.filename || 'Unknown source',
        line: event.lineno,
        column: event.colno,
        type: error.name || 'Error'
      };
      
      // Also log to console for visibility
      console.error('[Vibe-Eyes] Unhandled exception captured:', self.unhandled_exception);
    });
    
    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
      const error = event.reason || new Error('Unhandled Promise rejection');
      const stack = error.stack || 'No stack trace available';
      
      // Store the error with timestamp
      self.unhandled_exception = {
        timestamp: Date.now(),
        message: error.message || 'Unhandled Promise rejection',
        stack: stack,
        type: 'UnhandledPromiseRejection',
        reason: event.reason
      };
      
      // Also log to console for visibility
      console.error('[Vibe-Eyes] Unhandled promise rejection captured:', self.unhandled_exception);
    });
  }
  
  /**
   * Start the capture loop
   */
  startCaptureLoop() {
    if (this.isCapturing) return;
    
    this.isCapturing = true;
    this.captureAndSend();
  }
  
  /**
   * Stop the capture loop
   */
  stopCaptureLoop() {
    this.isCapturing = false;
    
    if (this.captureTimeout) {
      clearTimeout(this.captureTimeout);
      this.captureTimeout = null;
    }
  }
  
  /**
   * Enable displaying SVG data from the server in the DOM
   * @param {Object} options - Display options
   * @param {HTMLElement|string} [options.container] - Container element or CSS selector for the SVG
   * @param {string} [options.position='top-right'] - Position: 'top-left', 'top-right', 'bottom-left', 'bottom-right'
   * @param {number} [options.width=300] - Width of the SVG container
   * @param {number} [options.height=300] - Height of the SVG container
   * @param {number} [options.zIndex=9999] - z-index of the container
   * @returns {VibeEyesClient} The client instance for chaining
   */
  enableSvgDisplay(options = {}) {
    // Set defaults for options
    const defaultOptions = {
      container: null,
      position: 'top-right',
      width: 300,
      height: 300,
      zIndex: 9999
    };
    
    const displayOptions = { ...defaultOptions, ...options };
    
    // If a container is provided, use it
    if (displayOptions.container) {
      if (typeof displayOptions.container === 'string') {
        this.svgContainer = document.querySelector(displayOptions.container);
      } else {
        this.svgContainer = displayOptions.container;
      }
    }
    
    // If no container or container not found, create one
    if (!this.svgContainer) {
      this.svgContainer = document.createElement('div');
      this.svgContainer.style.position = 'fixed';
      this.svgContainer.style.width = `${displayOptions.width}px`;
      this.svgContainer.style.height = `${displayOptions.height}px`;
      this.svgContainer.style.zIndex = displayOptions.zIndex;
      this.svgContainer.style.background = 'rgba(0, 0, 0, 0.1)';
      this.svgContainer.style.borderRadius = '5px';
      this.svgContainer.style.overflow = 'hidden';
      
      // Position the container
      switch (displayOptions.position) {
        case 'top-left':
          this.svgContainer.style.top = '10px';
          this.svgContainer.style.left = '10px';
          break;
        case 'top-right':
          this.svgContainer.style.top = '10px';
          this.svgContainer.style.right = '10px';
          break;
        case 'bottom-left':
          this.svgContainer.style.bottom = '10px';
          this.svgContainer.style.left = '10px';
          break;
        case 'bottom-right':
          this.svgContainer.style.bottom = '10px';
          this.svgContainer.style.right = '10px';
          break;
      }
      
      document.body.appendChild(this.svgContainer);
    }
    
    this.svgDisplayEnabled = true;
    
    // If we already have SVG data, display it
    if (this.lastSvgData) {
      this.updateSvgDisplay();
    }
    
    return this;
  }
  
  /**
   * Disable SVG display
   * @param {boolean} [removeContainer=false] - Whether to remove the container from the DOM
   * @returns {VibeEyesClient} The client instance for chaining
   */
  disableSvgDisplay(removeContainer = false) {
    this.svgDisplayEnabled = false;
    
    if (removeContainer && this.svgContainer && this.svgContainer.parentNode) {
      this.svgContainer.parentNode.removeChild(this.svgContainer);
      this.svgContainer = null;
    }
    
    return this;
  }
  
  /**
   * Toggle SVG display on/off
   * @param {Object} [options] - Display options when enabling
   * @returns {boolean} The new state (true = enabled, false = disabled)
   */
  toggleSvgDisplay(options) {
    if (this.svgDisplayEnabled) {
      this.disableSvgDisplay();
      return false;
    } else {
      this.enableSvgDisplay(options);
      return true;
    }
  }
  
  /**
   * Update the SVG display with the latest data
   * @private
   */
  updateSvgDisplay() {
    if (!this.svgContainer || !this.lastSvgData) return;
    
    // Update the SVG content
    this.svgContainer.innerHTML = this.lastSvgData;
    
    // Make sure any SVG elements fill the container
    const svgElements = this.svgContainer.querySelectorAll('svg');
    for (const svg of svgElements) {
      svg.style.width = '100%';
      svg.style.height = '100%';
    }
  }
  
  /**
   * Capture and send data to the server
   */
  captureAndSend() {
    // Only proceed if connected and capturing is enabled
    if (!this.isConnected || !this.isCapturing) {
      return;
    }
    
    // Make sure we have a canvas
    if (!this.canvas) {
      this.findCanvas();
      
      if (!this.canvas) {
        console.warn('[Vectorizer] No canvas found, retrying in 1 second');
        this.captureTimeout = setTimeout(() => this.captureAndSend(), 1000);
        return;
      }
    }
    
    try {
      // Get canvas data URL
      const dataUrl = this.canvas.toDataURL('image/png');
      
      // Prepare message
      const message = {
        timestamp: Date.now(),
        image: dataUrl,
        console_logs: [...this.console_logs],
        console_errors: [...this.console_errors],
        unhandled_exception: this.unhandled_exception
      };
      
      // Send to server and wait for acknowledgment
      this.socket.emit('debugCapture', message, (response) => {
        // Schedule next capture after server acknowledges receipt
        this.captureTimeout = setTimeout(
          () => this.captureAndSend(),
          this.config.captureDelay
        );
      });
    } catch (error) {
      console.error('[Vectorizer] Error capturing canvas:', error);
      
      // Retry after delay even if there was an error
      this.captureTimeout = setTimeout(
        () => this.captureAndSend(),
        this.config.captureDelay
      );
    }
  }
}

// Create global variable but don't auto-initialize
window.VibeEyesClient = new VibeEyesClient();

/**
 * Initialize the Vibe Eyes client with optional configuration
 * @param {Object} config - Configuration options
 * @returns {VibeEyesClient} The initialized client instance
 */
export function initializeVibeEyes(config = {}) {
  // If already initialized, just update config
  if (window.VibeEyesClient.initialized) {
    window.VibeEyesClient.config = { ...window.VibeEyesClient.config, ...config };
    return window.VibeEyesClient;
  }
  
  // Create or reinitialize with new config
  window.VibeEyesClient = new VibeEyesClient(config);
  window.VibeEyesClient.initialize();
  
  return window.VibeEyesClient;
}

// Alias for backward compatibility
export const initializeVectorizer = initializeVibeEyes;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    VibeEyesClient,
    initializeVibeEyes,
    initializeVectorizer
  };
}

// Make available on globalThis
if (typeof globalThis !== 'undefined') {
  globalThis.initializeVibeEyes = initializeVibeEyes;
}

// Export for ES modules
export { VibeEyesClient };