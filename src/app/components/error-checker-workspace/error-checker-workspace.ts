import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MenuService } from '../../services/menu.service';
import { ValidatorService } from '../../services/validator.service';
import { SubMenuItem, ValidationIssue } from '../../models/menu.model';
import { BmcService } from '../../services/bmc.service';

@Component({
  selector: 'app-error-checker-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './error-checker-workspace.html',
  styleUrl: './error-checker-workspace.scss',
})
export class ErrorCheckerWorkspace {
  private readonly route = inject(ActivatedRoute);
  private readonly menuService = inject(MenuService);
  private readonly validatorService = inject(ValidatorService);
  private readonly bmcService = inject(BmcService);

  readonly routeType = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('type') ?? 'js')),
    { initialValue: 'js' },
  );

  readonly activeTool = computed<SubMenuItem | undefined>(() =>
    this.menuService.getCheckerToolByType(this.routeType()),
  );

  readonly code = signal<string>('');
  readonly issues = signal<ValidationIssue[]>([]);
  readonly selectedLine = signal<number | null>(null);
  readonly isChecking = signal<boolean>(false);
  readonly statusBanner = signal<string | null>(null);

  readonly codeLines = computed<string[]>(() => this.code().split('\n'));

  readonly errorCount = computed(() => this.issues().filter((i) => i.severity === 'error').length);
  readonly warningCount = computed(
    () => this.issues().filter((i) => i.severity === 'warning').length,
  );
  readonly fixableIssuesCount = computed(
    () =>
      this.issues().filter((i) => i.fixedLineContent !== undefined || i.fixedFullCode !== undefined)
        .length,
  );

  constructor() {
    effect(() => {
      const tool = this.activeTool();
      if (tool) {
        const sample = this.validatorService.getBrokenSampleCode(tool.language);
        this.code.set(sample);
        this.selectedLine.set(null);
        this.statusBanner.set(null);
        void this.runCheck();
      }
    });
  }

  async runCheck(): Promise<void> {
    const tool = this.activeTool();
    if (!tool) return;

    this.isChecking.set(true);
    try {
      const results = await this.validatorService.validateCode(this.code(), tool.language);
      this.issues.set(results);
      this.bmcService.recordOperation();
    } finally {
      this.isChecking.set(false);
    }
  }

  getLineSeverity(lineNum: number): 'error' | 'warning' | 'info' | null {
    const lineIssues = this.issues().filter((i) => i.line === lineNum);
    if (lineIssues.some((i) => i.severity === 'error')) return 'error';
    if (lineIssues.some((i) => i.severity === 'warning')) return 'warning';
    if (lineIssues.some((i) => i.severity === 'info')) return 'info';
    return null;
  }

  selectIssue(issue: ValidationIssue): void {
    this.selectedLine.set(issue.line);
  }

  async applyFix(issue: ValidationIssue): Promise<void> {
    if (issue.fixedFullCode !== undefined) {
      this.code.set(issue.fixedFullCode);
    } else if (issue.fixedLineContent !== undefined) {
      const lines = [...this.codeLines()];
      lines[issue.line - 1] = issue.fixedLineContent;
      this.code.set(lines.join('\n'));
    }

    this.statusBanner.set(`Applied fix on Line ${issue.line} (${issue.rule}).`);
    await this.runCheck();
  }

  async applyAllFixes(): Promise<void> {
    let updatedCode = this.code();
    const lines = updatedCode.split('\n');

    for (const issue of this.issues()) {
      if (issue.fixedFullCode !== undefined) {
        updatedCode = issue.fixedFullCode;
      } else if (issue.fixedLineContent !== undefined) {
        lines[issue.line - 1] = issue.fixedLineContent;
        updatedCode = lines.join('\n');
      }
    }

    this.code.set(updatedCode);
    this.statusBanner.set('Applied all available quick fixes!');
    await this.runCheck();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.code.set(String(reader.result ?? ''));
      this.statusBanner.set(`Loaded ${file.name} for inspection.`);
      void this.runCheck();
    };
    reader.readAsText(file);
  }
}
