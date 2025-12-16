/**
 * Скрипт для создания куратора или переназначения пользователя на куратора
 * 
 * Использование:
 * - Создать нового куратора: npx tsx scripts/createCurator.ts "Имя" "Фамилия" "+998901234567" "email@example.com" "password"
 * - Переназначить существующего пользователя: npx tsx scripts/createCurator.ts --phone "+998901234567"
 * - Переназначить по ID: npx tsx scripts/createCurator.ts --id <user-id>
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createNewCurator(
  firstName: string,
  lastName: string,
  phone: string,
  email?: string,
  password?: string
) {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      console.log(`⚠️  Пользователь с телефоном ${phone} уже существует`);
      console.log(`   Текущая роль: ${existingUser.role}`);
      console.log(`   Имя: ${existingUser.firstName} ${existingUser.lastName}`);
      console.log('\n💡 Используйте --phone или --id для переназначения существующего пользователя\n');
      return;
    }

    // Generate default password if not provided
    const finalPassword = password || '123456';
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // Create curator
    const curator = await prisma.user.create({
      data: {
        firstName,
        lastName,
        phone,
        email: email || null,
        password: hashedPassword,
        role: 'CURATOR',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    console.log('✅ Куратор успешно создан!');
    console.log(`\n📋 Информация о кураторе:`);
    console.log(`   ID: ${curator.id}`);
    console.log(`   Имя: ${curator.firstName} ${curator.lastName}`);
    console.log(`   Телефон: ${curator.phone}`);
    console.log(`   Email: ${curator.email || 'не указан'}`);
    console.log(`   Роль: ${curator.role}`);
    console.log(`   Пароль: ${finalPassword}\n`);
  } catch (error) {
    console.error('❌ Ошибка при создании куратора:', error);
  }
}

async function convertUserToCuratorByPhone(phone: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      console.log(`❌ Пользователь с телефоном ${phone} не найден`);
      return;
    }

    if (user.role === 'CURATOR') {
      console.log(`ℹ️  Пользователь ${user.firstName} ${user.lastName} уже является куратором`);
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'CURATOR' },
    });

    console.log('✅ Пользователь успешно переназначен на куратора!');
    console.log(`\n📋 Информация о кураторе:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Имя: ${user.firstName} ${user.lastName}`);
    console.log(`   Телефон: ${user.phone}`);
    console.log(`   Email: ${user.email || 'не указан'}`);
    console.log(`   Предыдущая роль: ${user.role}`);
    console.log(`   Новая роль: CURATOR\n`);
  } catch (error) {
    console.error('❌ Ошибка при переназначении:', error);
  }
}

async function convertUserToCuratorById(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.log(`❌ Пользователь с ID ${userId} не найден`);
      return;
    }

    if (user.role === 'CURATOR') {
      console.log(`ℹ️  Пользователь ${user.firstName} ${user.lastName} уже является куратором`);
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'CURATOR' },
    });

    console.log('✅ Пользователь успешно переназначен на куратора!');
    console.log(`\n📋 Информация о кураторе:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Имя: ${user.firstName} ${user.lastName}`);
    console.log(`   Телефон: ${user.phone}`);
    console.log(`   Email: ${user.email || 'не указан'}`);
    console.log(`   Предыдущая роль: ${user.role}`);
    console.log(`   Новая роль: CURATOR\n`);
  } catch (error) {
    console.error('❌ Ошибка при переназначении:', error);
  }
}

async function listAllCurators() {
  try {
    const curators = await prisma.user.findMany({
      where: { role: 'CURATOR' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        createdAt: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    });

    if (curators.length === 0) {
      console.log('❌ Кураторы не найдены в базе данных');
      console.log('\n💡 Создайте куратора с помощью:');
      console.log('   npx tsx scripts/createCurator.ts "Имя" "Фамилия" "+998901234567"\n');
      return;
    }

    console.log(`\n📋 Найдено кураторов: ${curators.length}\n`);
    curators.forEach((curator, index) => {
      console.log(`${index + 1}. ${curator.firstName} ${curator.lastName}`);
      console.log(`   Телефон: ${curator.phone}`);
      console.log(`   Email: ${curator.email || 'не указан'}`);
      console.log(`   ID: ${curator.id}`);
      console.log(`   Создан: ${curator.createdAt.toLocaleString('ru-RU')}\n`);
    });
  } catch (error) {
    console.error('❌ Ошибка при получении списка кураторов:', error);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('\n📖 Использование:\n');
    console.log('  Создать нового куратора:');
    console.log('    npx tsx scripts/createCurator.ts "Имя" "Фамилия" "+998901234567" [email] [password]\n');
    console.log('  Переназначить пользователя по телефону:');
    console.log('    npx tsx scripts/createCurator.ts --phone +998901234567\n');
    console.log('  Переназначить пользователя по ID:');
    console.log('    npx tsx scripts/createCurator.ts --id <user-id>\n');
    console.log('  Показать список всех кураторов:');
    console.log('    npx tsx scripts/createCurator.ts --list\n');
    return;
  }

  if (args[0] === '--list') {
    await listAllCurators();
    await prisma.$disconnect();
    return;
  }

  if (args[0] === '--phone') {
    if (args.length < 2) {
      console.log('❌ Укажите номер телефона');
      console.log('   Пример: npx tsx scripts/createCurator.ts --phone +998901234567');
      await prisma.$disconnect();
      return;
    }
    await convertUserToCuratorByPhone(args[1]);
  } else if (args[0] === '--id') {
    if (args.length < 2) {
      console.log('❌ Укажите ID пользователя');
      console.log('   Пример: npx tsx scripts/createCurator.ts --id <user-id>');
      await prisma.$disconnect();
      return;
    }
    await convertUserToCuratorById(args[1]);
  } else {
    // Create new curator
    if (args.length < 3) {
      console.log('❌ Укажите имя, фамилию и телефон');
      console.log('   Пример: npx tsx scripts/createCurator.ts "Имя" "Фамилия" "+998901234567"');
      await prisma.$disconnect();
      return;
    }

    const [firstName, lastName, phone, email, password] = args;
    await createNewCurator(firstName, lastName, phone, email, password);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});


