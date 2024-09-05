type DiffType = 'a' | 'd' | 'c';

interface DiffInfo {
  type: DiffType;
  startLine1: number;
  endLine1: number;
  startLine2: number;
  endLine2: number;
}

function parseDiffHeader(header: string): DiffInfo {
  const [range1, range2] = header.split(/[adc]/);
  const type = header.match(/[adc]/)![0] as DiffType;
  const [startLine1, endLine1 = startLine1] = range1.split(',').map(Number);
  const [startLine2, endLine2 = startLine2] = range2.split(',').map(Number);

  return { type, startLine1, endLine1, startLine2, endLine2 };
}

export function parseUnixDiff(diffMessage: string): string {
  const lines = diffMessage.trim().split('\n');
  const header = lines[0];
  const diffInfo = parseDiffHeader(header);
  
  let output = '';
  let lineNumber1 = diffInfo.startLine1;
  let lineNumber2 = diffInfo.startLine2;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === '---') continue;

    if (line.startsWith('<')) {
      output += `- ${lineNumber1} ${line.slice(1).trim()}\n`;
      lineNumber1++;
    } else if (line.startsWith('>')) {
      output += `+ ${lineNumber2} ${line.slice(1).trim()}\n`;
      lineNumber2++;
    }
  }

  return `\n${output.trim()}\n`;
}