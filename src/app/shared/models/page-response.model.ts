/**
 * Envoltorio paginado de la API (ver PageResponseDto en el backend), ya en
 * camelCase por caseConversionInterceptor.
 */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
