import prisma from '../config/database';

/**
 * Скрипт для полной очистки базы данных
 * ВНИМАНИЕ: Этот скрипт удалит ВСЕ данные из базы данных!
 * Используйте только для полного сброса перед передеплоем.
 */

async function clearDatabase() {
  console.log('🚨 Начинаю очистку базы данных...');
  console.log('⚠️  ВНИМАНИЕ: Все данные будут удалены!');

  try {
    // Удаляем данные в правильном порядке (с учетом foreign keys)
    
    console.log('1. Удаляю ActivityLogs...');
    await prisma.activityLog.deleteMany({});
    
    console.log('2. Удаляю FlashcardProgress...');
    await prisma.flashcardProgress.deleteMany({});
    
    console.log('3. Удаляю Flashcards...');
    await prisma.flashcard.deleteMany({});
    
    console.log('4. Удаляю FlashcardDecks...');
    await prisma.flashcardDeck.deleteMany({});
    
    console.log('5. Удаляю PracticeResults...');
    await prisma.practiceResult.deleteMany({});
    
    console.log('6. Удаляю QuizResults...');
    await prisma.quizResult.deleteMany({});
    
    console.log('7. Удаляю StudentProgress...');
    await prisma.studentProgress.deleteMany({});
    
    console.log('8. Удаляю Messages...');
    await prisma.message.deleteMany({});
    
    console.log('9. Удаляю Comments...');
    await prisma.comment.deleteMany({});
    
    console.log('10. Удаляю Notifications...');
    await prisma.notification.deleteMany({});
    
    console.log('11. Удаляю ExternalIntegrations...');
    await prisma.externalIntegration.deleteMany({});
    
    console.log('12. Удаляю Lessons...');
    await prisma.lesson.deleteMany({});
    
    console.log('13. Удаляю Modules...');
    await prisma.module.deleteMany({});
    
    console.log('14. Удаляю StudentCourses...');
    await prisma.studentCourse.deleteMany({});
    
    console.log('15. Удаляю Courses...');
    await prisma.course.deleteMany({});
    
    console.log('16. Удаляю Users (кроме админа)...');
    // Сохраняем админа, если нужно
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });
    
    await prisma.user.deleteMany({
      where: {
        role: { not: 'ADMIN' },
      },
    });
    
    console.log('✅ База данных очищена!');
    
    if (admin) {
      console.log(`ℹ️  Админ сохранен: ${admin.firstName} ${admin.lastName} (${admin.phone})`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при очистке базы данных:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск скрипта
clearDatabase()
  .then(() => {
    console.log('✅ Скрипт завершен успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
