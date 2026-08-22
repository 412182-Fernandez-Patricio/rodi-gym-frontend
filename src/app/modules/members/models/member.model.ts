/**
 * Socio tal como lo expone la API, ya con las claves en camelCase: la
 * conversión la hace caseConversionInterceptor, no cada modelo.
 */
export interface Member {
  id: number;
  name: string;
  lastName: string;
  phoneNumber: string;
  status: boolean;
  expirationDate: string | null;
}

export type MemberStatus = 'active' | 'expired' | 'inactive';

/**
 * Deriva el estado que se muestra en el badge. Replica el criterio de
 * CheckinServiceImpl: sin membresía o con la fecha pasada cuenta como vencido.
 */
export function resolveMemberStatus(member: Member): MemberStatus {
  if (!member.status) {
    return 'inactive';
  }

  if (!member.expirationDate) {
    return 'expired';
  }

  return member.expirationDate >= currentIsoDate() ? 'active' : 'expired';
}

/**
 * Fecha local en formato ISO. Se compara como texto para evitar los corrimientos
 * de zona horaria que introduce parsear 'YYYY-MM-DD' con Date.
 */
function currentIsoDate(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Pasa una fecha ISO a dd/mm/aaaa sin construir un Date, por la zona horaria. */
export function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

/** Formatea un DNI con puntos: 28541987 -> 28.541.987 */
export function formatDni(dni: number): string {
  return dni.toLocaleString('es-AR');
}
