import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ConfigService } from './config.service';

export type ThemePresetId = 'light' | 'dark' | 'cyber-mint' | 'solar-flare' | 'canary-contrast';

export interface ThemePreset {
  id: ThemePresetId;
  name: string;
  isDark: boolean;
  primarySwatch: string;
  accentSwatch: string;
}

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly configService = inject(ConfigService);
  private readonly STORAGE_KEY = 'filekit-theme-preset';

  readonly presets: readonly ThemePreset[] = [
    {
      id: 'light',
      name: 'Plum Daylight',
      isDark: false,
      primarySwatch: '#58355E',
      accentSwatch: '#5998C5',
    },
    {
      id: 'dark',
      name: 'Midnight Plum',
      isDark: true,
      primarySwatch: '#5998C5',
      accentSwatch: '#FFF689',
    },
    {
      id: 'cyber-mint',
      name: 'Cyber Mint',
      isDark: true,
      primarySwatch: '#CFFFB0',
      accentSwatch: '#5998C5',
    },
    {
      id: 'solar-flare',
      name: 'Solar Vermilion',
      isDark: true,
      primarySwatch: '#E03616',
      accentSwatch: '#FFF689',
    },
    {
      id: 'canary-contrast',
      name: 'High-Contrast Canary',
      isDark: true,
      primarySwatch: '#FFF689',
      accentSwatch: '#CFFFB0',
    },
  ];

  readonly activePresetId = signal<ThemePresetId>('dark');
  private lastDarkPreset: ThemePresetId = 'dark';

  readonly activePreset = computed<ThemePreset>(
    () => this.presets.find((p) => p.id === this.activePresetId()) ?? this.presets[0],
  );

  readonly isDark = computed(() => this.activePreset().isDark);

  constructor() {
    // Sync initial preset from ConfigService & localStorage
    effect(() => {
      const themeCfg = this.configService.themeConfig() as {
        enableDarkLightToggle: boolean;
        enableThemePresets: boolean;
        defaultPreset?: ThemePresetId;
      };
      const saved = localStorage.getItem(this.STORAGE_KEY) as ThemePresetId | null;
      const defaultPreset: ThemePresetId = themeCfg.defaultPreset || 'dark';

      // If both switcher controls are disabled, enforce the config's defaultPreset
      if (!themeCfg.enableDarkLightToggle && !themeCfg.enableThemePresets) {
        this.activePresetId.set(defaultPreset);
        return;
      }

      // If presets are disabled, restrict to 'light' or 'dark'
      if (!themeCfg.enableThemePresets) {
        if (saved === 'light' || saved === 'dark') {
          this.activePresetId.set(saved);
        } else {
          this.activePresetId.set(defaultPreset === 'light' ? 'light' : 'dark');
        }
        return;
      }

      if (saved && this.presets.some((p) => p.id === saved)) {
        this.activePresetId.set(saved);
      } else {
        this.activePresetId.set(defaultPreset);
      }
    });

    // Apply data-theme attribute whenever activePresetId changes
    effect(() => {
      const currentId = this.activePresetId();
      const preset = this.activePreset();

      if (preset.isDark) {
        this.lastDarkPreset = currentId;
      }

      this.document.documentElement.setAttribute('data-theme', currentId);
      localStorage.setItem(this.STORAGE_KEY, currentId);
    });
  }

  setPreset(presetId: ThemePresetId): void {
    if (!this.configService.themeConfig().enableThemePresets) return;
    this.activePresetId.set(presetId);
  }

  toggleLightDark(): void {
    const themeCfg = this.configService.themeConfig();
    if (!themeCfg.enableDarkLightToggle) return;
    if (this.isDark()) {
      this.activePresetId.set('light');
    } else {
      const targetDark = themeCfg.enableThemePresets ? this.lastDarkPreset : 'dark';
      this.activePresetId.set(targetDark);
    }
  }
}
