import path from "path";

export const modelLocation = () => {
    // return path.resolve(path.join(import.meta.dir, "models/DeepSeek-Coder-V2-Lite-Instruct-Q6_K.gguf"));
    return path.resolve(path.join(import.meta.dir, "models/Meta-Llama-3.1-8B-Instruct-Q6_K.gguf"));
}

export const serverBinaryLocation = () => {
    return path.resolve(path.join(import.meta.dir, "lib/llama-server"));
}