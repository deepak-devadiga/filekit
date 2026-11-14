import { ThemePresetId } from '../services/theme.service';

export interface AppLogoConfig {
  type: 'text' | 'image';
  value: string;
  imageUrl?: string;
}

export interface AppThemeConfig {
  enableDarkLightToggle: boolean;
  enableThemePresets: boolean;
  defaultPreset: ThemePresetId;
}

export interface AppFeaturesConfig {
  enableFormatter: boolean;
  enableErrorChecker: boolean;
  enableMinify: boolean;
  enableFileUpload: boolean;
  enableFileDownload: boolean;
}

export interface AppEditorDefaultsConfig {
  tabWidth: number;
  printWidth: number;
  useTabs: boolean;
  singleQuote: boolean;
  semi: boolean;
}

export interface AppSettings {
  appName: string;
  appSubtitle: string;
  appLogo: AppLogoConfig;
  theme: AppThemeConfig;
  features: AppFeaturesConfig;
  editorDefaults: AppEditorDefaultsConfig;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  appName: 'FileKit',
  appSubtitle: 'Code Studio',
  appLogo: {
    type: 'text',
    value: '{ }',
    imageUrl: 'assets/logo.svg',
  },
  theme: {
    enableDarkLightToggle: true,
    enableThemePresets: true,
    defaultPreset: 'dark',
  },
  features: {
    enableFormatter: true,
    enableErrorChecker: true,
    enableMinify: true,
    enableFileUpload: true,
    enableFileDownload: true,
  },
  editorDefaults: {
    tabWidth: 2,
    printWidth: 80,
    useTabs: false,
    singleQuote: true,
    semi: true,
  },
};
