import { Component, computed, inject, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MenuService } from './services/menu.service';
import { ThemeService } from './services/theme.service';
import { ConfigService } from './services/config.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, UpperCasePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly configService = inject(ConfigService);
  protected readonly menuService = inject(MenuService);
  protected readonly themeService = inject(ThemeService);

  protected readonly expandedCategories = signal<Record<string, boolean>>({
    Formatter: true,
    'Error Checker': true,
  });

  protected readonly visibleMenuCategories = computed(() => {
    const features = this.configService.features();
    return this.menuService.menuCategories().filter((category) => {
      if (category.title === 'Formatter' && !features.enableFormatter) {
        return false;
      }
      if (category.title === 'Error Checker' && !features.enableErrorChecker) {
        return false;
      }
      return true;
    });
  });

  toggleCategory(categoryTitle: string): void {
    this.expandedCategories.update((current) => ({
      ...current,
      [categoryTitle]: !current[categoryTitle],
    }));
  }

  isExpanded(categoryTitle: string): boolean {
    return !!this.expandedCategories()[categoryTitle];
  }
}
