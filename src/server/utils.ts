import * as os from "os";
import path from "path";

export const modelLocation = () => {
    const homeDir = os.homedir();
    return path.resolve(homeDir, ".pensar", "models", "meta-llama-3.1-8b-instruct-Q6_K.gguf");
}

export const serverBinaryLocation = () => {
    const homeDir = os.homedir();
    return path.resolve(homeDir, ".pensar", "server", "llama-server");
}