import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-fab-button',
  standalone: true,
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fab-button.component.html',
})
export class FabButtonComponent {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  /** Cuando se informa, el botón navega; si no, emite `action`. */
  readonly link = input<string | null>(null);

  readonly action = output<void>();
}
