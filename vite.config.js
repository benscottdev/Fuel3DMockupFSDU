import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GLB/GLTF are binary/text assets; without this Vite tries to parse them as JS.
  assetsInclude: ['**/*.glb', '**/*.gltf'],
})
