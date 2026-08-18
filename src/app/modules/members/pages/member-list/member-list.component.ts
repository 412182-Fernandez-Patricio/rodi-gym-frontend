import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { MemberCardComponent } from '../../components/member-card/member-card.component';
import { Member } from '../../models/member.model';
import { MemberService } from '../../services/member.service';

@Component({
  selector: 'app-member-list',
  standalone: true,
  imports: [MemberCardComponent],
  template: `
    @if (loadFailed()) {
      <p class="message">No se pudieron cargar los socios.</p>
    } @else if (members().length) {
      <ul class="member-list">
        @for (member of members(); track member.id) {
          <li>
            <app-member-card [member]="member" />
          </li>
        }
      </ul>
    } @else {
      <p class="message">Todavía no hay socios para mostrar.</p>
    }
  `,
  styles: `
    .member-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .message {
      margin: 32px 0;
      text-align: center;
      font-size: 14px;
      color: var(--color-muted);
    }
  `,
})
export class MemberListComponent {
  private readonly memberService = inject(MemberService);

  readonly loadFailed = signal(false);

  readonly members = toSignal(
    this.memberService.getMembers().pipe(
      catchError(() => {
        this.loadFailed.set(true);
        return of<Member[]>([]);
      }),
    ),
    { initialValue: [] as Member[] },
  );
}
