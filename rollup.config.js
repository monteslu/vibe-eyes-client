import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

const name = 'vibeEyes';

// For UMD builds, make sure initializeVibeEyes is exposed globally
const globals = {
  initializeVibeEyes: 'initializeVibeEyes'
};

export default [
  // UMD build for browsers (minified)
  {
    input: 'index.js',
    output: {
      name,
      file: 'dist/vibe-eyes.min.js',
      format: 'umd',
      sourcemap: true,
      exports: 'named',
      globals,
    },
    plugins: [
      resolve({ browser: true }), 
      commonjs(),
      terser()
    ]
  },
  // UMD build for browsers (unminified for debugging)
  {
    input: 'index.js',
    output: {
      name,
      file: 'dist/vibe-eyes.js',
      format: 'umd',
      sourcemap: true,
      exports: 'named',
      globals,
    },
    plugins: [
      resolve({ browser: true }),
      commonjs()
    ]
  },
  // IIFE build specifically for direct browser use with globals
  {
    input: 'index.js',
    output: {
      name,
      file: 'dist/vibe-eyes.iife.js',
      format: 'iife',
      sourcemap: true,
      extend: true,
    },
    plugins: [
      resolve({ browser: true }),
      commonjs(),
      terser()
    ]
  },
  // ESM build for modern environments
  {
    input: 'index.js',
    output: {
      file: 'dist/vibe-eyes.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [
      resolve({ browser: true }),
      commonjs()
    ]
  }
];