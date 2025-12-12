-- SQL скрипт для полной очистки базы данных PostgreSQL
-- ВНИМАНИЕ: Этот скрипт удалит ВСЕ данные!
-- Используйте только для полного сброса перед передеплоем.

-- Отключаем проверку foreign keys временно
SET session_replication_role = 'replica';

-- Удаляем данные в правильном порядке (с учетом foreign keys)
DELETE FROM "activity_logs";
DELETE FROM "flashcard_progress";
DELETE FROM "flashcards";
DELETE FROM "flashcard_decks";
DELETE FROM "practice_results";
DELETE FROM "quiz_results";
DELETE FROM "student_progress";
DELETE FROM "messages";
DELETE FROM "comments";
DELETE FROM "notifications";
DELETE FROM "external_integrations";
DELETE FROM "lessons";
DELETE FROM "modules";
DELETE FROM "student_courses";
DELETE FROM "courses";
DELETE FROM "users" WHERE "role" != 'ADMIN';

-- Включаем проверку foreign keys обратно
SET session_replication_role = 'origin';

-- Сброс последовательностей (если используете auto-increment)
-- ALTER SEQUENCE "users_id_seq" RESTART WITH 1;
-- ALTER SEQUENCE "courses_id_seq" RESTART WITH 1;
-- и т.д. для других таблиц

-- Проверка
SELECT 'Database cleared successfully!' as status;
