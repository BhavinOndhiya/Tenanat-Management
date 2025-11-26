const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seed() {
    // Clear existing data
    await prisma.complaint.deleteMany();
    await prisma.user.deleteMany();

    // Create demo citizen users
    const user1 = await prisma.user.create({
        data: {
            name: 'John Doe',
            email: 'john@example.com',
            password_hash: await bcrypt.hash('password123', 10),
            role: 'CITIZEN',
        },
    });

    const user2 = await prisma.user.create({
        data: {
            name: 'Jane Smith',
            email: 'jane@example.com',
            password_hash: await bcrypt.hash('password123', 10),
            role: 'CITIZEN',
        },
    });

    // Create officer user
    const officer = await prisma.user.create({
        data: {
            name: 'Officer Demo',
            email: 'officer@example.com',
            password_hash: await bcrypt.hash('OfficerPass123!', 10),
            role: 'OFFICER',
        },
    });

    // Create demo complaints
    await prisma.complaint.createMany({
        data: [
            {
                user_id: user1.id,
                title: 'Road Repair Needed',
                description: 'The road near my house is full of potholes.',
                category: 'Road',
                status: 'NEW',
            },
            {
                user_id: user2.id,
                title: 'Water Supply Issue',
                description: 'There is no water supply in my area for the past two days.',
                category: 'Water',
                status: 'NEW',
            },
        ],
    });

    console.log('Seeding completed.');
    console.log('Officer credentials:');
    console.log('  Email: officer@example.com');
    console.log('  Password: OfficerPass123!');
    console.log('\nCitizen credentials:');
    console.log('  Email: john@example.com / jane@example.com');
    console.log('  Password: password123');
}

seed()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });