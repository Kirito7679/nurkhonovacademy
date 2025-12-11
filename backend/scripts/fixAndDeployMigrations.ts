import prisma from '../src/config/database';

/**
 * Скрипт для автоматического исправления миграций перед деплоем
 * Использование: npx tsx scripts/fixAndDeployMigrations.ts
 */

async function fixAndDeployMigrations() {
  try {
    console.log('🔧 Проверка состояния миграций...');
    
    // Проверяем, есть ли неудачные миграции
    const failedMigrations = await prisma.$queryRawUnsafe(`
      SELECT migration_name, started_at, finished_at 
      FROM "_prisma_migrations" 
      WHERE finished_at IS NULL OR logs IS NOT NULL;
    `);
    
    if (Array.isArray(failedMigrations) && failedMigrations.length > 0) {
      console.log('⚠️ Найдены неудачные миграции, очищаем...');
      await prisma.$executeRawUnsafe(`DELETE FROM "_prisma_migrations";`);
      console.log('✅ Таблица миграций очищена');
    }
    
    // Проверяем, применена ли наша миграция
    const appliedMigration = await prisma.$queryRawUnsafe(`
      SELECT migration_name 
      FROM "_prisma_migrations" 
      WHERE migration_name = '20251211000000_init_postgresql';
    `);
    
    if (!Array.isArray(appliedMigration) || appliedMigration.length === 0) {
      console.log('📝 Помечаем миграцию как примененную...');
      await prisma.$executeRawUnsafe(`
        INSERT INTO "_prisma_migrations" (migration_name, checksum, finished_at, started_at, applied_steps_count)
        VALUES ('20251211000000_init_postgresql', '', NOW(), NOW(), 1);
      `);
      console.log('✅ Миграция помечена как примененная');
    } else {
      console.log('✅ Миграция уже применена');
    }
    
    console.log('✅ Готово к деплою!');
    
  } catch (error: any) {
    // Если таблица не существует, это нормально - миграции еще не применялись
    if (error.code === '42P01') {
      console.log('ℹ️ Таблица миграций не существует, это нормально для первого деплоя');
    } else {
      console.error('❌ Ошибка:', error.message);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

fixAndDeployMigrations();
