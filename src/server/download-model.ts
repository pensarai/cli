import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import cliProgress from 'cli-progress';
import diskusage from 'diskusage';

export async function downloadModelWeights(url: string, fileName: string): Promise<void> {
  const homeDir = os.homedir();
  const downloadDir = path.join(homeDir, '.pensar', 'models');
  const filePath = path.join(downloadDir, fileName);

  // Ensure the download directory exists
  fs.mkdirSync(downloadDir, { recursive: true });

  // Check available disk space
  const { available } = await diskusage.check(downloadDir);

  // Get the file size
  const { headers } = await axios.head(url);
  const fileSize = parseInt(headers['content-length'], 10);

  if (fileSize > available) {
    throw new Error('Not enough disk space to download the model weights.');
  }

  // Create progress bar
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

  // Start the download
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  progressBar.start(fileSize, 0);

  // Save the file and update progress
  const writer = fs.createWriteStream(filePath);
  let downloadedBytes = 0;

  response.data.on('data', (chunk: Buffer) => {
    downloadedBytes += chunk.length;
    progressBar.update(downloadedBytes);
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      progressBar.stop();
      resolve();
    });
    writer.on('error', reject);
  });
}