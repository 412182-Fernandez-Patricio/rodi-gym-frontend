import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  PAYMENT_METHOD_LABELS,
  Payment,
  formatAmount,
  formatPaymentDate,
} from '../../models/payment.model';

interface PaymentRow {
  id: number;
  title: string;
  detail: string;
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
  /**
   * Muestra quién pagó, para el listado general. En el perfil sobra: todos los
   * pagos son del mismo socio.
   */
  readonly showMember = input(false);

  readonly rows = computed<PaymentRow[]>(() =>
    this.payments().map((payment) => {
      const date = formatPaymentDate(payment.paymentDate);
      const method = PAYMENT_METHOD_LABELS[payment.paymentMethod];

      return {
        id: payment.id,
        title: this.showMember() ? `${payment.memberName} ${payment.memberLastName}` : date,
        detail: this.showMember() ? `${date} · ${method}` : method,
        amount: formatAmount(payment.amount),
      };
    }),
  );
}
