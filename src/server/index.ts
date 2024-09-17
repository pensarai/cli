import { spawn } from "child_process";
import { modelLocation, serverBinaryLocation } from "./utils";
import * as child_process from 'child_process';
import * as os from 'os';
import * as path from 'path';

const delay = () => {
    console.log("delaying")
    return new Promise(resolve => setTimeout(resolve, 1000));
}

const ping = async () => {
    let response = await fetch("http://localhost:8080/health");
    if(response.status !== 200) {
        throw new Error("Error loading model");
    }
}

function serverHealthCheck(): Promise<void> {
    return new Promise(async (resolve, reject) => {
        let retries = 5;
        while (retries !== 0) {
            try {
                await ping();
                resolve();
                break;
            } catch(error) {
                retries--;
                if(retries === 0) {
                    reject(error);
                }
                await delay();
            }
        }
    });
}

export async function spawnLlamaCppServer(verbose?: boolean) {
    const pathToServerBinary = serverBinaryLocation();
    const proc = spawn(pathToServerBinary, ["-m", modelLocation(), "-c", "4096", "-t", "16"]);
    await serverHealthCheck();
    return proc
}

interface LlamaServerOptions {
    model: string;
    nCtx?: number;
    nGpuLayers?: number;
    nThreads?: number;
    port?: number;
  }
  
  function spawnLlamaServer(options: LlamaServerOptions): Promise<child_process.ChildProcess> {
    return new Promise((resolve, reject) => {
      const homeDir = os.homedir();
      const serverPath = path.join(homeDir, '.pensar', 'server', 'llama-server');
  
      const args = [
        '--model', options.model,
        '--ctx_size', options.nCtx?.toString() || '2048',
        '--n_gpu_layers', options.nGpuLayers?.toString() || '0',
        '--threads', options.nThreads?.toString() || '4',
        '--port', options.port?.toString() || '8080',
      ];
  
      const server = child_process.spawn(serverPath, args);
  
      server.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Server output:', output);
        if (output.includes('HTTP server listening')) {
          resolve(server);
        }
      });
  
      server.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
      });
  
      server.on('error', (error) => {
        reject(error);
      });
  
      server.on('exit', (code, signal) => {
        if (code !== 0) {
          reject(new Error(`Server exited with code ${code} and signal ${signal}`));
        }
      });
  
      // Set a timeout in case the server doesn't start properly
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timed out'));
        server.kill();
      }, 30000); // 30 seconds timeout
  
      server.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }