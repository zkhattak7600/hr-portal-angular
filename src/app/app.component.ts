import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UiHostComponent } from './shared/ui-host.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, UiHostComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'HR Portal';
}
