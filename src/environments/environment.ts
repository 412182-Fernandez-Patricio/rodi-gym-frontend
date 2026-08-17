export const environment = {
  production: true,
  // Asume que en producción la API se sirve bajo el mismo dominio que el frontend
  // (por ejemplo detrás de un reverse proxy). Si la API queda en otro dominio,
  // cambiar por la URL absoluta y habilitar CORS en el backend.
  apiUrl: '/api',
};
