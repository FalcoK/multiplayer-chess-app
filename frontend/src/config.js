const BACKEND_PORT = 3001;

// If you deploy the backend to Render, Railway, Fly.io, etc., paste the public URL here:
// Example: const PROD_BACKEND_URL = 'https://my-chess-backend.onrender.com';
const PROD_BACKEND_URL = '';

export const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `http://localhost:${BACKEND_PORT}`
  : (PROD_BACKEND_URL || `http://${window.location.hostname}:${BACKEND_PORT}`);

export const API_BASE = `${BACKEND_URL}/api`;
