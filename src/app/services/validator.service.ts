import { Injectable } from '@angular/core';
import * as prettier from 'prettier/standalone';
import * as parserBabel from 'prettier/plugins/babel';
import * as parserEstree from 'prettier/plugins/estree';
import * as parserTypescript from 'prettier/plugins/typescript';
import * as parserHtml from 'prettier/plugins/html';
import * as parserYaml from 'prettier/plugins/yaml';
import * as parserPostcss from 'prettier/plugins/postcss';
import prettierPluginJava from 'prettier-plugin-java';
import * as yaml from 'js-yaml';
import { SubMenuItem, ValidationIssue } from '../models/menu.model';

@Injectable({
  providedIn: 'root',
})
export class ValidatorService {
  async validateCode(
    content: string,
    language: SubMenuItem['language'],
  ): Promise<ValidationIssue[]> {
    if (!content.trim()) {
      return [];
    }

    const issues: ValidationIssue[] = [];
    const lines = content.split('\n');

    // 1. Run AST / Parser Syntax Check
    const syntaxIssue = await this.checkParserSyntax(content, language, lines);
    if (syntaxIssue) {
      issues.push(syntaxIssue);
    }

    // 2. Run Language-Specific Static Analysis & Fix Suggestions
    switch (language) {
      case 'javascript':
      case 'typescript':
        issues.push(...this.lintJsTs(lines, language));
        break;
      case 'json':
        issues.push(...this.lintJson(content, lines));
        break;
      case 'yaml':
        issues.push(...this.lintYaml(lines));
        break;
      case 'html':
        issues.push(...this.lintHtml(lines));
        break;
      case 'java':
        issues.push(...this.lintJava(lines));
        break;
      case 'scss':
        issues.push(...this.lintScss(lines));
        break;
      case 'xml':
        issues.push(...this.lintXml(content, lines));
        break;
    }

    // Deduplicate issues by line + message and sort by line number
    const unique = new Map<string, ValidationIssue>();
    for (const item of issues) {
      const key = `${item.line}:${item.rule}:${item.message}`;
      if (!unique.has(key)) {
        unique.set(key, item);
      }
    }

    return Array.from(unique.values()).sort((a, b) => a.line - b.line);
  }

  private async checkParserSyntax(
    content: string,
    language: SubMenuItem['language'],
    lines: string[],
  ): Promise<ValidationIssue | null> {
    try {
      switch (language) {
        case 'javascript':
          await prettier.format(content, {
            parser: 'babel',
            plugins: [parserBabel, parserEstree],
          });
          break;
        case 'typescript':
          await prettier.format(content, {
            parser: 'typescript',
            plugins: [parserTypescript, parserEstree],
          });
          break;
        case 'html':
          await prettier.format(content, {
            parser: 'html',
            plugins: [parserHtml],
          });
          break;
        case 'yaml':
          yaml.load(content);
          await prettier.format(content, {
            parser: 'yaml',
            plugins: [parserYaml],
          });
          break;
        case 'java':
          await prettier.format(content, {
            parser: 'java',
            plugins: [prettierPluginJava],
          });
          break;
        case 'json':
          await prettier.format(content, {
            parser: 'json',
            plugins: [parserBabel, parserEstree],
          });
          break;
        case 'scss':
          await prettier.format(content, {
            parser: 'scss',
            plugins: [parserPostcss],
          });
          break;
      }
      return null;
    } catch (err: any) {
      const { line, column, cleanMessage } = this.extractErrorLocation(err, content);
      const offendingLine = lines[line - 1] ?? '';
      const autoFix = this.computeSyntaxQuickFix(content, offendingLine, line, language);

      return {
        id: `syntax-${line}-${column}`,
        line,
        column,
        severity: 'error',
        rule: 'syntax-error',
        message: cleanMessage,
        problematicCode: offendingLine.trim(),
        suggestion: autoFix?.suggestion,
        fixedLineContent: autoFix?.fixedLineContent,
        fixedFullCode: autoFix?.fixedFullCode,
      };
    }
  }

