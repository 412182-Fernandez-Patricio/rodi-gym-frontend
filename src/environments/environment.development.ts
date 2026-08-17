export const environment = {
  production: false,
  // Ruta relativa: la resuelve el proxy del dev server (ver proxy.config.json),
  // que reescribe /api y reenvía a http://localhost:8080.
  apiUrl: '/api',
};
