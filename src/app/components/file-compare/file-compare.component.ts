import { Component, Input, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BmcService } from '../../services/bmc.service';

interface DiffRow {
  leftNum: number | string;
  leftText: string;
  leftType: 'normal' | 'deleted' | 'empty';
  rightNum: number | string;
  rightText: string;
  rightType: 'normal' | 'added' | 'empty';
}

@Component({
  selector: 'app-file-compare',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './file-compare.component.html',
  styleUrl: './file-compare.component.scss',
})
export class FileCompareComponent {
  @Input() type?: string;

  private readonly bmcService = inject(BmcService);

  leftContent = signal<string>('');
  rightContent = signal<string>('');

  fileNameLeft = signal<string>('Original File');
  fileNameRight = signal<string>('Modified File');

  diffRows = signal<DiffRow[]>([]);
  hasCompared = signal<boolean>(false);

  // Comparison Options
  ignoreCase = signal<boolean>(false);
  ignoreWhitespace = signal<boolean>(false);

  constructor() {
    effect(() => {
      const currentType = this.type;
      if (currentType) {
        // React to route parameter changes if needed
      }
    });
  }

  get titleText(): string {
    if (!this.type) return 'File Diff (.txt)';
    const ext = this.type.toLowerCase();
    return `${ext.toUpperCase()} Diff (.${ext})`;
  }

  get descriptionText(): string {
    return `Compare two ${this.type?.toUpperCase() || 'files'} side-by-side to inspect exact additions, deletions, and line-by-line differences.`;
  }

  leftCharCount(): number {
    return this.leftContent().length;
  }

  rightCharCount(): number {
    return this.rightContent().length;
  }

  onFileSelected(event: Event, side: 'left' | 'right'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const text = (e.target?.result as string) || '';
      if (side === 'left') {
        this.fileNameLeft.set(file.name);
        this.leftContent.set(text);
      } else {
        this.fileNameRight.set(file.name);
        this.rightContent.set(text);
      }
      this.compareFiles();
    };
    reader.readAsText(file);
  }

  compareFiles(): void {
    let leftText = this.leftContent();
    let rightText = this.rightContent();

    if (this.ignoreCase()) {
      leftText = leftText.toLowerCase();
      rightText = rightText.toLowerCase();
    }

    const leftLines = leftText.split(/\r?\n/);
    const rightLines = rightText.split(/\r?\n/);

    const originalLeftLines = this.leftContent().split(/\r?\n/);
    const originalRightLines = this.rightContent().split(/\r?\n/);

    const m = leftLines.length;
    const n = rightLines.length;

    const dp: number[][] = Array(m + 1)
      .fill(0)
      .map(() => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (leftLines[i - 1] === rightLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    let i = m,
      j = n;
    const rows: DiffRow[] = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
        rows.unshift({
          leftNum: i,
          leftText: originalLeftLines[i - 1],
          leftType: 'normal',
          rightNum: j,
          rightText: originalRightLines[j - 1],
          rightType: 'normal',
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        rows.unshift({
          leftNum: '',
          leftText: '',
          leftType: 'empty',
          rightNum: j,
          rightText: originalRightLines[j - 1],
          rightType: 'added',
        });
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        rows.unshift({
          leftNum: i,
          leftText: originalLeftLines[i - 1],
          leftType: 'deleted',
          rightNum: '',
          rightText: '',
          rightType: 'empty',
        });
        i--;
      }
    }

    this.diffRows.set(rows);
    this.hasCompared.set(true);

    this.bmcService.recordOperation();
  }

  clearAll(): void {
    this.leftContent.set('');
    this.rightContent.set('');
    this.diffRows.set([]);
    this.hasCompared.set(false);
    this.fileNameLeft.set('Original File');
    this.fileNameRight.set('Modified File');
  }
}