  private extractErrorLocation(
    err: any,
    content: string,
  ): { line: number; column: number; cleanMessage: string } {
    const rawMessage = String(err?.message ?? 'Syntax Error');
    const firstLineMsg = rawMessage.split('\n')[0];

    // Check Prettier loc object first
    if (err?.loc?.start?.line) {
      return {
        line: Number(err.loc.start.line),
        column: Number(err.loc.start.column ?? 1),
        cleanMessage: firstLineMsg,
      };
    }

    // Check js-yaml mark object
    if (err?.mark?.line !== undefined) {
      return {
        line: Number(err.mark.line) + 1,
        column: Number(err.mark.column ?? 0) + 1,
        cleanMessage: err.reason || firstLineMsg,
      };
    }

    // Check (line:col) pattern in message
    const parenMatch = rawMessage.match(/\((\d+):(\d+)\)/);
    if (parenMatch) {
      return {
        line: Number(parenMatch[1]),
        column: Number(parenMatch[2]),
        cleanMessage: firstLineMsg,
      };
    }

    // Check "line X column Y" pattern
    const lineMatch = rawMessage.match(/line\s+(\d+)/i);
    if (lineMatch) {
      return {
        line: Number(lineMatch[1]),
        column: 1,
        cleanMessage: firstLineMsg,
      };
    }

    return {
      line: 1,
      column: 1,
      cleanMessage: firstLineMsg,
    };
  }

