import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Así responde el backend cualquier valor de configuración. */
interface ConfigValue {
  key: string;
  value: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/config`;

  /**
   * La cuota que va a cobrar el próximo pago. El backend la manda como texto
   * ("7000.0"), igual que en el PUT; se convierte acá y no hace falta un modelo.
   */
  getMonthlyPrice(): Observable<number> {
    return this.http
      .get<ConfigValue>(`${this.baseUrl}/monthly-price`)
      .pipe(map((config) => Number(config.value)));
  }
}
