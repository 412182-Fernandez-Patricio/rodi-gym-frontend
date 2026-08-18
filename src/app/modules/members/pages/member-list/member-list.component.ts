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
  templateUrl: './member-list.component.html',
  styleUrl: './member-list.component.css',
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
