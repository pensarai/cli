import * as fs from 'fs';
import * as path from 'path';
import { type Language } from '@pensar/semgrep-node';

// TODO: reduce this to the set of languages supported by semgrep-core
// const SUPPORTED_LANGUAGES: Set<string> = new Set([
//   "ts", "js", "py", "go", "cpp", "c", "java", "rb", "php", "cs", "scala", "kt", "swift",
//   "rust", "hs", "ml", "clj", "ex", "lua", "pl", "sh", "sql", "r", "m"
// ]); 

const SUPPORTED_LANGUAGES: Set<string> = new Set([
    "ts", "js", "go", "cpp"
]);

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
        if (SUPPORTED_LANGUAGES.has(extension)) {
          detectedLanguages.add(extension);
        }
      }
    }
  }

  traverse(directory);
  return detectedLanguages;
}