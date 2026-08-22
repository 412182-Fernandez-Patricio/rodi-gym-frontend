/**
 * Forma en la que la API expone un socio (snake_case, ver MemberResponseDto).
 * `expiration_dat  e` todavía no lo devuelve el backend: se agrega al DTO junto
 * con la membresía, que ya viaja EAGER desde MemberEntity.
 */
export interface MemberDto {
  id: number;
  name: string;
  last_name: string;
  phone_number: string;
  status: boolean;
  expiration_date: string | null;
}

/** Socio ya normalizado para uso interno del frontend. */
export interface Member {
  id: number;
  name: string;
  lastName: string;
  phoneNumber: string;
  active: boolean;
  expirationDate: string | null;
}

export type MemberStatus = 'active' | 'expired' | 'inactive';

export function mapMemberFromDto(dto: MemberDto): Member {
  return {
    id: dto.id,
    name: dto.name,
    lastName: dto.last_name,
    phoneNumber: dto.phone_number,
    active: dto.status,
    expirationDate: dto.expiration_date ?? null,
  };
}

/**
 * Deriva el estado que se muestra en el badge. Replica el criterio de
 * CheckinServiceImpl: sin membresía o con la fecha pasada cuenta como vencido.
 */
export function resolveMemberStatus(member: Member): MemberStatus {
  if (!member.active) {
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
