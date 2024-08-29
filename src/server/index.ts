import { spawn } from "child_process";
import { modelLocation, serverBinaryLocation } from "./utils";

const delay = () => {
    return new Promise(resolve => setTimeout(resolve, 1000));
}

const ping = async () => {
    let response = await fetch("https://localhost:8080/health");
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
                await delay();
            }
        }
        reject();
    });
}

export async function spawnLlamaCppServer(verbose?: boolean) {
    const pathToServerBinary = serverBinaryLocation();
    const proc = spawn(pathToServerBinary, ["-m", modelLocation(), "-c", "4096", "-t", "16"]);
    await serverHealthCheck();
    return proc
}