import path from "path";
import { readdir } from "node:fs/promises";
import fs from "fs";

export function applyDiffs(originalCode: string, diffBlocks: string): string {
    let lines = originalCode.split('\n');
    const diffRegex = /<diff>([\s\S]*?)<\/diff>/g;
    let match;

    while ((match = diffRegex.exec(diffBlocks)) !== null) {
        const diffContent = match[1].trim();
        const diffLines = diffContent.split('\n');
        
        let i = 0;
        while (i < diffLines.length) {
            const range = diffLines[i];
            i++;

            if (range.includes('c')) {
                // Change lines
                const [oldRange, newRange] = range.split('c');
                const [start, end] = oldRange.split(',').map(num => parseInt(num));
        
                // Skip the lines to be removed
                while (i < diffLines.length && diffLines[i].startsWith('<')) {
                    i++;
                }
                // Skip the separator
                if (diffLines[i] === '---') {
                    i++;
                }
                const newLines = [];
                while (i < diffLines.length && diffLines[i].startsWith('>')) {
                    newLines.push(diffLines[i].slice(2));
                    i++;
                }

                if(oldRange.split(",").length === 1) {
                    lines.splice(start-1, 1, ...newLines);
                } else {
                    // Replace the old lines with the new lines
                    lines.splice(start - 1, end - start + 1, ...newLines);
                }
            } else if (range.includes('a')) {
                // Add lines
                const [before, after] = range.split('a');
                const lineNum = parseInt(before);
                const newLines = [];
                while (i < diffLines.length && diffLines[i].startsWith('>')) {
                    newLines.push(diffLines[i].slice(2));
                    i++;
                }
                lines.splice(lineNum, 0, ...newLines);
            } else if (range.includes('d')) {
                // Delete lines
                const [oldRange] = range.split('d');
                const [start, end] = oldRange.split(',').map(num => parseInt(num));
                lines.splice(start - 1, end - start + 1);
                // Skip the lines that were deleted
                while (i < diffLines.length && diffLines[i].startsWith('<')) {
                    i++;
                }
            }

            // Skip any remaining lines in this diff block
            while (i < diffLines.length && !diffLines[i].match(/^\d+[acd]\d+$/)) {
                i++;
            }
        }
    }
    
    return lines.join('\n');
}

export const getFileContents = async(path: string) => {
    const contents = fs.readFileSync(path, 'utf-8');
    return contents
}

const checkForLocalModels = async () => {
    const modelDirPath = path.resolve(__dirname, "../server/models");
    const files = await readdir(modelDirPath);
    for(let i=0;i<files.length;i++) {
        let file = files[i];
        if(file.includes(".gguf")) {
            return true
        }
    }
    return false
}

const checkForInferenceServerBinary = async () => {
    const serverBinaryPath = path.resolve(__dirname, "../server/lib");
    const files = await readdir(serverBinaryPath);
    if(files[0] === "llama-server") {
        return true
    }
    return false
}

export const checkLocalConfig = async () => {
    let modelsExist = await checkForLocalModels();
    let inferenceServerBinaryExists = await checkForInferenceServerBinary();
    if(!modelsExist || !inferenceServerBinaryExists) {
        throw new Error("Missing either model weights or inference server binary. Run `pensar init-local` to download both.");
    }
}
