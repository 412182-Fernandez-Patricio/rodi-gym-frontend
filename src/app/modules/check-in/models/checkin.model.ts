export type CheckinReason = 'ACCESS_GRANTED' | 'MEMBER_INACTIVE' | 'MEMBERSHIP_EXPIRED';

/**
 * Intento de ingreso tal como lo expone la API (ver CheckinResponseDto), ya en
 * camelCase por caseConversionInterceptor.
 */
export interface Checkin {
  id: number;
  memberId: number;
  /** Fecha y hora en ISO, sin offset: '2026-08-19T18:25:00'. */
  checkinTime: string;
  success: boolean;
  reason: CheckinReason;
  /** Mensaje del backend, en inglés. Queda para diagnóstico. */
  message: string;
}

const REASON_LABELS: Record<CheckinReason, string> = {
  ACCESS_GRANTED: 'Acceso permitido',
  MEMBER_INACTIVE: 'Socio dado de baja',
  MEMBERSHIP_EXPIRED: 'Cuota vencida',
};

/**
 * Motivo en español. Si el backend suma un motivo nuevo, cae en un texto
 * genérico en lugar de dejar el lugar vacío.
 */
export function reasonLabelOf(reason: CheckinReason): string {
  return REASON_LABELS[reason] ?? 'Motivo desconocido';
}

/** Hora del ingreso: '2026-08-19T18:25:00' -> '18:25'. */
export function formatCheckinTime(checkinTime: string): string {
  return checkinTime.slice(11, 16);
}

/** Últimos cuatro dígitos del DNI, para no mostrarlo entero en pantalla. */
export function maskDni(dni: number): string {
  return `...${`${dni}`.slice(-4)}`;
}

/**
 * Rango de la jornada de hoy, en el formato que espera el backend.
 *
 * El límite superior es la medianoche siguiente y el filtro lo excluye, así que
 * cubre el día entero sin arrastrar nada del siguiente.
 */
export function todayRange(): { from: string; to: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { from: toLocalIso(start), to: toLocalIso(end) };
}

/** Fecha local como 'aaaa-mm-ddTHH:mm:ss', sin convertir a UTC. */
function toLocalIso(date: Date): string {
  const pad = (value: number) => `${value}`.padStart(2, '0');

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}
