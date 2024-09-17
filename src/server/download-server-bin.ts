import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as child_process from 'child_process';

async function downloadAndExtractLlamaCpp(): Promise<void> {
  const homeDir = os.homedir();
  const pensarDir = path.join(homeDir, '.pensar');
  const serverDir = path.join(pensarDir, 'server');
  const tempDir = path.join(pensarDir, 'temp');

  // Create necessary directories
  fs.mkdirSync(serverDir, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });

  // Determine OS and set download URL
  const platform = os.platform();
  let downloadUrl: string;

  if (platform === 'darwin') {
    downloadUrl = 'https://github.com/ggerganov/llama.cpp/releases/download/b3772/llama-b3772-bin-macos-arm64.zip';
  } else if (platform === 'linux') {
    downloadUrl = 'https://objects.githubusercontent.com/github-production-release-asset-2e65be/612354784/3c7aad5f-aba4-4d48-9902-2a030d7f9c5f?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=releaseassetproduction%2F20240917%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20240917T012702Z&X-Amz-Expires=300&X-Amz-Signature=e85fe5ab304d759b3e487a9662c0bbb96569c919a2a5f99d573ec13c2bffddb6&X-Amz-SignedHeaders=host&actor_id=0&key_id=0&repo_id=612354784&response-content-disposition=attachment%3B%20filename%3Dllama-b3772-bin-ubuntu-x64.zip&response-content-type=application%2Foctet-stream';
  } else {
    throw new Error('Unsupported operating system. Only macOS and Linux are supported.');
  }

  const zipFilePath = path.join(tempDir, 'llama.zip');

  // Download the zip file
  await new Promise<void>((resolve, reject) => {
    https.get(downloadUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(zipFilePath);
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    }).on('error', reject);
  });

  // Extract the llama-server binary
  await new Promise<void>((resolve, reject) => {
    const unzipCommand = `unzip -j "${zipFilePath}" "*llama-server*" -d "${serverDir}"`;
    child_process.exec(unzipCommand, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  // Clean up
  fs.unlinkSync(zipFilePath);
  console.log('LlamaCpp server binary has been downloaded and extracted.');
}

export { downloadAndExtractLlamaCpp };