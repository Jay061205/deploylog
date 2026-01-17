

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    const baseUrl = 'http://localhost:3000/api/deployments';
    console.log('--- Starting FAILURE Simulation ---');

    // 1. Queue Deployment
    console.log('1. Creating Deployment (Queued)...');
    const createRes = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            projectName: 'DeployLog-Failure-Test',
            branch: 'bugfix/login-issue',
            commitHash: 'bad1dead',
            commitMessage: 'Fixing login bug (fingers crossed)',
            status: 'queued',
        }),
    });
    const deployment = await createRes.json();
    console.log(`   > Created ID: ${deployment.id}`);
    await sleep(1500);

    // DECIDE FAILURE STAGE
    const stages = ['lint', 'test', 'build'];
    const failAt = stages[Math.floor(Math.random() * stages.length)];
    console.log(`   > Simulation rigged to FAIL at: ${failAt.toUpperCase()}`);

    let logs = "STDOUT: Starting pipeline...\n";

    // LINT
    console.log('2. Linting...');
    await fetch(`${baseUrl}/${deployment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'linting' }),
    });
    await sleep(2000);

    if (failAt === 'lint') {
        console.log('   ! SIMULATING LINT FAILURE !');
        logs += "STDOUT: Running ESlint...\nSTDERR: Error: Unexpected token in auth.ts:5\nSTDERR: Linting failed.\n";
        await fetch(`${baseUrl}/${deployment.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'failed', logs }),
        });
        console.log('   > Deployment FAILED at Lint.');
        return;
    }
    logs += "STDOUT: Linting passed.\n";

    // TEST
    console.log('3. Testing...');
    await fetch(`${baseUrl}/${deployment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'testing' }),
    });
    await sleep(2000);

    if (failAt === 'test') {
        console.log('   ! SIMULATING TEST FAILURE !');
        logs += "STDOUT: Running Jest suite...\nSTDERR: FAIL app/auth.test.ts\nSTDERR: Expected 200, got 500.\nSTDERR: Tests failed.\n";
        await fetch(`${baseUrl}/${deployment.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'failed', logs }),
        });
        console.log('   > Deployment FAILED at Test.');
        return;
    }
    logs += "STDOUT: Tests passed (23/23).\n";

    // BUILD
    console.log('4. Building...');
    await fetch(`${baseUrl}/${deployment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'building' }),
    });
    await sleep(2000);

    if (failAt === 'build') {
        console.log('   ! SIMULATING BUILD FAILURE !');
        logs += "STDOUT: Docker build -t app:latest .\nSTDERR: COPY failed: file not found: package-lock.json\nSTDERR: Build failed.\n";
        await fetch(`${baseUrl}/${deployment.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'failed', logs }),
        });
        console.log('   > Deployment FAILED at Build.');
        return;
    }

    // SUCCESS (Should not happen in this script usually, but just in case)
    logs += "STDOUT: Build successful.\nSTDOUT: Deploying to staging...\nSTDOUT: Success.\n";
    await fetch(`${baseUrl}/${deployment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'success', logs }),
    });
    console.log('   > Deployment Succeeded (Unexpected for failure test).');
}

main().catch(console.error);
