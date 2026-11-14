import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { ConfigService } from './services/config.service';
import { MenuService } from './services/menu.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideAppInitializer(() => {
      const configService = inject(ConfigService);
      const menuService = inject(MenuService);
      return Promise.all([configService.loadConfig(), menuService.loadMenus()]);
    }),
  ],
};
