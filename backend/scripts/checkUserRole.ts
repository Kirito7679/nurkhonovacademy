import prisma from '../src/config/database';

/**
 * Скрипт для проверки и обновления роли пользователя
 * Использование: npx tsx scripts/checkUserRole.ts <phone>
 */

async function checkAndUpdateUserRole(phone: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      console.log(`❌ Пользователь с телефоном ${phone} не найден`);
      return;
    }

    console.log('\n📋 Текущая информация о пользователе:');
    console.log('─────────────────────────────────────');
    console.log(`ID: ${user.id}`);
    console.log(`Имя: ${user.firstName} ${user.lastName}`);
    console.log(`Телефон: ${user.phone}`);
    console.log(`Email: ${user.email || 'не указан'}`);
    console.log(`Роль: ${user.role}`);
    console.log('─────────────────────────────────────\n');

    if (user.role !== 'ADMIN') {
      console.log('⚠️  Пользователь не является администратором');
      console.log('🔄 Обновляю роль на ADMIN...\n');

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      console.log('✅ Роль успешно обновлена!');
      console.log(`Новая роль: ${updated.role}\n`);
      console.log('💡 Теперь вам нужно выйти и войти заново, чтобы обновить токен.');
    } else {
      console.log('✅ Пользователь уже является администратором');
      console.log('💡 Если у вас все еще проблемы с правами, попробуйте выйти и войти заново.\n');
    }
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Получаем телефон из аргументов командной строки
const phone = process.argv[2];

if (!phone) {
  console.log('📝 Использование: npx tsx scripts/checkUserRole.ts <phone>');
  console.log('Пример: npx tsx scripts/checkUserRole.ts +998901234567');
  process.exit(1);
}

checkAndUpdateUserRole(phone);
