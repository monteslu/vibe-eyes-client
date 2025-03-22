# Vibe Eyes Client

A lightweight client library to integrate browser games with the Vibe Eyes MCP debug server for real-time debugging, visualization, and analysis.

## Features

- Canvas screenshot capture and streaming
- Console log and error collection with timestamps
- Global error and unhandled promise rejection handling
- SVG visualization display from server feedback
- Minimal performance impact on games
- Configurable capture rate and display settings
- Multiple build formats (UMD, ESM, IIFE)

## Installation

```bash
npm install vibe-eyes-client
```

Or include directly in your HTML:

```html
<script src="https://unpkg.com/vibe-eyes-client/dist/vibe-eyes.min.js"></script>
```

## Usage

### Basic Integration

```js
// Initialize with default settings (auto-connects to http://localhost:8869)
// Available globally when using the script tag
initializeVibeEyes();

// Or use the existing client instance directly
window.VibeEyesClient.initialize();
```

### Custom Configuration

```js
// Initialize with custom settings (when included via script tag)
initializeVibeEyes({
  serverUrl: 'http://your-debug-server:8869',
  captureDelay: 2000,   // Screenshot every 2 seconds
  autoCapture: true,    // Start capturing immediately
  maxLogs: 50,          // Store more logs
  canvasId: 'my-canvas' // Specific canvas to capture
});

// Or when using as a module
import { initializeVibeEyes } from 'vibe-eyes-client';

initializeVibeEyes({
  serverUrl: 'http://your-debug-server:8869',
  captureDelay: 2000,
  canvasId: 'game-canvas'
});
```

### Manual Control

```js
// Get the client instance
const client = window.VibeEyesClient;

// Start/stop capturing manually
client.startCaptureLoop();
client.stopCaptureLoop();
```

### Displaying SVG Visualizations

Vibe Eyes MCP server can send back SVG visualizations that you can display in your game:

```js
// Get the client from initialization
const client = initializeVibeEyes();

// Enable SVG display with default settings (top-right corner)
client.enableSvgDisplay();

// Or with custom options
client.enableSvgDisplay({
  position: 'bottom-left', // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
  width: 400,
  height: 200,
  zIndex: 1000,
  container: '#my-custom-container' // Optional existing container
});

// Toggle the display on/off
client.toggleSvgDisplay();

// Disable the display
client.disableSvgDisplay();

// Disable and remove the container
client.disableSvgDisplay(true);
```

## Configuration Options

### Client Initialization Options

| Option | Default | Description |
|--------|---------|-------------|
| serverUrl | 'http://localhost:8869' | URL of the Vibe Eyes MCP server |
| captureDelay | 1000 | Milliseconds between captures |
| maxLogs | 10 | Maximum stored console logs |
| maxErrors | 10 | Maximum stored error logs |
| autoConnect | true | Connect on initialization |
| autoCapture | false | Start capturing on connect |
| canvasId | null | ID of specific canvas to capture (null = auto-detect) |

### SVG Display Options

| Option | Default | Description |
|--------|---------|-------------|
| container | null | Element or selector for SVG container (creates one if null) |
| position | 'top-right' | Position on screen: 'top-left', 'top-right', 'bottom-left', 'bottom-right' |
| width | 300 | Width of the SVG container in pixels |
| height | 300 | Height of the SVG container in pixels |
| zIndex | 9999 | CSS z-index for the container |

## Build Formats

The following build formats are available in the `dist/` directory:

- `vibe-eyes.min.js` - Minified UMD build for most use cases
- `vibe-eyes.js` - Unminified UMD build for debugging
- `vibe-eyes.iife.js` - IIFE build with globals for direct browser use
- `vibe-eyes.esm.js` - ES Module for modern bundlers and environments

## License

ISC