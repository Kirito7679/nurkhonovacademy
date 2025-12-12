/**
 * Скрипт для сброса пароля администратора
 * 
 * Использование:
 * - Сбросить пароль админа по телефону: npx tsx scripts/resetAdminPassword.ts +998901234567 "новый_пароль"
 * - Сбросить пароль админа по ID: npx tsx scripts/resetAdminPassword.ts --id <user-id> "новый_пароль"
 * - Сбросить пароль первого найденного админа: npx tsx scripts/resetAdminPassword.ts "новый_пароль"
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAdminPasswordByPhone(phone: string, newPassword: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      console.log(`❌ Пользователь с телефоном ${phone} не найден`);
      return;
    }

    if (user.role !== 'ADMIN') {
      console.log(`⚠️  Пользователь с телефоном ${phone} не является администратором (роль: ${user.role})`);
      console.log('🔄 Обновляю роль на ADMIN...\n');
      
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    console.log('✅ Пароль успешно обновлен!');
    console.log(`\n📋 Информация о пользователе:`);
    console.log(`   Имя: ${user.firstName} ${user.lastName}`);
    console.log(`   Телефон: ${user.phone}`);
    console.log(`   Роль: ADMIN`);
    console.log(`   Новый пароль: ${newPassword}\n`);
  } catch (error) {
    console.error('❌ Ошибка при обновлении пароля:', error);
  }
}

async function resetAdminPasswordById(userId: string, newPassword: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.log(`❌ Пользователь с ID ${userId} не найден`);
      return;
    }

    if (user.role !== 'ADMIN') {
      console.log(`⚠️  Пользователь с ID ${userId} не является администратором (роль: ${user.role})`);
      console.log('🔄 Обновляю роль на ADMIN...\n');
      
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    console.log('✅ Пароль успешно обновлен!');
    console.log(`\n📋 Информация о пользователе:`);
    console.log(`   Имя: ${user.firstName} ${user.lastName}`);
    console.log(`   Телефон: ${user.phone}`);
    console.log(`   Роль: ADMIN`);
    console.log(`   Новый пароль: ${newPassword}\n`);
  } catch (error) {
    console.error('❌ Ошибка при обновлении пароля:', error);
  }
}

async function resetFirstAdminPassword(newPassword: string) {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!admin) {
      console.log('❌ Администратор не найден в базе данных');
      console.log('\n💡 Создайте администратора с помощью:');
      console.log('   npx tsx scripts/createUser.ts "Имя" "Фамилия" "+998901234567" "password" "ADMIN"\n');
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword },
    });

    console.log('✅ Пароль успешно обновлен!');
    console.log(`\n📋 Информация о пользователе:`);
    console.log(`   Имя: ${admin.firstName} ${admin.lastName}`);
    console.log(`   Телефон: ${admin.phone}`);
    console.log(`   Роль: ADMIN`);
    console.log(`   Новый пароль: ${newPassword}\n`);
  } catch (error) {
    console.error('❌ Ошибка при обновлении пароля:', error);
  }
}

async function listAllAdmins() {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    });

    if (admins.length === 0) {
      console.log('❌ Администраторы не найдены в базе данных');
      console.log('\n💡 Создайте администратора с помощью:');
      console.log('   npx tsx scripts/createUser.ts "Имя" "Фамилия" "+998901234567" "password" "ADMIN"\n');
      return;
    }

    console.log(`\n📋 Найдено администраторов: ${admins.length}\n`);
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.firstName} ${admin.lastName}`);
      console.log(`   Телефон: ${admin.phone}`);
      console.log(`   Email: ${admin.email || 'не указан'}`);
      console.log(`   ID: ${admin.id}`);
      console.log(`   Создан: ${admin.createdAt.toLocaleString('ru-RU')}\n`);
    });
  } catch (error) {
    console.error('❌ Ошибка при получении списка администраторов:', error);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('\n📖 Использование:\n');
    console.log('  Сбросить пароль админа по телефону:');
    console.log('    npx tsx scripts/resetAdminPassword.ts +998901234567 "новый_пароль"\n');
    console.log('  Сбросить пароль админа по ID:');
    console.log('    npx tsx scripts/resetAdminPassword.ts --id <user-id> "новый_пароль"\n');
    console.log('  Сбросить пароль первого найденного админа:');
    console.log('    npx tsx scripts/resetAdminPassword.ts "новый_пароль"\n');
    console.log('  Показать список всех администраторов:');
    console.log('    npx tsx scripts/resetAdminPassword.ts --list\n');
    return;
  }

  if (args[0] === '--list') {
    await listAllAdmins();
    await prisma.$disconnect();
    return;
  }

  if (args[0] === '--id') {
    if (args.length < 3) {
      console.log('❌ Укажите ID пользователя и новый пароль');
      console.log('   Пример: npx tsx scripts/resetAdminPassword.ts --id <user-id> "новый_пароль"');
      await prisma.$disconnect();
      return;
    }
    await resetAdminPasswordById(args[1], args[2]);
  } else if (args[0].startsWith('+')) {
    if (args.length < 2) {
      console.log('❌ Укажите новый пароль');
      console.log('   Пример: npx tsx scripts/resetAdminPassword.ts +998901234567 "новый_пароль"');
      await prisma.$disconnect();
      return;
    }
    await resetAdminPasswordByPhone(args[0], args[1]);
  } else {
    // Сбросить пароль первого найденного админа
    await resetFirstAdminPassword(args[0]);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});

