export type PaymentMethod = 'CASH' | 'TRANSFER' | 'DEBIT';

/** Forma en la que la API expone un pago (ver PaymentResponseDto). */
export interface PaymentDto {
  id: number;
  member_id: number;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
}

export interface Payment {
  id: number;
  memberId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  DEBIT: 'Débito',
};

export function mapPaymentFromDto(dto: PaymentDto): Payment {
  return {
    id: dto.id,
    memberId: dto.member_id,
    amount: dto.amount,
    paymentDate: dto.payment_date,
    paymentMethod: dto.payment_method,
  };
}

/**
 * Pasa "2026-08-01 10:05:00" a "01/08/2026".
 *
 * Este campo no viene en ISO: PaymentResponseDto le pone un @JsonFormat propio
 * con patrón "yyyy-MM-dd HH:mm:ss", sin la T. Se parte a mano, que además evita
 * el corrimiento de zona horaria de construir un Date.
 */
export function formatPaymentDate(value: string): string {
  const [date] = value.split(' ');
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

export function formatAmount(amount: number): string {
  return `$${amount.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
}
