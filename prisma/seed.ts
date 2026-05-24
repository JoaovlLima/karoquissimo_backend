import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // 1. Seed Fernanda Admin User in 'usuarios'
  const email = 'fernanda@karoquissimo.com';
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!existingUser) {
    // Generate secure hash for default password: 'Fernanda@2026'
    const passwordHash = await bcrypt.hash('Fernanda@2026', 10);
    const user = await prisma.user.create({
      data: {
        name: 'Fernanda',
        email,
        passwordHash,
        isActive: true,
      },
    });
    console.log(`User created: ${user.name} (${user.email})`);
  } else {
    console.log(`User with email ${email} already exists.`);
  }

  // 2. Seed Karoquíssimo Company info in 'empresa'
  const companyCount = await prisma.company.count();
  if (companyCount === 0) {
    const company = await prisma.company.create({
      data: {
        corporateName: 'Fernanda Comercio de Vestuario e Acessorios LTDA',
        tradeName: 'Estoque Karoquíssimo',
        cnpj: '12.345.678/0001-90',
        phone: '(11) 99999-8888',
        whatsapp: '(11) 99999-8888',
        email: 'contato@karoquissimo.com',
        street: 'Avenida Paulista',
        number: '1000',
        complement: 'Bloco A, Loja 5',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      },
    });
    console.log(`Company created: ${company.tradeName}`);
  } else {
    console.log('Company information already exists.');
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
