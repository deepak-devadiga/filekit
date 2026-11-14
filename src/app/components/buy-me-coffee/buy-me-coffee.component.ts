import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BmcService } from '../../services/bmc.service';
import { ConfigService } from '../../services/config.service';

@Component({
  selector: 'app-buy-me-coffee',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './buy-me-coffee.component.html',
  styleUrl: './buy-me-coffee.component.scss',
})
export class BuyMeCoffeeComponent {
  protected readonly bmcService = inject(BmcService);
  protected readonly configService = inject(ConfigService);

  onClick(): void {
    this.bmcService.openModal();
  }

  openExternalLink(): void {
    const url = this.bmcService.getBmcUrl();
    window.open(url, '_blank', 'noopener,noreferrer');
    this.bmcService.closeModal();
  }
}
