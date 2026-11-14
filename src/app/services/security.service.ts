import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private readonly authorizedDomains = ['deepak-devadiga.github.io', 'localhost', '127.0.0.1'];

  isAuthorizedDomain(): boolean {
    const hostname = window.location.hostname;
    return this.authorizedDomains.some(
      (domain) => hostname === domain || hostname.endsWith('.' + domain),
    );
  }
}
