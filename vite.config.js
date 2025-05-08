import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import { resolve } from 'path';

export default defineConfig({
  plugins: [glsl()],
  assetsInclude: ['**/*.hdr'],
  resolve: {
    alias: {
      'three': resolve(__dirname, 'node_modules/three'),
      'three/examples/jsm': resolve(__dirname, 'node_modules/three/examples/jsm')
    }
  },
  optimizeDeps: {
    include: [
      'three',
      'three/examples/jsm/postprocessing/EffectComposer',
      'three/examples/jsm/postprocessing/UnrealBloomPass',
      'three/examples/jsm/shaders/CopyShader'
    ],
    exclude: [ 
              'three/examples/jsm/libs/fflate.module.js',
        'three/examples/jsm/loaders/RGBELoader'
    ]
  }
});