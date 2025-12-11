import prisma from '../src/config/database';
import bcrypt from 'bcryptjs';

/**
 * Скрипт для создания пользователя
 * 
 * Использование:
 * npx tsx scripts/createUser.ts "Имя" "Фамилия" "+998901234567" "password" "ADMIN"
 */

async function createUser(
  firstName: string,
  lastName: string,
  phone: string,
  password: string,
  role: 'STUDENT' | 'TEACHER' | 'ADMIN' = 'ADMIN'
) {
  try {
    // Проверяем, существует ли пользователь
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      console.log(`❌ Пользователь с телефоном ${phone} уже существует`);
      return;
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем пользователя
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        phone,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
      },
    });

    console.log('\n✅ Пользователь успешно создан!');
    console.log(`Имя: ${user.firstName} ${user.lastName}`);
    console.log(`Телефон: ${user.phone}`);
    console.log(`Роль: ${user.role}`);
    console.log(`ID: ${user.id}`);
    console.log('\n💡 Теперь вы можете войти с этими данными!\n');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Обработка аргументов командной строки
const args = process.argv.slice(2);

if (args.length < 4) {
  console.log('📝 Использование:');
  console.log('  npx tsx scripts/createUser.ts "Имя" "Фамилия" "+998901234567" "password" [ADMIN|TEACHER|STUDENT]');
  console.log('\nПример:');
  console.log('  npx tsx scripts/createUser.ts "Дилмурод" "Нурхонов" "+998901234567" "mypassword" "ADMIN"');
  process.exit(1);
}

const [firstName, lastName, phone, password, roleArg] = args;
const role = (roleArg || 'ADMIN').toUpperCase() as 'STUDENT' | 'TEACHER' | 'ADMIN';

if (!['STUDENT', 'TEACHER', 'ADMIN'].includes(role)) {
  console.log('❌ Роль должна быть: STUDENT, TEACHER или ADMIN');
  process.exit(1);
}

createUser(firstName, lastName, phone, password, role);
