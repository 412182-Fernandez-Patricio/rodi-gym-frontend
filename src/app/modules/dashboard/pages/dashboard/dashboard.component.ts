import { Component } from '@angular/core';
import { FabButtonComponent } from '../../../../shared/components/fab-button/fab-button.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FabButtonComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {}
