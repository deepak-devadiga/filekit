import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BmcService {
  private readonly OP_COUNT_KEY = 'filekit_op_count';

  // Obfuscated Base64 link to protect against code tampering
  private readonly encodedUrl = 'aHR0cHM6Ly9idXltZWFjb2ZmZWUuY29tL2RlZXBha2RldmFkaWdh';

  operationCount = signal<number>(this.getInitialCount());
  isModalOpen = signal<boolean>(false);

  private getInitialCount(): number {
    const stored = localStorage.getItem(this.OP_COUNT_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  recordOperation(): void {
    const newCount = this.operationCount() + 1;
    this.operationCount.set(newCount);
    localStorage.setItem(this.OP_COUNT_KEY, newCount.toString());

    // If user has done more than 5 operations, always pop up the modal gently
    if (newCount > 5) {
      this.openModal();
    } else {
      // Show modal randomly after operations (approx. 35% chance)
      if (Math.random() < 0.35) {
        this.openModal();
      }
    }
  }

  openModal(): void {
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  getBmcUrl(): string {
    try {
      return atob(this.encodedUrl);
    } catch {
      return 'https://buymeacoffee.com/deepakdevadiga';
    }
  }
}
