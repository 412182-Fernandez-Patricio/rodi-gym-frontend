import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Subject,
  forkJoin,
  catchError,
  distinctUntilChanged,
  fromEvent,
  map,
  merge,
  of,
  startWith,
  switchMap,
  timer,
} from 'rxjs';
import { CheckinListComponent } from '../../components/checkin-list/checkin-list.component';
import { Checkin, todayRange } from '../../models/checkin.model';
import { CheckinService } from '../../services/checkin.service';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { Member } from '../../../members/models/member.model';
import { MemberService } from '../../../members/services/member.service';

/** Cada cuánto se vuelve a pedir, mientras la pantalla esté a la vista. */
const POLL_INTERVAL_MS = 30_000;

/** Tope de filas del registro. El contador sale del total, no de esta lista. */
const ROWS_SHOWN = 50;

/**
 * Cuántos socios se traen para resolver los nombres del registro. El endpoint
 * pagina, así que hay que pedir de más: un check-in solo trae el id del socio.
 * Si el padrón crece por encima de esto, lo correcto es que el backend mande el
 * nombre en el propio check-in.
 */
const MEMBER_LOOKUP_SIZE = 500;

@Component({
  selector: 'app-check-in',
  standalone: true,
  imports: [CheckinListComponent, IconComponent],
  templateUrl: './check-in.component.html',
})
export class CheckInComponent {
  private readonly checkinService = inject(CheckinService);
  private readonly memberService = inject(MemberService);

  private readonly manualRefresh = new Subject<void>();

  readonly checkins = signal<Checkin[]>([]);
  /** Ingresos efectivos del día: los rechazados no entraron, así que no suman. */
  readonly granted = signal(0);
  /** Intentos totales, para poder informar cuántos quedaron afuera. */
  readonly attempts = signal(0);
  readonly memberNames = signal(new Map<number, string>());
  readonly lastUpdated = signal<string | null>(null);
  readonly loadFailed = signal(false);
  readonly loading = signal(false);

  readonly refusedCount = computed(() => this.attempts() - this.granted());

  constructor() {
    this.loadMemberNames();

    /*
     * Se pide al entrar, cada vez que la pantalla vuelve a estar visible, y cada
     * POLL_INTERVAL_MS mientras siga a la vista. Al ocultarse el timer se corta:
     * esto vive en el celular del administrador y no tiene sentido consultar
     * mientras el teléfono está en el bolsillo.
     */
    const visible = fromEvent(document, 'visibilitychange').pipe(
      map(() => !document.hidden),
      startWith(!document.hidden),
      distinctUntilChanged(),
    );

    merge(
      visible.pipe(
        switchMap((isVisible) =>
          // of(0) pide de una, sin esperar un tick del timer: al entrar y cada vez
          // que la pantalla vuelve a estar a la vista.
          isVisible ? merge(of(0), timer(POLL_INTERVAL_MS, POLL_INTERVAL_MS)) : EMPTY,
        ),
      ),
      this.manualRefresh,
    )
      .pipe(
        switchMap(() => this.loadCheckins()),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  refresh(): void {
    this.manualRefresh.next();
  }

  private loadCheckins() {
    const { from, to } = todayRange();
    this.loading.set(true);

    /*
     * Dos consultas: el registro que se muestra, y el conteo de los que sí
     * entraron. El conteo va aparte porque el registro viene topeado, y contar
     * las filas en pantalla daría mal apenas el día supere ese tope.
     */
    return forkJoin({
      log: this.checkinService.searchCheckins({ from, to, size: ROWS_SHOWN }),
      granted: this.checkinService.searchCheckins({ from, to, success: true, size: 1 }),
    }).pipe(
      map(({ log, granted }) => {
        this.checkins.set(log.content);
        this.attempts.set(log.totalElements);
        this.granted.set(granted.totalElements);
        this.lastUpdated.set(currentTime());
        this.loadFailed.set(false);
        this.loading.set(false);
        return log;
      }),
      /*
       * Un error deja los datos anteriores en pantalla y solo enciende el aviso:
       * borrar la lista por un fallo puntual del polling sería peor que mostrarla
       * algo desactualizada.
       */
      catchError(() => {
        this.loadFailed.set(true);
        this.loading.set(false);
        return of(null);
      }),
    );
  }

  private loadMemberNames(): void {
    this.memberService
      .searchMembers({ size: MEMBER_LOOKUP_SIZE })
      .pipe(
        map((page) => page.content),
        catchError(() => of([] as Member[])),
        takeUntilDestroyed(),
      )
      .subscribe((members) => {
        this.memberNames.set(
          new Map(members.map((member) => [member.id, `${member.name} ${member.lastName}`])),
        );
      });
  }
}

function currentTime(): string {
  const now = new Date();
  return `${`${now.getHours()}`.padStart(2, '0')}:${`${now.getMinutes()}`.padStart(2, '0')}`;
}
