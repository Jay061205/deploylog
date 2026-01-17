
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

async function main() {
    let apiKey = '';
    try {
        const envFile = fs.readFileSync('.env', 'utf8');
        const match = envFile.match(/GEMINI_API_KEY=(.*)/);
        if (match) apiKey = match[1].trim();
    } catch (e) {
        console.error('Could not read .env file');
        return;
    }

    if (!apiKey) {
        console.error("No API KEY found in .env");
        return;
    }

    console.log("Testing new key with 'gemini-1.5-flash'...");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    try {
        const result = await model.generateContent("Hello, are you working?");
        const response = await result.response;
        console.log("Success! Response: " + response.text());
    } catch (error) {
        console.error("Failed with gemini-1.5-flash:", error.message);

        // Fallback test
        console.log("\nTesting 'gemini-pro'...");
        const modelPro = genAI.getGenerativeModel({ model: 'gemini-pro' });
        try {
            const resultPro = await modelPro.generateContent("Hello?");
            console.log("Success with gemini-pro!");
        } catch (e2) {
            console.error("Failed with gemini-pro:", e2.message);
        }
    }
}

main();
