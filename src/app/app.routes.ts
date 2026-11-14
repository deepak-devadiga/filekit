import { Routes } from '@angular/router';
import { FormatterWorkspace } from './components/formatter-workspace/formatter-workspace';
import { ErrorCheckerWorkspace } from './components/error-checker-workspace/error-checker-workspace';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'formatter/js',
    pathMatch: 'full',
  },
  {
    path: 'formatter/:type',
    component: FormatterWorkspace,
  },
  {
    path: 'checker/:type',
    component: ErrorCheckerWorkspace,
  },
  {
    path: '**',
    redirectTo: 'formatter/js',
  },
];
