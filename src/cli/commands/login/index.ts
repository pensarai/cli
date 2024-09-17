import { config } from "@/lib/config";
import open from "open";

const ConsoleUrl = `${config.CONSOLE_URL}/login`;

export function loginCommandHandler(noBroswer: boolean) {
    console.log(`Opening browser window at ${ConsoleUrl}.\n\nPlease follow the steps to login there and create an API key.`);
    if(!noBroswer) {
        open(ConsoleUrl);
    }
}