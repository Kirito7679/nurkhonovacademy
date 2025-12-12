import prisma from '../src/config/database';
import bcrypt from 'bcryptjs';

/**
 * Скрипт для изменения пароля пользователя
 * 
 * Использование:
 * npx tsx scripts/changePassword.ts +998901234567 "новый-пароль"
 */

async function changePassword(phone: string, newPassword: string) {
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

    // Хешируем новый пароль
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Обновляем пароль
    await prisma.user.update({
      where: { phone },
      data: { password: hashedPassword },
    });

    console.log('\n✅ Пароль успешно изменен!');
    console.log('💡 Пользователю нужно войти заново с новым паролем.\n');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Обработка аргументов командной строки
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('📝 Использование:');
  console.log('  npx tsx scripts/changePassword.ts +998901234567 "новый-пароль"');
  console.log('\nПример:');
  console.log('  npx tsx scripts/changePassword.ts +998901234567 "MyNewPassword123"');
  process.exit(1);
}

const [phone, newPassword] = args;
changePassword(phone, newPassword);
