import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import prisma from '../src/config/database';

const execAsync = promisify(exec);

interface BackupOptions {
  outputDir?: string;
  includeData?: boolean;
  compress?: boolean;
}

export async function createBackup(options: BackupOptions = {}) {
  const {
    outputDir = path.join(process.cwd(), 'backups'),
    includeData = true,
    compress = true,
  } = options;

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `backup-${timestamp}`;
  const backupPath = path.join(outputDir, backupName);

  try {
    console.log('Creating backup...');

    // Create backup directory
    fs.mkdirSync(backupPath, { recursive: true });

    // Export database schema
    console.log('Exporting schema...');
    const schemaPath = path.join(backupPath, 'schema.prisma');
    const originalSchema = path.join(process.cwd(), 'prisma', 'schema.prisma');
    fs.copyFileSync(originalSchema, schemaPath);

    // Export data if SQLite
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.startsWith('file:') && includeData) {
      console.log('Exporting database data...');
      const dbPath = dbUrl.replace('file:', '');
      const dbBackupPath = path.join(backupPath, 'database.db');
      fs.copyFileSync(dbPath, dbBackupPath);
    }

    // Export migrations
    console.log('Exporting migrations...');
    const migrationsPath = path.join(backupPath, 'migrations');
    const originalMigrations = path.join(process.cwd(), 'prisma', 'migrations');
    if (fs.existsSync(originalMigrations)) {
      fs.mkdirSync(migrationsPath, { recursive: true });
      copyDirectory(originalMigrations, migrationsPath);
    }

    // Create metadata file
    const metadata = {
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      database: dbUrl.includes('postgresql') ? 'postgresql' : 'sqlite',
    };
    fs.writeFileSync(
      path.join(backupPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Compress if requested
    if (compress) {
      console.log('Compressing backup...');
      const zipPath = `${backupPath}.zip`;
      if (process.platform === 'win32') {
        // Windows - requires PowerShell
        await execAsync(
          `powershell Compress-Archive -Path "${backupPath}" -DestinationPath "${zipPath}"`
        );
      } else {
        // Unix-like systems
        await execAsync(`cd "${outputDir}" && zip -r "${backupName}.zip" "${backupName}"`);
      }
      // Remove uncompressed directory
      fs.rmSync(backupPath, { recursive: true, force: true });
      console.log(`Backup created: ${zipPath}`);
      return zipPath;
    }

    console.log(`Backup created: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
}

function copyDirectory(src: string, dest: string) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// CLI usage
if (require.main === module) {
  createBackup()
    .then((backupPath) => {
      console.log(`✅ Backup completed: ${backupPath}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Backup failed:', error);
      process.exit(1);
    });
}
