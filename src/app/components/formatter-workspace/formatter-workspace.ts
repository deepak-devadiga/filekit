import { Component, computed, effect, inject, signal } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MenuService } from '../../services/menu.service';
import { FormatterService } from '../../services/formatter.service';
import { ConfigService } from '../../services/config.service';
import { FormatOptions, SubMenuItem } from '../../models/menu.model';
import { BmcService } from '../../services/bmc.service';

@Component({
  selector: 'app-formatter-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './formatter-workspace.html',
  styleUrl: './formatter-workspace.scss',
})
export class FormatterWorkspace {
  private readonly route = inject(ActivatedRoute);
  private readonly menuService = inject(MenuService);
  private readonly formatterService = inject(FormatterService);
  protected readonly configService = inject(ConfigService);
  private readonly bmcService = inject(BmcService);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  readonly routeType = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('type') ?? 'js')),
    { initialValue: 'js' },
  );

  readonly activeTool = computed<SubMenuItem | undefined>(() =>
    this.menuService.getToolByType(this.routeType()),
  );

  readonly inputCode = signal<string>('');
  readonly outputCode = signal<string>('');
  readonly statusMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isProcessing = signal<boolean>(false);

  // Formatting options signals initialized from global app-config.json
  readonly tabWidth = signal<number>(this.configService.editorDefaults().tabWidth);
  readonly useTabs = signal<boolean>(this.configService.editorDefaults().useTabs);
  readonly singleQuote = signal<boolean>(this.configService.editorDefaults().singleQuote);
  readonly semi = signal<boolean>(this.configService.editorDefaults().semi);
  readonly printWidth = signal<number>(this.configService.editorDefaults().printWidth);

  constructor() {
    // Sync editor options if app-config.json finishes loading or updates
    effect(() => {
      const defaults = this.configService.editorDefaults();
      this.tabWidth.set(defaults.tabWidth);
      this.useTabs.set(defaults.useTabs);
      this.singleQuote.set(defaults.singleQuote);
      this.semi.set(defaults.semi);
      this.printWidth.set(defaults.printWidth);
    });

    // Load sample code automatically whenever the user switches tools in the menu
    effect(() => {
      const tool = this.activeTool();
      if (tool) {
        const actionWord =
          tool.mode === 'convert'
            ? 'Converter'
            : tool.mode === 'validate'
              ? 'Checker'
              : 'Formatter';
        const pageTitle = `FileKit — Online ${tool.title} ${actionWord}`;
        const pageDesc = tool.description;

        this.titleService.setTitle(pageTitle);
        this.metaService.updateTag({ name: 'description', content: pageDesc });
        this.metaService.updateTag({ property: 'og:title', content: pageTitle });
        this.metaService.updateTag({ property: 'og:description', content: pageDesc });
      }
    });
  }

  async runFormat(): Promise<void> {
    const tool = this.activeTool();
    if (!tool) return;

    this.isProcessing.set(true);
    this.errorMessage.set(null);
    this.statusMessage.set(null);

    const options: FormatOptions = {
      tabWidth: Number(this.tabWidth()),
      useTabs: this.useTabs(),
      singleQuote: this.singleQuote(),
      semi: this.semi(),
      printWidth: Number(this.printWidth()),
    };

    try {
      const result = await this.formatterService.processContent(this.inputCode(), tool, options);
      this.outputCode.set(result);
      this.statusMessage.set(
        tool.mode === 'convert' ? 'Conversion completed!' : 'Formatted successfully!',
      );

      this.bmcService.recordOperation();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Syntax error while formatting.';
      this.errorMessage.set(msg);
    } finally {
      this.isProcessing.set(false);
    }
  }

  runMinify(): void {
    const tool = this.activeTool();
    if (!tool || !this.configService.features().enableMinify) return;

    try {
      this.errorMessage.set(null);
      const minified = this.formatterService.minifyContent(this.inputCode(), tool.language);
      this.outputCode.set(minified);
      this.statusMessage.set('Minified successfully!');
      this.bmcService.recordOperation();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to minify content.';
      this.errorMessage.set(msg);
    }
  }

  onFileSelected(event: Event): void {
    if (!this.configService.features().enableFileUpload) return;

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.inputCode.set(String(reader.result ?? ''));
      this.statusMessage.set(`Loaded file: ${file.name}`);
      this.errorMessage.set(null);
    };
    reader.readAsText(file);
  }

  async copyOutput(): Promise<void> {
    if (!this.outputCode()) return;
    await navigator.clipboard.writeText(this.outputCode());
    this.statusMessage.set('Copied output to clipboard!');
  }

  downloadOutput(): void {
    if (!this.configService.features().enableFileDownload) return;

    const tool = this.activeTool();
    const content = this.outputCode();
    if (!tool || !content) return;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `formatted-${tool.id}${tool.extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  clearAll(): void {
    this.inputCode.set('');
    this.outputCode.set('');
    this.errorMessage.set(null);
    this.statusMessage.set(null);
  }
}
