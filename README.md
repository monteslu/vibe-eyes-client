# Vibe Eyes Client

A lightweight client library to integrate browser games with the [Vibe Eyes MCP debug server](https://github.com/monteslu/vibe-eyes) for real-time debugging, visualization, and analysis.

This allows AI to SEE the game it's working on in real time!

![Happy Face](happy.jpg)

## Features

- Automatic canvas screenshot capture and streaming
- Console log and error collection with timestamps
- Global error and unhandled promise rejection handling
- SVG visualization display in a dedicated debug window
- Complete debug stats with SVG size measurements
- Minimal performance impact on games
- Robust error handling with graceful connection recovery
- Multiple build formats (UMD, ESM, IIFE)

## What's New in 1.1.0

- **Disconnected SVG Display**: Debug window now works even when not connected to server
- **Connection Status Visualization**: Show real-time connection status with visual feedback
- **Smart Window Positioning**: Position debug window relative to game window (right, left, top, bottom)
- **Responsive Defaults**: Debug window size defaults to 75% of game window dimensions
- **Improved Error Handling**: Better handling of window closures and reconnection scenarios

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
// The client will automatically start capturing once connected
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

// Explicitly stop/restart capturing if needed
client.stopCaptureLoop();
client.startCaptureLoop();
```

### Displaying SVG Visualizations

Vibe Eyes MCP server sends back SVG visualizations that you can display in a dedicated debug window:

```js
// Get the client from initialization
const client = initializeVibeEyes();

// Enable SVG display - opens a new debug window with SVG and stats
client.enableSvgDisplay();

// You can optionally provide a custom container
client.enableSvgDisplay({
  container: '#my-custom-container' // Optional existing container element
});

// Configure the debug window position and size (all options are optional)
const client = initializeVibeEyes({
  serverUrl: 'http://localhost:8869',
  debugWindow: {
    // All debugWindow properties are optional with sensible defaults
    width: 500,                // Optional: Width in pixels (default: 75% of game window width)
    height: 600,               // Optional: Height in pixels (default: 75% of game window height)
    position: 'right'          // Optional: Position relative to game window (default: 'right')
    // Possible positions: 'right', 'left', 'top', 'bottom', 'detached'
  }
});

// Toggle the display on/off
client.toggleSvgDisplay();

// Disable the display (closes the debug window)
client.disableSvgDisplay();
```

The debug window shows:
- The SVG visualization at the top
- Complete response statistics at the bottom, including SVG size
- Updates in real-time as new data arrives from the server

## Configuration Options

All configuration options are optional and have sensible defaults.

### Client Initialization Options

| Option | Default | Description |
|--------|---------|-------------|
| serverUrl | 'http://localhost:8869' | URL of the Vibe Eyes MCP server |
| captureDelay | 1000 | Milliseconds between captures |
| maxLogs | 10 | Maximum stored console logs |
| maxErrors | 10 | Maximum stored error logs |
| autoConnect | true | Connect on initialization |
| canvasId | null | ID of specific canvas to capture (null = auto-detect) |
| debugWindow | Object | Configuration for the debug window (see below) |

### SVG Display Options

| Option | Default | Description |
|--------|---------|-------------|
| container | null | Element or selector for SVG container (creates popup window if null) |

### Debug Window Options

| Option | Default | Description |
|--------|---------|-------------|
| width | null | Width of the debug window in pixels (null = 75% of game window width) |
| height | null | Height of the debug window in pixels (null = 75% of game window height) |
| position | 'right' | Position relative to the game window: 'right', 'left', 'top', 'bottom', or 'detached' |

## Build Formats

The following build formats are available in the `dist/` directory:

- `vibe-eyes.min.js` - Minified UMD build for most use cases
- `vibe-eyes.js` - Unminified UMD build for debugging
- `vibe-eyes.iife.js` - IIFE build with globals for direct browser use
- `vibe-eyes.esm.js` - ES Module for modern bundlers and environments

## Related Projects

- [Vibe Eyes MCP Server](https://github.com/monteslu/vibe-eyes) - The companion server that processes debug data and generates visualizations

## License

ISC