import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Cleaning up logs...');

    // Delete the specific deployments seen in the screenshot
    const result = await prisma.deployment.deleteMany({
        where: {
            OR: [
                { projectName: 'DeployLog (GitHub)' },
                { projectName: 'DeployLog-Simulation' }
            ]
        }
    });

    console.log(`Successfully deleted ${result.count} deployment logs.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
