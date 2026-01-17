import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { deploymentId } = await req.json();

    if (!deploymentId) {
      return NextResponse.json(
        { error: 'Deployment ID is required' },
        { status: 400 }
      );
    }

    // Basic check for API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    console.log('Using API Key:', apiKey ? 'Present' : 'Missing');
    console.log('Searching for Deployment ID:', deploymentId);

    // 1. Fetch deployment logs
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId.trim() }, // Ensure whitespace is removed
    });

    console.log(
      'Deployment Search Result:',
      deployment ? 'Found' : 'Not Found'
    );

    if (!deployment) {
      return NextResponse.json(
        { error: 'Deployment not found' },
        { status: 404 }
      );
    }

    if (!deployment.logs) {
      return NextResponse.json(
        { error: 'No logs available for this deployment' },
        { status: 400 }
      );
    }

    // 2. Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'models/gemini-pro-latest' });

    // 3. Prepare Prompt based on status
    let prompt;
    if (
      deployment.status.toLowerCase() === 'failed' ||
      deployment.status.toLowerCase() === 'error'
    ) {
      prompt = `
                Analyze the following CI/CD deployment logs and explain why it failed. 
                Provide a concise summary of the error and suggest 2-3 actionable steps to fix it.
                Format the response in Markdown.

                Logs:
                ${deployment.logs.substring(0, 10000)}
            `;
    } else {
      prompt = `
                Analyze the following CI/CD deployment logs for a successful build.
                Provide a summary of what was deployed, any warnings or optimizations noted, and the total time if available.
                Format the response in Markdown with sections for 'Summary', 'Warnings/Notes', and 'Optimization Tips'.

                Logs:
                ${deployment.logs.substring(0, 10000)}
            `;
    }

    // 4. Generate Content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = response.text();

    // 5. Save analysis to DB
    await prisma.deployment.update({
      where: { id: deploymentId.trim() },
      data: { aiAnalysis: analysis },
    });

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('AI Analysis Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `AI Error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
