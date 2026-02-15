// ============================================================================
// CORS Configuration (shared between HTTP server and WebSocket gateway)
// ============================================================================

const HOST = 'local.vrittiai.com';

export const CORS_ORIGINS = [
  'http://localhost:5173', // Host app (Vite default)
  'http://localhost:3001', // Auth MF
  'http://localhost:3012', // Host app main port
  'http://localhost:5174', // Other possible ports
  `http://${HOST}:3012`,
  `http://cloud.${HOST}:3012`,
  `https://${HOST}:3012`,
  `https://cloud.${HOST}:3012`,
];
