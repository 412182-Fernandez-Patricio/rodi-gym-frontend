/** Envoltorio paginado tal como lo expone la API (ver PageResponseDto en el backend). */
export interface PageResponseDto<T> {
  content: T[];
  page: number;
  size: number;
  total_elements: number;
  total_pages: number;
  last: boolean;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export function mapPageFromDto<S, T>(
  dto: PageResponseDto<S>,
  mapItem: (item: S) => T,
): PageResponse<T> {
  return {
    content: dto.content.map(mapItem),
    page: dto.page,
    size: dto.size,
    totalElements: dto.total_elements,
    totalPages: dto.total_pages,
    last: dto.last,
  };
}