  private computeSyntaxQuickFix(
    fullContent: string,
    offendingLine: string,
    lineNumber: number,
    language: SubMenuItem['language'],
  ): { suggestion: string; fixedLineContent?: string; fixedFullCode?: string } | null {
    // Trailing comma fix for JSON
    if (language === 'json' && /,\s*[}\]]/.test(fullContent)) {
      return {
        suggestion: 'Remove trailing commas before closing brackets or braces.',
        fixedFullCode: fullContent.replace(/,(\s*[}\]])/g, '$1'),
      };
    }

    // Missing semicolon fix for Java
    if (
      language === 'java' &&
      offendingLine.trim().length > 0 &&
      !offendingLine.trim().endsWith(';') &&
      !offendingLine.trim().endsWith('{') &&
      !offendingLine.trim().endsWith('}')
    ) {
      return {
        suggestion: 'Add a missing semicolon (;) at the end of the statement.',
        fixedLineContent: `${offendingLine.replace(/\s+$/, '')};`,
      };
    }

    // Unclosed string quote on the offending line
    const doubleQuotes = (offendingLine.match(/"/g) || []).length;
    if (doubleQuotes % 2 !== 0) {
      return {
        suggestion: 'Close the unterminated double-quoted string literal on this line.',
        fixedLineContent: `${offendingLine}"`,
      };
    }

    return null;
  }

  private lintJsTs(lines: string[], language: 'javascript' | 'typescript'): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;

      // 1. Loose equality == or !=
      const eqMatch = lineText.match(/([^=!])(==|!=)([^=])/);
      if (eqMatch) {
        const operator = eqMatch[2];
        const strictOp = operator === '==' ? '===' : '!==';
        issues.push({
          id: `js-eq-${lineNum}`,
          line: lineNum,
          column: (eqMatch.index ?? 0) + 2,
          severity: 'warning',
          rule: 'eqeqeq',
          message: `Use strict equality '${strictOp}' instead of loose '${operator}'.`,
          problematicCode: lineText.trim(),
          suggestion: `Replace '${operator}' with '${strictOp}' to prevent unintended type coercion.`,
          fixedLineContent: lineText.replace(/([^=!])(==|!=)([^=])/, `$1${strictOp}$3`),
        });
      }

      // 2. var usage
      const varMatch = lineText.match(/\bvar\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (varMatch) {
        issues.push({
          id: `js-var-${lineNum}`,
          line: lineNum,
          column: (varMatch.index ?? 0) + 1,
          severity: 'warning',
          rule: 'no-var',
          message: `Unexpected 'var' declaration for '${varMatch[1]}'. Prefer 'const' or 'let'.`,
          problematicCode: lineText.trim(),
          suggestion: `Replace 'var' with block-scoped 'let' or 'const'.`,
          fixedLineContent: lineText.replace(/\bvar\b/, 'let'),
        });
      }

      // 3. debugger statement
      if (/\bdebugger\s*;?/.test(lineText)) {
        issues.push({
          id: `js-dbg-${lineNum}`,
          line: lineNum,
          column: lineText.indexOf('debugger') + 1,
          severity: 'error',
          rule: 'no-debugger',
          message: `Leftover 'debugger' statement found in code.`,
          problematicCode: lineText.trim(),
          suggestion: `Remove the 'debugger' statement before shipping to production.`,
          fixedLineContent: lineText.replace(/\bdebugger\s*;?/, '/* debugger removed */'),
        });
      }

      // 4. TypeScript explicit `any`
      if (language === 'typescript') {
        const anyMatch = lineText.match(/:\s*any\b/);
        if (anyMatch) {
          issues.push({
            id: `ts-any-${lineNum}`,
            line: lineNum,
            column: (anyMatch.index ?? 0) + 1,
            severity: 'warning',
            rule: 'no-explicit-any',
            message: `Avoid using explicit 'any' type; it disables TypeScript type checking.`,
            problematicCode: lineText.trim(),
            suggestion: `Replace ': any' with ': unknown' or a concrete interface.`,
            fixedLineContent: lineText.replace(/:\s*any\b/, ': unknown'),
          });
        }
      }
    });

    return issues;
  }

  private lintJson(content: string, lines: string[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;

      // Single quotes in JSON
      if (/'[^']*'/.test(lineText)) {
        issues.push({
          id: `json-quote-${lineNum}`,
          line: lineNum,
          column: lineText.indexOf("'") + 1,
          severity: 'error',
          rule: 'json-double-quotes',
          message: `JSON specification requires double quotes (") instead of single quotes (').`,
          problematicCode: lineText.trim(),
          suggestion: `Convert single quotes on this line to double quotes.`,
          fixedLineContent: lineText.replace(/'/g, '"'),
        });
      }

      // Trailing comma before closing brace/bracket on next line
      const nextLine = lines[idx + 1]?.trim() ?? '';
      if (lineText.trim().endsWith(',') && (nextLine.startsWith('}') || nextLine.startsWith(']'))) {
        issues.push({
          id: `json-comma-${lineNum}`,
          line: lineNum,
          column: lineText.lastIndexOf(',') + 1,
          severity: 'error',
          rule: 'json-no-trailing-comma',
          message: `Trailing comma before closing '${nextLine[0]}' is invalid in standard JSON.`,
          problematicCode: lineText.trim(),
          suggestion: `Remove the trailing comma at the end of line ${lineNum}.`,
          fixedLineContent: lineText.replace(/,\s*$/, ''),
        });
      }
    });

    return issues;
  }

  private lintYaml(lines: string[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;

      if (lineText.includes('\t')) {
        issues.push({
          id: `yaml-tab-${lineNum}`,
          line: lineNum,
          column: lineText.indexOf('\t') + 1,
          severity: 'error',
          rule: 'yaml-no-tabs',
          message: `YAML forbids tab characters for indentation.`,
          problematicCode: lineText,
          suggestion: `Replace tabs with 2 spaces.`,
          fixedLineContent: lineText.replace(/\t/g, '  '),
        });
      }

      // Missing space after colon in key:value
      const colonMatch = lineText.match(/^(\s*[a-zA-Z0-9_-]+):([^\s#].*)$/);
      if (colonMatch && !lineText.includes('http:') && !lineText.includes('https:')) {
        issues.push({
          id: `yaml-colon-${lineNum}`,
          line: lineNum,
          column: colonMatch[1].length + 1,
          severity: 'error',
          rule: 'yaml-colon-spacing',
          message: `Missing space after colon in YAML mapping key '${colonMatch[1].trim()}'.`,
          problematicCode: lineText.trim(),
          suggestion: `Insert a space after ':' so YAML parses the key-value pair properly.`,
          fixedLineContent: `${colonMatch[1]}: ${colonMatch[2]}`,
        });
      }
    });

    return issues;
  }

  private lintHtml(lines: string[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;

      // <img> without alt attribute
      if (/<img\b(?![^>]*\balt=)[^>]*>/i.test(lineText)) {
        issues.push({
          id: `html-alt-${lineNum}`,
          line: lineNum,
          column: lineText.indexOf('<img') + 1,
          severity: 'warning',
          rule: 'img-alt',
          message: `Image element is missing an 'alt' attribute for accessibility.`,
          problematicCode: lineText.trim(),
          suggestion: `Add alt="" or descriptive alt text to the <img> tag.`,
          fixedLineContent: lineText.replace(/<img\b/i, '<img alt="Image description"'),
        });
      }

      // Obsolete <center> or <font> tags
      if (/<(center|font)\b/i.test(lineText)) {
        issues.push({
          id: `html-obsolete-${lineNum}`,
          line: lineNum,
          column: 1,
          severity: 'warning',
          rule: 'no-obsolete-tags',
          message: `Deprecated HTML tag detected. Use modern CSS flexbox or typography rules instead.`,
          problematicCode: lineText.trim(),
        });
      }
    });

    return issues;
  }

  private lintJava(lines: string[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;

      // System.out.println check
      if (lineText.includes('System.out.print')) {
        issues.push({
          id: `java-sout-${lineNum}`,
          line: lineNum,
          column: lineText.indexOf('System.out') + 1,
          severity: 'info',
          rule: 'no-system-out',
          message: `Direct 'System.out' logging detected. Prefer SLF4J / Logger in production Java classes.`,
          problematicCode: lineText.trim(),
          suggestion: `Replace System.out.println(...) with logger.info(...).`,
          fixedLineContent: lineText.replace(/System\.out\.println\s*\(/, 'logger.info('),
        });
      }

      // String comparison using ==
      const strEqMatch = lineText.match(/([a-zA-Z0-9_]+)\s*==\s*"([^"]*)"/);
      if (strEqMatch) {
        issues.push({
          id: `java-streq-${lineNum}`,
          line: lineNum,
          column: (strEqMatch.index ?? 0) + 1,
          severity: 'warning',
          rule: 'string-equals',
          message: `Strings in Java should be compared with '.equals()' instead of '=='.`,
          problematicCode: lineText.trim(),
          suggestion: `Use "${strEqMatch[2]}".equals(${strEqMatch[1]}) to avoid reference comparison bugs.`,
          fixedLineContent: lineText.replace(/([a-zA-Z0-9_]+)\s*==\s*"([^"]*)"/, `"$2".equals($1)`),
        });
      }
    });

    return issues;
  }

  private lintScss(lines: string[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;

      if (lineText.includes('!important')) {
        issues.push({
          id: `scss-imp-${lineNum}`,
          line: lineNum,
          column: lineText.indexOf('!important') + 1,
          severity: 'warning',
          rule: 'no-important',
          message: `Avoid '!important'; it breaks CSS specificity cascades.`,
          problematicCode: lineText.trim(),
          suggestion: `Remove '!important' and use a more specific selector if needed.`,
          fixedLineContent: lineText.replace(/\s*!important/g, ''),
        });
      }
    });

    return issues;
  }

  private lintXml(content: string, lines: string[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Use browser DOMParser to detect XML well-formedness errors
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'application/xml');
    const parserError = doc.querySelector('parsererror');

    if (parserError) {
      const errText = parserError.textContent ?? 'Invalid XML structure';
      const lineMatch = errText.match(/line\s+(\d+)/i);
      const lineNum = lineMatch ? Number(lineMatch[1]) : 1;

      issues.push({
        id: `xml-parse-${lineNum}`,
        line: lineNum,
        column: 1,
        severity: 'error',
        rule: 'xml-well-formed',
        message: errText.replace(/\s+/g, ' ').trim(),
        problematicCode: lines[lineNum - 1]?.trim() ?? '',
      });
    }

    // Check unescaped ampersands
    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;
      if (/&(?!(amp|lt|gt|quot|apos|#\d+|#x[a-fA-F0-9]+);)/.test(lineText)) {
        issues.push({
          id: `xml-amp-${lineNum}`,
          line: lineNum,
          column: lineText.indexOf('&') + 1,
          severity: 'error',
          rule: 'xml-escape-amp',
          message: `Unescaped '&' character in XML. Use '&amp;' entity instead.`,
          problematicCode: lineText.trim(),
          suggestion: `Replace raw '&' with '&amp;'.`,
          fixedLineContent: lineText.replace(
            /&(?!(amp|lt|gt|quot|apos|#\d+|#x[a-fA-F0-9]+);)/g,
            '&amp;',
          ),
        });
      }
    });

    return issues;
  }

  getBrokenSampleCode(language: SubMenuItem['language']): string {
    const brokenSamples: Record<string, string> = {
      javascript: `function processPayment(amount, status) {\n  var discount = 10;\n  debugger;\n  if (status == "active") {\n    return amount - discount;\n  }\n}`,
      typescript: `export interface ApiResponse {\n  data: any;\n  status: number;\n}\n\nexport function checkCode(code: any) {\n  var isValid = code == 200;\n  return isValid;\n}`,
      html: `<!DOCTYPE html>\n<html>\n<body>\n  <div class="hero">\n    <img src="banner.png">\n    <center>Welcome to FileKit Checker</center>\n  </div>\n</body>\n</html>`,
      yaml: `version: "3.9"\nservices:\n\tweb:\n    image: nginx:latest\n    port:8080`,
      java: `package com.filekit.demo;\n\npublic class AuthValidator {\n  public boolean verify(String role) {\n    System.out.println("Checking role");\n    if (role == "ADMIN") {\n      return true\n    }\n    return false;\n  }\n}`,
      json: `{\n  "appName": 'FileKit',\n  "version": "22.1.0",\n  "features": [\n    "formatter",\n    "error-checker",\n  ]\n}`,
      scss: `.btn-submit {\n  background-color: #58355E !important;\n  color: #FFF689 !important;\n  padding: 12px;\n}`,
      xml: `<configuration>\n  <app name="FileKit & Tools">\n    <version>22.1.0</version>\n  </app>\n</configuration>`,
    };
    return brokenSamples[language] || '';
  }
}
