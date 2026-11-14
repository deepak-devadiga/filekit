import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'formatter/js',
    pathMatch: 'full',
  },
  {
    path: 'formatter/:type',
    loadComponent: () =>
      import('./components/formatter-workspace/formatter-workspace').then(
        (m) => m.FormatterWorkspace,
      ),
  },
  {
    path: 'checker/:type',
    loadComponent: () =>
      import('./components/error-checker-workspace/error-checker-workspace').then(
        (m) => m.ErrorCheckerWorkspace,
      ),
  },
  {
    path: 'compare/:type',
    loadComponent: () =>
      import('./components/file-compare/file-compare.component').then(
        (m) => m.FileCompareComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'formatter/js',
  },
];
