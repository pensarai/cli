const ConsoleUrl = "https://cosole.pensar.dev/login";

export function loginCommandHandler() {
    console.log(`Opening browser window at ${ConsoleUrl}.\n\nPlease follow the steps to login there and create an API key.`);
    open(ConsoleUrl);
}