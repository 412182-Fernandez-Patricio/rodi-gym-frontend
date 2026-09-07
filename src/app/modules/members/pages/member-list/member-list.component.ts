import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  Subject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { FabButtonComponent } from '../../../../shared/components/fab-button/fab-button.component';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { MemberCardComponent } from '../../components/member-card/member-card.component';
import { Member, MemberStatus } from '../../models/member.model';
import { MemberService } from '../../services/member.service';

interface StatusFilter {
  label: string;
  status: MemberStatus | null;
}

const PAGE_SIZE = 20;

/** Lo que se espera a que deje de tipear antes de consultar. */
const TYPING_PAUSE_MS = 300;

@Component({
  selector: 'app-member-list',
  standalone: true,
  imports: [MemberCardComponent, FabButtonComponent, IconComponent],
  templateUrl: './member-list.component.html',
})
export class MemberListComponent {
  private readonly memberService = inject(MemberService);

  readonly filters: StatusFilter[] = [
    { label: 'Todos', status: null },
    { label: 'Activos', status: 'active' },
    { label: 'Deudores', status: 'expired' },
    { label: 'Inactivos', status: 'inactive' },
  ];

  readonly searchTerm = signal('');
  readonly status = signal<MemberStatus | null>(null);

  readonly members = signal<Member[]>([]);
  readonly total = signal(0);
  readonly isLastPage = signal(true);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);

  private page = 0;
  private readonly nextPage = new Subject<void>();

  constructor() {
    const criteria = combineLatest([
      toObservable(this.searchTerm).pipe(
        debounceTime(TYPING_PAUSE_MS),
        distinctUntilChanged(),
      ),
      toObservable(this.status).pipe(distinctUntilChanged()),
    ]);

    /*
     * Un cambio de criterio vuelve a la primera página y reemplaza; "cargar más"
     * pide la siguiente y acumula. Todo pasa por un switchMap: al tipear rápido,
     * la respuesta vieja no puede llegar después de la nueva y pisarla.
     */
    criteria
      .pipe(
        tap(() => (this.page = 0)),
        switchMap(() => this.fetch(true)),
        takeUntilDestroyed(),
      )
      .subscribe();

    this.nextPage
      .pipe(
        tap(() => (this.page += 1)),
        switchMap(() => this.fetch(false)),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  onSearch(value: string): void {
    this.searchTerm.set(value);
  }

  selectStatus(status: MemberStatus | null): void {
    this.status.set(status);
  }

  loadMore(): void {
    this.nextPage.next();
  }

  chipClass(status: MemberStatus | null): string {
    const base =
      'shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ' +
      '[-webkit-tap-highlight-color:transparent]';

    return this.status() === status
      ? `${base} border-ink bg-ink text-on-dark`
      : `${base} border-line bg-surface text-muted`;
  }

  private fetch(replace: boolean) {
    this.loading.set(true);

    return this.memberService
      .searchMembers({
        search: this.searchTerm(),
        status: this.status() ?? undefined,
        page: this.page,
        size: PAGE_SIZE,
      })
      .pipe(
        tap((page) => {
          this.members.update((current) =>
            replace ? page.content : [...current, ...page.content],
          );
          this.total.set(page.totalElements);
          this.isLastPage.set(page.last);
          this.loadFailed.set(false);
          this.loading.set(false);
        }),
        catchError(() => {
          // Si falla al pedir más, se deshace el avance para que reintentar no
          // saltee una página.
          if (!replace) {
            this.page -= 1;
          }
          this.loadFailed.set(true);
          this.loading.set(false);
          return of(null);
        }),
        startWith(null),
      );
  }
}
