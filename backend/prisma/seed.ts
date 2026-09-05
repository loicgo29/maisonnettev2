import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
	// Crée l'utilisateur admin par défaut
	const adminUsername = 'admin';
	const adminPassword = 'admin123';

	// Vérifie s'il existe déjà
	const existing = await prisma.backofficeUser.findUnique({
		where: { username: adminUsername },
	});

	if (existing) {
		console.log('✅ Admin user already exists');
		return;
	}

	// Hash le mot de passe
	const hash = await bcrypt.hash(adminPassword, 10);

	// Crée l'utilisateur
	const user = await prisma.backofficeUser.create({
		data: {
			username: adminUsername,
			hash,
			email: 'admin@maisonnettev2.local',
			role: 'admin',
			active: true,
		},
	});

	console.log('✅ Admin user created:', { id: user.id, username: user.username });
}

main()
	.catch((e) => {
		console.error('❌ Seed failed:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
