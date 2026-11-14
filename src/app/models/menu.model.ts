export interface SubMenuItem {
  id: string;
  title: string;
  route: string;
  language:
    | 'javascript'
    | 'typescript'
    | 'html'
    | 'yaml'
    | 'java'
    | 'json'
    | 'scss'
    | 'xml'
    | 'yaml-to-json'
    | 'json-to-yaml';
  mode: 'format' | 'convert' | 'validate';
  extension: string;
  description: string;
}

export interface MenuCategory {
  title: string;
  icon: string;
  children: SubMenuItem[];
}

export interface FormatOptions {
  tabWidth: number;
  useTabs: boolean;
  singleQuote: boolean;
  semi: boolean;
  printWidth: number;
}

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  line: number;
  column: number;
  severity: IssueSeverity;
  message: string;
  rule: string;
  problematicCode?: string;
  suggestion?: string;
  fixedLineContent?: string;
  fixedFullCode?: string;
}
