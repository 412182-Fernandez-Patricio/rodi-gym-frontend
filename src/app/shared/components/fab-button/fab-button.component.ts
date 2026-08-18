import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-fab-button',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fab-button.component.html',
  styleUrl: './fab-button.component.css',
})
export class FabButtonComponent {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  /** Cuando se informa, el botón navega; si no, emite `action`. */
  readonly link = input<string | null>(null);

  readonly action = output<void>();
}
