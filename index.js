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
    this.svgWindow = null;
    this.statsContainer = null;
    this.lastSvgData = null;
    this.lastResponseData = null;
    this._windowMessageListenerSet = false;
    this._windowWasEverOpened = false;
    
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
    
    // Start checking for connection and autostart capture
    this.checkConnectionAndCapture();
    
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
        
        // Start capture loop after connection
        this.startCaptureLoop();
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
        if (this.svgDisplayEnabled) {
          // Create container if it doesn't exist
          if (!this.svgContainer) {
            this.enableSvgDisplay();
          }
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
   * Check connection and start capture when connected
   * @private
   */
  checkConnectionAndCapture() {
    if (this.isConnected) {
      this.startCaptureLoop();
    } else {
      // Not connected yet, check again in 1 second
      setTimeout(() => this.checkConnectionAndCapture(), 1000);
    }
  }
  
  /**
   * Enable displaying SVG data from the server in the DOM
   * @param {Object} options - Display options
   * @param {HTMLElement|string} [options.container] - Container element or CSS selector for the SVG
   * @returns {VibeEyesClient} The client instance for chaining
   */
  enableSvgDisplay(options = {}) {
    // If a container is provided, use it
    if (options.container) {
      if (typeof options.container === 'string') {
        this.svgContainer = document.querySelector(options.container);
      } else {
        this.svgContainer = options.container;
      }
    }
    
    // If no container or container not found, create one
    if (!this.svgContainer) {
      this.svgContainer = document.createElement('div');
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
   * @returns {VibeEyesClient} The client instance for chaining
   */
  disableSvgDisplay() {
    this.svgDisplayEnabled = false;
    
    // Always close the window when disabling
    if (this.svgWindow && !this.svgWindow.closed) {
      try {
        this.svgWindow.close();
      } catch (e) {
        console.warn('[Vibe-Eyes] Error closing debug window:', e.message);
      }
    }
    
    // Reset all references
    this.svgWindow = null;
    this.svgContainer = null;
    this.statsContainer = null;
    
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
    if (!this.lastSvgData) return;
    
    try {
      // Check if window exists and is still open
      if (this.svgWindow && !this.svgWindow.closed) {
        // Window exists and is open - try to access document to confirm it's working
        try {
          // This will throw if we can't access the document
          const test = this.svgWindow.document.body;
        } catch (e) {
          // Can't access document, consider window closed
          this.svgWindow = null;
          this.svgContainer = null;
          this.statsContainer = null;
        }
      }
      
      // Create a popup window if it doesn't exist or is closed
      if (!this.svgWindow || this.svgWindow.closed) {
        this.svgWindow = window.open('', 'VibeEyesDebug', 'width=800,height=800');
        
        // Check if window was successfully created
        if (!this.svgWindow) {
          // Since we just tried to create a window and failed, it's probably blocked
          // However, if we previously had a window that's now null, it was likely just closed by the user
          // Only show warning if this is the first attempt to open a window
          if (!this._windowWasEverOpened) {
            console.warn('[Vibe-Eyes] Failed to open debug window. Pop-up might be blocked.');
          }
          this.svgDisplayEnabled = false;
          return;
        }
        
        // Record that we successfully opened a window at least once
        this._windowWasEverOpened = true;
        
        // Set up basic HTML structure
        this.svgWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Vibe Eyes Debug View</title>
              <style>
                body { margin: 0; padding: 0; font-family: sans-serif; }
                #svgContainer { width: 100%; height: 500px; overflow: hidden; display: flex; justify-content: center; }
                #statsContainer { padding: 20px; overflow: auto; height: 300px; box-sizing: border-box; }
                h3 { margin-top: 0; }
                pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; }
              </style>
            </head>
            <body>
              <div id="svgContainer"></div>
              <div id="statsContainer">
                <h3>Debug Stats</h3>
                <pre id="statsContent">Waiting for data...</pre>
              </div>
              
              <script>
                // Handle window close event
                window.addEventListener('beforeunload', function() {
                  if (window.opener && !window.opener.closed) {
                    window.opener.postMessage('debugWindowClosed', '*');
                  }
                });
                
                // Function to resize SVG to fit window
                function resizeSvg() {
                  const svgElements = document.querySelectorAll('svg');
                  for (const svg of svgElements) {
                    // Only modify styles, not attributes
                    svg.style.width = '100%';
                    svg.style.maxWidth = '100%';
                  }
                }
                
                // Resize on window resize
                window.addEventListener('resize', resizeSvg);
                
                // Also call it after a short delay to ensure SVG is loaded
                setTimeout(resizeSvg, 100);
              </script>
            </body>
          </html>
        `);
        this.svgWindow.document.close();
        
        // Set up message listener to detect window closure (if not already set up)
        if (!this._windowMessageListenerSet) {
          window.addEventListener('message', (event) => {
            if (event.data === 'debugWindowClosed') {
              // User manually closed the window
              console.log('[Vibe-Eyes] Debug window closed by user');
              this.svgWindow = null;
              this.svgContainer = null;
              this.statsContainer = null;
              
              // Keep the display enabled so it will reopen next time
            }
          });
          this._windowMessageListenerSet = true;
        }
        
        // Get references to containers in the popup
        this.svgContainer = this.svgWindow.document.getElementById('svgContainer');
        this.statsContainer = this.svgWindow.document.getElementById('statsContent');
      }
      
      // Update the SVG content - only if we have valid references
      if (this.svgContainer && this.svgWindow && !this.svgWindow.closed) {
        try {
          this.svgContainer.innerHTML = this.lastSvgData;
          
          // Make SVG fill the container width using only style properties
          const svgElements = this.svgContainer.querySelectorAll('svg');
          for (const svg of svgElements) {
            svg.style.width = '100%';
            svg.style.maxWidth = '100%';
          }
        } catch (e) {
          // Error accessing container - window likely closed
          console.warn('[Vibe-Eyes] Error updating SVG display:', e.message);
          this.svgWindow = null;
          this.svgContainer = null;
          this.statsContainer = null;
          return;
        }
      }
      
      // Update stats if we have response data
      if (this.statsContainer && this.lastResponseData && this.svgWindow && !this.svgWindow.closed) {
        try {
          // Remove svg from displayed stats to avoid duplication and clutter
          const statsCopy = { ...this.lastResponseData };
          if (statsCopy.svg) {
            // Calculate and show SVG size in characters
            const charCount = statsCopy.svg.length;
            statsCopy.svg = `[SVG data shown above - ${charCount} characters]`;
          }
          
          this.statsContainer.textContent = JSON.stringify(statsCopy, null, 2);
        } catch (e) {
          // Error accessing stats container - window likely closed
          console.warn('[Vibe-Eyes] Error updating stats display:', e.message);
          this.svgWindow = null;
          this.svgContainer = null;
          this.statsContainer = null;
        }
      }
    } catch (e) {
      console.warn('[Vibe-Eyes] Error in SVG display:', e.message);
      // Reset all references to be safe
      this.svgWindow = null;
      this.svgContainer = null;
      this.statsContainer = null;
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
        // Check if response contains SVG data
        if (response) {
          this.lastResponseData = response;
          if (response.svg) {
            this.lastSvgData = response.svg;
            if (this.svgDisplayEnabled) {
              this.updateSvgDisplay();
            }
          }
        }
        
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