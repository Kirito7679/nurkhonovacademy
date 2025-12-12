import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function restoreBackup(backupPath: string) {
  try {
    console.log(`Restoring backup from: ${backupPath}`);

    // Check if backup exists
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup not found: ${backupPath}`);
    }

    // Extract if compressed
    let extractedPath = backupPath;
    if (backupPath.endsWith('.zip')) {
      console.log('Extracting backup...');
      extractedPath = backupPath.replace('.zip', '');
      
      if (process.platform === 'win32') {
        await execAsync(
          `powershell Expand-Archive -Path "${backupPath}" -DestinationPath "${path.dirname(backupPath)}" -Force`
        );
      } else {
        await execAsync(`unzip -o "${backupPath}" -d "${path.dirname(backupPath)}"`);
      }
    }

    // Read metadata
    const metadataPath = path.join(extractedPath, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      console.log(`Backup metadata:`, metadata);
    }

    // Restore database if SQLite
    const dbPath = path.join(extractedPath, 'database.db');
    if (fs.existsSync(dbPath)) {
      console.log('Restoring database...');
      const targetDb = process.env.DATABASE_URL?.replace('file:', '') || 'prisma/dev.db';
      fs.copyFileSync(dbPath, targetDb);
      console.log('Database restored');
    }

    // Restore migrations
    const migrationsBackup = path.join(extractedPath, 'migrations');
    if (fs.existsSync(migrationsBackup)) {
      console.log('Restoring migrations...');
      const targetMigrations = path.join(process.cwd(), 'prisma', 'migrations');
      if (fs.existsSync(targetMigrations)) {
        fs.rmSync(targetMigrations, { recursive: true, force: true });
      }
      copyDirectory(migrationsBackup, targetMigrations);
      console.log('Migrations restored');
    }

    console.log('✅ Backup restored successfully');
  } catch (error) {
    console.error('❌ Restore failed:', error);
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
  const backupPath = process.argv[2];
  if (!backupPath) {
    console.error('Usage: ts-node restore.ts <backup-path>');
    process.exit(1);
  }

  restoreBackup(backupPath)
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Restore failed:', error);
      process.exit(1);
    });
}
