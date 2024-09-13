import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function writeToLog(message: string): void {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();

  const logFileName = `${day}_${month}_${year}-pensar-log`;
  const logDirectory = path.join(os.homedir(), '.pensar', 'logs');
  const logFilePath = path.join(logDirectory, logFileName);

  // Ensure the log directory exists
  if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
  }

  const logEntry = `[${now.toISOString()}] ${message}\n`;

  // Append to the log file
  fs.appendFileSync(logFilePath, logEntry, 'utf8');
}