import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentListComponent } from './payment-list.component';
import { Payment } from '../../models/payment.model';

describe('PaymentListComponent', () => {
  let fixture: ComponentFixture<PaymentListComponent>;

  const payment = (overrides: Partial<Payment> = {}): Payment => ({
    id: 1,
    memberId: 30111222,
    memberName: 'Ana',
    memberLastName: 'Garcia',
    amount: 7000,
    paymentDate: '2026-08-01 10:05:00',
    paymentMethod: 'TRANSFER',
    ...overrides,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentListComponent);
  });

  it('should format the date, the method and the amount', () => {
    fixture.componentRef.setInput('payments', [payment()]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('01/08/2026');
    expect(text).toContain('Transferencia');
    expect(text).toContain('$7.000');
  });

  it('should not show the member by default', () => {
    fixture.componentRef.setInput('payments', [payment()]);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Ana Garcia');
  });

  it('should show the member first and the date with the method when asked', () => {
    fixture.componentRef.setInput('payments', [payment()]);
    fixture.componentRef.setInput('showMember', true);
    fixture.detectChanges();

    const lines = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('li span span'),
    ).map((line) => line.textContent?.trim());
    expect(lines).toEqual(['Ana Garcia', '01/08/2026 · Transferencia']);
  });

  it('should render one row per payment', () => {
    fixture.componentRef.setInput('payments', [
      payment({ id: 1 }),
      payment({ id: 2, paymentMethod: 'CASH' }),
    ]);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('li').length).toBe(2);
  });

  it('should show the empty message when there are no payments', () => {
    fixture.componentRef.setInput('payments', []);
    fixture.componentRef.setInput('emptyMessage', 'Sin pagos.');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Sin pagos.');
  });
});
