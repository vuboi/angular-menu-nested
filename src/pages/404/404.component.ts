import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-page-404',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './404.component.html',
  styleUrl: './404.component.scss',
})
export class Page404Component {
  protected darkMode = signal<boolean>(false);

  protected handlerToggleThemes(): void {
    this.darkMode.update(value => !value);
  }
}
