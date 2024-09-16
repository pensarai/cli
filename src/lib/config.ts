export const config = {
    API_URL: process.env.NODE_ENV==="production" ? "https://prod-api.pensar-ai.com"
     :
     process.env.PENSAR_API
     ?? 
     "https://api.pensar-ai.com",

    CONSOLE_URL: process.env.NODE_ENV==="production" ? "https://console.pensar.dev": "http://localhost:3000"
}