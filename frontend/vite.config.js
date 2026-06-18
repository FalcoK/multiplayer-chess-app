import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'serve-sibling-apps',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const urlPath = req.url.split('?')[0];
          const parts = urlPath.split('/').filter(Boolean);
          
          if (parts.length > 0) {
            const firstSegment = parts[0];
            
            // Skip system or dev-specific paths
            if (
              firstSegment === 'src' ||
              firstSegment === 'node_modules' ||
              firstSegment === '@vite' ||
              firstSegment === '@react-refresh' ||
              firstSegment === '@id' ||
              firstSegment === 'multiplayer-chess-app' ||
              firstSegment.startsWith('vite-')
            ) {
              return next();
            }

            // Path to sibling app in the scratch directory
            const siblingPath = path.resolve(__dirname, '..', '..', firstSegment);
            
            if (fs.existsSync(siblingPath) && fs.statSync(siblingPath).isDirectory()) {
              // Assemble target path relative to sibling directory
              let relativeFilePath = parts.slice(1).join('/');
              
              // If sibling has a 'dist' folder, serve from dist/
              let targetDir = siblingPath;
              const hasDist = fs.existsSync(path.join(siblingPath, 'dist'));
              if (hasDist) {
                targetDir = path.join(siblingPath, 'dist');
              }
              
              // If request is directory or empty path, default to index.html
              if (!relativeFilePath || relativeFilePath.endsWith('/')) {
                relativeFilePath = path.join(relativeFilePath, 'index.html');
              }
              
              const fullFilePath = path.resolve(targetDir, relativeFilePath);
              
              // Prevent directory traversal attacks
              if (!fullFilePath.startsWith(targetDir)) {
                res.writeHead(403, { 'Content-Type': 'text/plain' });
                res.end('403 Forbidden: Invalid Path');
                return;
              }
              
              if (fs.existsSync(fullFilePath) && !fs.statSync(fullFilePath).isDirectory()) {
                const ext = path.extname(fullFilePath).toLowerCase();
                const mimeTypes = {
                  '.html': 'text/html; charset=UTF-8',
                  '.js': 'text/javascript; charset=UTF-8',
                  '.ts': 'text/plain; charset=UTF-8',
                  '.tsx': 'text/plain; charset=UTF-8',
                  '.css': 'text/css; charset=UTF-8',
                  '.json': 'application/json; charset=UTF-8',
                  '.png': 'image/png',
                  '.jpg': 'image/jpeg',
                  '.jpeg': 'image/jpeg',
                  '.gif': 'image/gif',
                  '.svg': 'image/svg+xml',
                  '.ico': 'image/x-icon',
                  '.wav': 'audio/wav',
                  '.mp3': 'audio/mpeg',
                  '.mp4': 'video/mp4',
                  '.woff': 'application/font-woff',
                  '.woff2': 'application/font-woff2',
                  '.ttf': 'application/font-sfnt',
                  '.eot': 'application/vnd.ms-fontobject',
                  '.otf': 'application/font-sfnt',
                  '.wasm': 'application/wasm'
                };
                
                try {
                  const content = fs.readFileSync(fullFilePath);
                  res.writeHead(200, { 
                    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
                    'Cache-Control': 'no-store, no-cache, must-revalidate, private'
                  });
                  res.end(content);
                  return;
                } catch (err) {
                  res.writeHead(500, { 'Content-Type': 'text/plain' });
                  res.end('500 Internal Server Error');
                  return;
                }
              }
            }
          }
          next();
        });
      }
    }
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
