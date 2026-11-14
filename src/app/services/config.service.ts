import { Injectable, signal } from '@angular/core';

export interface AppFeaturesConfig {
  enableFormatter: boolean;
  enableErrorChecker: boolean;
  enableMinify?: boolean;
  enableFileUpload?: boolean;
  enableFileDownload?: boolean;
  enableBuyMeACoffee?: boolean;
}

export interface EditorDefaultsConfig {
  tabWidth: number;
  printWidth: number;
  useTabs: boolean;
  singleQuote: boolean;
  semi: boolean;
}

export interface AppConfig {
  appName: string;
  appSubtitle: string;
  appLogo: {
    type: string;
    value: string;
    imageUrl: string;
  };
  features: AppFeaturesConfig;
  themeConfig?: {
    enableThemePresets: boolean;
    enableDarkLightToggle: boolean;
  };
  theme?: {
    enableThemePresets: boolean;
    enableDarkLightToggle: boolean;
    defaultPreset?: string;
  };
  editorDefaults?: EditorDefaultsConfig;
}

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private readonly defaultEditorDefaults: EditorDefaultsConfig = {
    tabWidth: 2,
    printWidth: 80,
    useTabs: false,
    singleQuote: true,
    semi: true,
  };

  private readonly defaultConfig: AppConfig = {
    appName: 'FileKit',
    appSubtitle: 'Code Studio',
    appLogo: {
      type: 'text',
      value: '{ }',
      imageUrl: 'assets/logo.svg',
    },
    features: {
      enableFormatter: true,
      enableErrorChecker: true,
      enableMinify: true,
      enableFileUpload: true,
      enableFileDownload: true,
      enableBuyMeACoffee: true,
    },
    themeConfig: {
      enableThemePresets: true,
      enableDarkLightToggle: true,
    },
    editorDefaults: this.defaultEditorDefaults,
  };

  readonly config = signal<AppConfig>(this.defaultConfig);
  readonly appName = signal<string>(this.defaultConfig.appName);
  readonly appSubtitle = signal<string>(this.defaultConfig.appSubtitle);
  readonly appLogo = signal(this.defaultConfig.appLogo);
  readonly features = signal<AppFeaturesConfig>(this.defaultConfig.features);
  readonly themeConfig = signal(
    this.defaultConfig.themeConfig || {
      enableThemePresets: true,
      enableDarkLightToggle: true,
    },
  );
  readonly editorDefaults = signal<EditorDefaultsConfig>(this.defaultEditorDefaults);

  constructor() {
    this.loadConfig();
  }

  // Changed from private to public so appConfig initializer can call it
  public async loadConfig(): Promise<void> {
    try {
      const response = await fetch('app-config.json');
      if (response.ok) {
        const data: AppConfig = await response.json();
        this.config.set(data);
        if (data.appName) this.appName.set(data.appName);
        if (data.appSubtitle) this.appSubtitle.set(data.appSubtitle);
        if (data.appLogo) this.appLogo.set(data.appLogo);
        if (data.features) this.features.set(data.features);
        if (data.editorDefaults) this.editorDefaults.set(data.editorDefaults);
        if (data.themeConfig) {
          this.themeConfig.set(data.themeConfig);
        } else if (data.theme) {
          this.themeConfig.set({
            enableThemePresets: data.theme.enableThemePresets,
            enableDarkLightToggle: data.theme.enableDarkLightToggle,
          });
        }
      }
    } catch (error) {
      console.warn('Could not load external app-config.json, using defaults.', error);
    }
  }
}
