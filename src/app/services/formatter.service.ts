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
import { FormatOptions, SubMenuItem } from '../models/menu.model';

@Injectable({
  providedIn: 'root',
})
export class FormatterService {
  async processContent(
    content: string,
    tool: SubMenuItem,
    options: FormatOptions,
  ): Promise<string> {
    if (!content.trim()) {
      return '';
    }

    const basePrettierConfig = {
      tabWidth: options.tabWidth,
      useTabs: options.useTabs,
      singleQuote: options.singleQuote,
      semi: options.semi,
      printWidth: options.printWidth,
    };

    switch (tool.language) {
      case 'javascript':
        return await prettier.format(content, {
          ...basePrettierConfig,
          parser: 'babel',
          plugins: [parserBabel, parserEstree],
        });

      case 'typescript':
        return await prettier.format(content, {
          ...basePrettierConfig,
          parser: 'typescript',
          plugins: [parserTypescript, parserEstree],
        });

      case 'html':
        return await prettier.format(content, {
          ...basePrettierConfig,
          parser: 'html',
          plugins: [parserHtml],
        });

      case 'yaml':
        return await prettier.format(content, {
          ...basePrettierConfig,
          parser: 'yaml',
          plugins: [parserYaml],
        });

      case 'java':
        return await prettier.format(content, {
          ...basePrettierConfig,
          parser: 'java',
          plugins: [prettierPluginJava],
        });

      case 'json':
        return await prettier.format(content, {
          ...basePrettierConfig,
          parser: 'json',
          plugins: [parserBabel, parserEstree],
        });

      case 'scss':
        return await prettier.format(content, {
          ...basePrettierConfig,
          parser: 'scss',
          plugins: [parserPostcss],
        });

      case 'xml':
        return this.formatXml(content, options.useTabs ? '\t' : ' '.repeat(options.tabWidth));

      case 'yaml-to-json': {
        const parsedYaml = yaml.load(content);
        const indent = options.useTabs ? '\t' : options.tabWidth;
        return JSON.stringify(parsedYaml, null, indent);
      }

      case 'json-to-yaml': {
        const parsedJson = JSON.parse(content);
        return yaml.dump(parsedJson, {
          indent: options.tabWidth,
          lineWidth: options.printWidth,
        });
      }

      default:
        return content;
    }
  }

  minifyContent(content: string, language: SubMenuItem['language']): string {
    if (!content.trim()) {
      return '';
    }

    if (language === 'json' || language === 'yaml-to-json') {
      return JSON.stringify(JSON.parse(content));
    }

    if (language === 'html' || language === 'xml') {
      return content
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/>\s+</g, '><')
        .trim();
    }

    if (language === 'scss') {
      return content
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}:;,])\s*/g, '$1')
        .trim();
    }

    // Basic whitespace collapse fallback for JS, TS, and Java
    return content
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private formatXml(xml: string, indentStr: string): string {
    let formatted = '';
    const reg = /(>)(<)(\/*)/g;
    const cleanXml = xml.trim().replace(reg, '$1\r\n$2$3');
    let pad = 0;

    for (const rawNode of cleanXml.split('\r\n')) {
      const node = rawNode.trim();
      if (!node) continue;

      let indent = 0;
      if (node.match(/.+<\/\w[^>]*>$/)) {
        indent = 0;
      } else if (node.match(/^<\/\w/)) {
        if (pad !== 0) pad -= 1;
      } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
        indent = 1;
      } else {
        indent = 0;
      }

      formatted += indentStr.repeat(pad) + node + '\n';
      pad += indent;
    }
    return formatted.trim();
  }

  getSampleCode(language: SubMenuItem['language']): string {
    const samples: Record<SubMenuItem['language'], string> = {
      javascript: `function calculateTotal(items){const tax=0.08;return items.filter(i=>i.price>0).reduce((acc,item)=>{return acc+(item.price*(1+tax))},0);}`,
      typescript: `interface UserProfile{id:number;username:string;roles:Array<'admin'|'editor'|'viewer'>;active?:boolean;}export class AccountManager{private users:UserProfile[]=[];addUser(u:UserProfile):void{this.users.push(u);}}`,
      html: `<!DOCTYPE html><html><head><title>FileKit</title></head><body><div class="card"><header><h1>Welcome to FileKit</h1></header><main><p>Upload or paste your unformatted markup here.</p></main></div></body></html>`,
      yaml: `version: "3.9"\nservices:\n  web:\n    image: nginx:alpine\n    ports:\n    - "8080:80"\n    environment:\n      NODE_ENV: production`,
      java: `package com.filekit.demo;import java.util.List;public class OrderProcessor{public void process(List<String> orders){for(String order:orders){if(order!=null&&!order.isEmpty()){System.out.println("Processing: "+order);}}}}`,
      json: `{"appName":"FileKit","version":"22.1.0","features":["js","ts","html","yaml","java"],"settings":{"darkMode":true,"indent":2}}`,
      scss: `$primary: #58355E; .card { padding: 1rem; &:hover { background-color: $primary; .title { color: #FFF689; font-weight: bold; } } }`,
      xml: `<project><modelVersion>4.0.0</modelVersion><groupId>com.filekit</groupId><artifactId>formatter-app</artifactId><version>1.0.0</version></project>`,
      'yaml-to-json': `server:\n  host: localhost\n  port: 4200\n  ssl: true\n  allowedOrigins:\n    - https://example.com\n    - https://api.example.com`,
      'json-to-yaml': `{"database":{"host":"127.0.0.1","port":5432,"credentials":{"username":"admin","roles":["read","write"]}}}`,
    };
    return samples[language] || '';
  }
}
