import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const execAsync = promisify(exec);
dotenv.config();

interface BackupConfig {
  backupDir: string;
  maxBackups: number;
  databaseUrl: string;
}

async function createBackup() {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not found in environment variables');
    }

    // Parse database URL to get connection details
    const url = new URL(databaseUrl);
    const dbName = url.pathname.slice(1).split('?')[0];
    const dbUser = url.username;
    const dbPassword = url.password;
    const dbHost = url.hostname;
    const dbPort = url.port || '5432';

    // Create backups directory
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFileName = `backup-${dbName}-${timestamp}.sql`;
    const backupPath = path.join(backupDir, backupFileName);

    // Set PGPASSWORD environment variable for pg_dump
    const env = { ...process.env, PGPASSWORD: dbPassword };

    // Create pg_dump command
    const pgDumpCommand = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F c -f "${backupPath}"`;

    console.log('Creating database backup...');
    console.log(`Database: ${dbName}`);
    console.log(`Backup file: ${backupFileName}`);

    // Execute pg_dump
    await execAsync(pgDumpCommand, { env });

    // Get file size
    const stats = fs.statSync(backupPath);
    const fileSize = stats.size;

    console.log(`✅ Backup created successfully!`);
    console.log(`   File: ${backupFileName}`);
    console.log(`   Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Path: ${backupPath}`);

    // Cleanup old backups (keep only last N backups)
    const maxBackups = parseInt(process.env.MAX_BACKUPS || '10');
    cleanupOldBackups(backupDir, maxBackups);

    return {
      success: true,
      fileName: backupFileName,
      filePath: backupPath,
      fileSize,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Error creating backup:', error);
    throw error;
  }
}

function cleanupOldBackups(backupDir: string, maxBackups: number) {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time); // Sort by modification time, newest first

    // Remove old backups if we exceed maxBackups
    if (files.length > maxBackups) {
      const filesToDelete = files.slice(maxBackups);
      console.log(`Cleaning up ${filesToDelete.length} old backup(s)...`);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`   Deleted: ${file.name}`);
      });
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
  }
}

// Run if called directly
if (require.main === module) {
  createBackup()
    .then(() => {
      console.log('Backup process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Backup process failed:', error);
      process.exit(1);
    });
}

export { createBackup };
