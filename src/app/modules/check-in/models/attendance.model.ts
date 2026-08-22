/**
 * Un día con actividad, tal como lo devuelve
 * GET /members/{id}/attendance (ver AttendanceDayDto).
 */
export interface AttendanceDay {
  /** Fecha en formato aaaa-mm-dd. */
  date: string;
  /** Verdadero si al menos un ingreso de ese día fue permitido. */
  success: boolean;
  /** Intentos registrados ese día, exitosos o no. */
  checkins: number;
}

/** Mes actual como aaaa-mm, tomado de la fecha local. */
export function currentIsoMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/** Nombre del mes de un 'aaaa-mm', sin depender del locale del navegador. */
export function monthNameOf(month: string): string {
  return MONTH_NAMES[Number(month.split('-')[1]) - 1];
}

/** Etiqueta completa de un 'aaaa-mm': 'Agosto 2026'. */
export function monthLabelOf(month: string): string {
  return `${monthNameOf(month)} ${month.split('-')[0]}`;
}

/**
 * Corre un 'aaaa-mm' la cantidad de meses indicada, hacia adelante o atrás.
 *
 * Hace la cuenta sobre los números y no con Date: sumarle un mes a un Date
 * parado el 31 de enero devuelve el 3 de marzo.
 */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const index = year * 12 + (monthNumber - 1) + delta;
  const shiftedMonth = `${(index % 12) + 1}`.padStart(2, '0');

  return `${Math.floor(index / 12)}-${shiftedMonth}`;
}
