import * as fs from 'fs';
import * as path from 'path';
import { type Language } from '@pensar/semgrep-node';

const SUPPORTED_LANGUAGES = new Set([
  'apex', 'bash', 'c', 'c#', 'c++', 'cairo', 'circom', 'clojure', 'cpp', 'csharp',
  'dart', 'docker', 'dockerfile', 'elixir', 'ex', 'generic', 'go', 'golang', 'hack',
  'hcl', 'html', 'java', 'javascript', 'js', 'json', 'jsonnet', 'julia', 'kotlin',
  'kt', 'lisp', 'lua', 'move_on_aptos', 'none', 'ocaml', 'php', 'promql', 'proto',
  'proto3', 'protobuf', 'py', 'python', 'python2', 'python3', 'ql', 'r', 'regex',
  'ruby', 'rust', 'scala', 'scheme', 'sh', 'sol', 'solidity', 'swift', 'terraform',
  'tf', 'ts', 'typescript', 'vue', 'xml', 'yaml'
]);

const EXTENSION_TO_LANGUAGE: { [key: string]: string } = {
  'js': 'javascript',
  'py': 'python',
  'ts': 'typescript',
  'cpp': 'c++',
  'cs': 'c#',
  'kt': 'kotlin',
  'ex': 'elixir',
  'tf': 'terraform',
  'sol': 'solidity',
};

export function detectProgrammingLanguages(directory: string = '.'): Set<string> {
  const detectedLanguages = new Set<string>();

  function traverse(dir: string) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        traverse(filePath);
      } else if (stat.isFile()) {
        const extension = path.extname(file).slice(1).toLowerCase();
        const fileName = path.basename(file).toLowerCase();

        // Check if the file extension or name matches a supported language
        if (SUPPORTED_LANGUAGES.has(extension)) {
          detectedLanguages.add(EXTENSION_TO_LANGUAGE[extension] || extension);
        } else if (SUPPORTED_LANGUAGES.has(fileName)) {
          detectedLanguages.add(fileName);
        }

        // Special cases
        if (fileName === 'dockerfile') {
          detectedLanguages.add('docker');
        } else if (extension === 'sh' || fileName.endsWith('.sh')) {
          detectedLanguages.add('bash');
        }
      }
    }
  }

  traverse(directory);
  return detectedLanguages;
}