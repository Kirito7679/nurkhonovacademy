import prisma from '../src/config/database';

/**
 * Скрипт для назначения роли ADMIN всем пользователям с ролью TEACHER
 * Или для назначения ADMIN конкретному пользователю
 * 
 * Использование:
 * - Назначить ADMIN всем TEACHER: npx tsx scripts/makeAdmin.ts --all-teachers
 * - Назначить ADMIN по телефону: npx tsx scripts/makeAdmin.ts +998901234567
 * - Назначить ADMIN по ID: npx tsx scripts/makeAdmin.ts --id <user-id>
 */

async function makeAllTeachersAdmin() {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
      },
    });

    if (teachers.length === 0) {
      console.log('📭 Пользователей с ролью TEACHER не найдено');
      return;
    }

    console.log(`\n📋 Найдено ${teachers.length} пользователей с ролью TEACHER:`);
    teachers.forEach((t, i) => {
      console.log(`${i + 1}. ${t.firstName} ${t.lastName} (${t.phone})`);
    });

    console.log('\n🔄 Обновляю роли на ADMIN...\n');

    const result = await prisma.user.updateMany({
      where: { role: 'TEACHER' },
      data: { role: 'ADMIN' },
    });

    console.log(`✅ Обновлено ${result.count} пользователей`);
    console.log('💡 Теперь всем нужно выйти и войти заново, чтобы обновить токены.\n');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function makeUserAdminById(userId: string) {
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
    console.log(`Текущая роль: ${user.role}`);

    if (user.role === 'ADMIN') {
      console.log('✅ Пользователь уже является администратором');
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' },
    });

    console.log('✅ Роль успешно обновлена на ADMIN');
    console.log('💡 Пользователю нужно выйти и войти заново.\n');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function makeUserAdminByPhone(phone: string) {
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
    console.log(`Текущая роль: ${user.role}`);

    if (user.role === 'ADMIN') {
      console.log('✅ Пользователь уже является администратором');
      return;
    }

    await prisma.user.update({
      where: { phone },
      data: { role: 'ADMIN' },
    });

    console.log('✅ Роль успешно обновлена на ADMIN');
    console.log('💡 Пользователю нужно выйти и войти заново.\n');
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
  console.log('  npx tsx scripts/makeAdmin.ts --all-teachers');
  console.log('  npx tsx scripts/makeAdmin.ts +998901234567');
  console.log('  npx tsx scripts/makeAdmin.ts --id <user-id>');
  process.exit(1);
}

if (args[0] === '--all-teachers') {
  makeAllTeachersAdmin();
} else if (args[0] === '--id' && args[1]) {
  makeUserAdminById(args[1]);
} else if (args[0].startsWith('+') || args[0].match(/^\d/)) {
  makeUserAdminByPhone(args[0]);
} else {
  console.log('❌ Неверный формат команды');
  console.log('Используйте: --all-teachers, --id <id>, или номер телефона');
  process.exit(1);
}
