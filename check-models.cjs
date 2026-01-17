
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

    console.log("Checking models...");

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            console.error("Error listing models:", data);
            return;
        }

        const names = [];
        if (data.models) {
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                    names.push(m.name);
                }
            });
            fs.writeFileSync('models_output.txt', names.join('\n'));
            console.log('Success: Wrote ' + names.length + ' models to models_output.txt');
        } else {
            console.log("No models returned. Raw:", data);
        }

    } catch (error) {
        console.error("Script failed:", error);
    }
}

main();
