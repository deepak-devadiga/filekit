import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MenuCategory, SubMenuItem } from '../models/menu.model';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private readonly http = inject(HttpClient);

  readonly menuCategories = signal<MenuCategory[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly allSubMenus = computed<SubMenuItem[]>(() =>
    this.menuCategories().flatMap((category) => category.children),
  );

  async loadMenus(): Promise<void> {
    if (this.menuCategories().length > 0) {
      return;
    }
    try {
      this.loading.set(true);
      const data = await firstValueFrom(this.http.get<MenuCategory[]>('assets/menu.json'));
      this.menuCategories.set(data);
      this.error.set(null);
    } catch (err) {
      this.error.set('Failed to load menu configuration from assets/menu.json.');
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  getToolByType(typeParam: string): SubMenuItem | undefined {
    return this.getToolByRoute(`/formatter/${typeParam}`);
  }

  getCheckerToolByType(typeParam: string): SubMenuItem | undefined {
    return this.getToolByRoute(`/checker/${typeParam}`);
  }

  getToolByRoute(routePath: string): SubMenuItem | undefined {
    return this.allSubMenus().find((item) => item.route === routePath);
  }
}
