import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  PAYMENT_METHOD_LABELS,
  Payment,
  formatAmount,
  formatPaymentDate,
} from '../../models/payment.model';

interface PaymentRow {
  id: number;
  date: string;
  method: string;
  amount: string;
}

/**
 * Lista presentacional de pagos. No sabe de dónde vienen: el detalle del socio
 * le pasa los últimos, y la sección de pagos podrá pasarle la página completa.
 */
@Component({
  selector: 'app-payment-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './payment-list.component.html',
})
export class PaymentListComponent {
  readonly payments = input.required<Payment[]>();
  readonly emptyMessage = input('Todavía no hay pagos registrados.');

  readonly rows = computed<PaymentRow[]>(() =>
    this.payments().map((payment) => ({
      id: payment.id,
      date: formatPaymentDate(payment.paymentDate),
      method: PAYMENT_METHOD_LABELS[payment.paymentMethod],
      amount: formatAmount(payment.amount),
    })),
  );
}
