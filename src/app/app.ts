import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { MenuService } from './services/menu.service';
import { ThemeService } from './services/theme.service';
import { ConfigService } from './services/config.service';
import { SecurityService } from './services/security.service';
import { LogoComponent } from './components/logo/logo.component';
import { FooterComponent } from './components/footer/footer.component';
import { BuyMeCoffeeComponent } from './components/buy-me-coffee/buy-me-coffee.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    UpperCasePipe,
    LogoComponent,
    FooterComponent,
    BuyMeCoffeeComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly configService = inject(ConfigService);
  protected readonly menuService = inject(MenuService);
  protected readonly themeService = inject(ThemeService);
  private readonly securityService = inject(SecurityService);
  private readonly router = inject(Router);

  protected isDomainValid = signal<boolean>(true);
  protected isMobileMenuOpen = signal<boolean>(false);

  ngOnInit(): void {
    this.isDomainValid.set(this.securityService.isAuthorizedDomain());
  }

  protected readonly expandedCategories = signal<Record<string, boolean>>({
    Formatter: true,
    'Error Checker': true,
    'File Compare': true,
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

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }
}
