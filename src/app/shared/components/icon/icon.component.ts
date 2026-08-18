import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Reemplazo de mat-icon. Usa la fuente de ligaduras "Material Icons", cuya
 * clase .material-icons ya viene definida por la hoja de Google Fonts que
 * carga index.html. Concentrar los íconos acá deja cambiar a SVG inline más
 * adelante tocando un solo archivo.
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'material-icons', 'aria-hidden': 'true' },
  templateUrl: './icon.component.html',
})
export class IconComponent {
  readonly name = input.required<string>();
}
