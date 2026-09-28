import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MemberService } from '../../services/member.service';
import { PageHeaderService } from '../../../../shared/services/page-header.service';

type FieldKey = 'dni' | 'name' | 'lastName' | 'phoneNumber';

interface Field {
  key: FieldKey;
  label: string;
  type: 'text' | 'tel';
  inputMode: 'numeric' | 'text' | 'tel';
  autocapitalize: 'words' | 'off';
  placeholder: string;
  requiredMessage: string;
}

const DNI_PATTERN = /^\d{7,8}$/;
const MIN_DNI = 1_000_000;

@Component({
  selector: 'app-member-create',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './member-create.component.html',
})
export class MemberCreateComponent {
  private readonly memberService = inject(MemberService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /*
   * El DNI va como texto y no como número: type="number" acepta "e", "-" y
   * decimales, y muestra flechitas. El inputmode igual abre el teclado numérico.
   */
  readonly fields: Field[] = [
    {
      key: 'dni',
      label: 'DNI',
      type: 'text',
      inputMode: 'numeric',
      autocapitalize: 'off',
      placeholder: '40123456',
      requiredMessage: 'Ingresá el DNI.',
    },
    {
      key: 'name',
      label: 'Nombre',
      type: 'text',
      inputMode: 'text',
      autocapitalize: 'words',
      placeholder: 'Laura',
      requiredMessage: 'Ingresá el nombre.',
    },
    {
      key: 'lastName',
      label: 'Apellido',
      type: 'text',
      inputMode: 'text',
      autocapitalize: 'words',
      placeholder: 'Quiroga',
      requiredMessage: 'Ingresá el apellido.',
    },
    {
      key: 'phoneNumber',
      label: 'Teléfono',
      type: 'tel',
      inputMode: 'tel',
      autocapitalize: 'off',
      placeholder: '3515550199',
      requiredMessage: 'Ingresá el teléfono.',
    },
  ];

  readonly form = inject(NonNullableFormBuilder).group({
    dni: ['', [notBlank, dniFormat]],
    name: ['', notBlank],
    lastName: ['', notBlank],
    // Sin formato: el argentino varía demasiado y el backend tampoco lo valida.
    phoneNumber: ['', notBlank],
  });

  readonly saving = signal(false);
  readonly saveFailed = signal(false);
  /** DNI que el backend rechazó por repetido, para linkear a ese socio. */
  readonly duplicateDni = signal<number | null>(null);

  constructor() {
    inject(PageHeaderService).set({ title: 'Nuevo socio', backLink: '/members' });
  }

  save(): void {
    if (this.saving()) {
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const { dni, name, lastName, phoneNumber } = this.form.getRawValue();
    const id = Number(normalizeDni(dni));

    this.saving.set(true);
    this.saveFailed.set(false);

    this.memberService
      .createMember({
        id,
        name: name.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // Reemplaza el formulario en el historial: volver desde el perfil lleva a
        // Socios, no a un alta vacía.
        next: (member) => this.router.navigate(['/members', member.id], { replaceUrl: true }),
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);

          // Por el código y no por el texto del mensaje, que puede cambiar.
          if (error.status === HttpStatusCode.Conflict) {
            this.duplicateDni.set(id);
            // Cualquier cambio del DNI vuelve a correr los validadores y lo borra.
            this.form.controls.dni.setErrors({ duplicate: true });
          } else {
            this.saveFailed.set(true);
          }
        },
      });
  }

  /** Solo se muestra después de salir del campo o de intentar guardar. */
  errorMessage(field: Field): string | null {
    const control = this.form.controls[field.key];
    if (!control.touched || !control.errors) {
      return null;
    }

    if (control.hasError('duplicate')) {
      return 'Ya existe un socio con ese DNI.';
    }
    if (control.hasError('required')) {
      return field.requiredMessage;
    }
    return 'El DNI tiene que tener 7 u 8 números.';
  }

  isDuplicate(field: Field): boolean {
    return field.key === 'dni' && this.form.controls.dni.hasError('duplicate');
  }

  inputClass(field: Field): string {
    const base =
      'w-full rounded-xl border bg-surface px-3.5 py-2.5 text-[15px] text-ink-strong outline-none ' +
      'placeholder:text-muted';

    return this.errorMessage(field)
      ? `${base} border-danger focus:border-danger`
      : `${base} border-line focus:border-accent`;
  }
}

/** Saca los puntos y espacios con que se suele escribir o pegar un DNI. */
export function normalizeDni(value: string): string {
  return value.replace(/[.\s]/g, '');
}

/** Como `Validators.required`, pero también rechaza un texto de solo espacios. */
function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() ? null : { required: true };
}

function dniFormat(control: AbstractControl<string>): ValidationErrors | null {
  const dni = normalizeDni(control.value);
  if (!dni) {
    return null; // Lo informa notBlank.
  }

  // El mínimo descarta un "0123456": siete dígitos, pero menos de un millón.
  return DNI_PATTERN.test(dni) && Number(dni) >= MIN_DNI ? null : { dni: true };
}
