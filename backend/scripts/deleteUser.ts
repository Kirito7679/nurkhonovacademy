import prisma from '../src/config/database';

/**
 * Скрипт для удаления пользователя
 * 
 * Использование:
 * npx tsx scripts/deleteUser.ts +998901234567
 * npx tsx scripts/deleteUser.ts --id <user-id>
 */

async function deleteUserByPhone(phone: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
      },
    });

    if (!user) {
      console.log(`❌ Пользователь с телефоном ${phone} не найден`);
      return;
    }

    console.log('\n📋 Информация о пользователе:');
    console.log(`Имя: ${user.firstName} ${user.lastName}`);
    console.log(`Телефон: ${user.phone}`);
    console.log(`Роль: ${user.role}`);

    // Удаляем пользователя (каскадное удаление удалит связанные данные)
    await prisma.user.delete({
      where: { phone },
    });

    console.log('\n✅ Пользователь успешно удален');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function deleteUserById(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
      },
    });

    if (!user) {
      console.log(`❌ Пользователь с ID ${userId} не найден`);
      return;
    }

    console.log('\n📋 Информация о пользователе:');
    console.log(`Имя: ${user.firstName} ${user.lastName}`);
    console.log(`Телефон: ${user.phone}`);
    console.log(`Роль: ${user.role}`);

    await prisma.user.delete({
      where: { id: userId },
    });

    console.log('\n✅ Пользователь успешно удален');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Обработка аргументов командной строки
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('📝 Использование:');
  console.log('  npx tsx scripts/deleteUser.ts +998901234567');
  console.log('  npx tsx scripts/deleteUser.ts --id <user-id>');
  process.exit(1);
}

if (args[0] === '--id' && args[1]) {
  deleteUserById(args[1]);
} else if (args[0].startsWith('+') || args[0].match(/^\d/)) {
  deleteUserByPhone(args[0]);
} else {
  console.log('❌ Неверный формат команды');
  console.log('Используйте: --id <id> или номер телефона');
  process.exit(1);
}
