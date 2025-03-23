# Vibe Eyes Client - Development Guidelines

A client library that integrates into browser games for debugging and visualization. This allows AI to SEE the game it's working on in real time!

![Happy Face](happy.jpg)

## Version 1.1.0
This is version 1.1.0 of the Vibe Eyes Client, which adds support for:
- Displaying the SVG debug window even when disconnected from the server
- Smart window positioning relative to the game window
- Responsive window sizing (75% of game window dimensions by default)
- Real-time connection status visualization
- Enhanced error handling and reconnection logic

## Commands
- **Install**: `npm install`
- **Build**: `npm run build` - creates UMD and ESM bundles in dist/
- **Dev**: `npm run dev` - builds with watch mode for development
- **Testing**: Integrate in a game project with `<script src="dist/vibe-eyes.min.js"></script>`
- **Integration**: Use `const client = initializeVibeEyes()` to get client instance

## Key Features
- **Auto-initialization**: Client automatically starts capturing when connected to a server
- **Robust SVG display**: Visualizations display in a separate window with debug info
- **Connection status**: Visual feedback on connection state even when server is unavailable
- **Smart window positioning**: Debug window positions itself relative to game window
- **Responsive sizing**: Window size adapts to parent window (75% by default)
- **Error resilience**: Graceful handling of disconnections and window closures
- **Non-blocking**: Asynchronous operations with proper error handling

## Code Style Guidelines
- **Formatting**: Use 2-space indentation
- **Imports**: ES Modules preferred, with fallback to CommonJS
- **Naming**: 
  - Classes: PascalCase (e.g., `VibeEyesClient`)
  - Methods/Functions: camelCase (e.g., `enableSvgDisplay`)
  - Constants: UPPER_SNAKE_CASE or camelCase depending on context
- **Method Chaining**: Return `this` from methods when appropriate
- **Error Handling**: Use try/catch blocks with appropriate console messages
- **Documentation**: Use JSDoc comment blocks with parameter descriptions
- **Browser Compatibility**: Test on modern browsers (Chrome, Firefox, Safari)

## Project Purpose
- Client library to integrate into browser games for debugging with the Vibe Eyes MCP server
- Captures canvas screenshots, console logs, and error information
- Displays SVG visualizations from the server in a separate debug window
- Shows connection status and debug information even when server is unreachable
- Intelligently positions and sizes the debug window for optimal workflow
- Uses Socket.io to stream debug data to the server
- Non-invasive design with minimal performance impact on games
- Provides real-time debug information through an easily accessible interface