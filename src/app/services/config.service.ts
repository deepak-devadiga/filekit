import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { AppSettings, DEFAULT_APP_SETTINGS } from '../models/app-config.model';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private readonly http = inject(HttpClient);
  private readonly titleService = inject(Title);

  private readonly settingsSignal = signal<AppSettings>(DEFAULT_APP_SETTINGS);

  readonly settings = this.settingsSignal.asReadonly();
  readonly appName = computed(() => this.settingsSignal().appName);
  readonly appSubtitle = computed(() => this.settingsSignal().appSubtitle);
  readonly appLogo = computed(() => this.settingsSignal().appLogo);
  readonly themeConfig = computed(() => this.settingsSignal().theme);
  readonly features = computed(() => this.settingsSignal().features);
  readonly editorDefaults = computed(() => this.settingsSignal().editorDefaults);

  async loadConfig(): Promise<void> {
    try {
      const remoteConfig = await firstValueFrom(
        this.http.get<Partial<AppSettings>>('assets/app-config.json'),
      );

      const merged: AppSettings = {
        ...DEFAULT_APP_SETTINGS,
        ...remoteConfig,
        appLogo: {
          ...DEFAULT_APP_SETTINGS.appLogo,
          ...(remoteConfig.appLogo ?? {}),
        },
        theme: {
          ...DEFAULT_APP_SETTINGS.theme,
          ...(remoteConfig.theme ?? {}),
        },
        features: {
          ...DEFAULT_APP_SETTINGS.features,
          ...(remoteConfig.features ?? {}),
        },
        editorDefaults: {
          ...DEFAULT_APP_SETTINGS.editorDefaults,
          ...(remoteConfig.editorDefaults ?? {}),
        },
      };

      this.settingsSignal.set(merged);
      this.titleService.setTitle(`${merged.appName} — ${merged.appSubtitle}`);
    } catch (err) {
      console.warn('Could not load assets/app-config.json. Using default settings.', err);
      this.titleService.setTitle(DEFAULT_APP_SETTINGS.appName);
    }
  }
}
