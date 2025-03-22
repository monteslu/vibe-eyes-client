# Vibe Eyes Client - Development Guidelines

## Commands
- **Install**: `npm install`
- **Build**: `npm run build` - creates UMD and ESM bundles in dist/
- **Dev**: `npm run dev` - builds with watch mode for development
- **Testing**: Integrate in a game project with `<script src="dist/vibe-eyes.min.js"></script>`
- **Integration**: Use `const client = initializeVibeEyes()` to get client instance

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
- Displays SVG visualizations from the server in configurable overlay
- Uses Socket.io to stream debug data to the server
- Non-invasive design with minimal performance impact on games