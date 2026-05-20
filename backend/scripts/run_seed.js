import fs from 'fs/promises';
import path from 'path';
import db from '../src/config/db.js';

const sqlFile = path.join(process.cwd(), 'seed_test_data.sql');

async function run() {
  try {
    const sql = await fs.readFile(sqlFile, 'utf8');
    console.log('Running seed file:', sqlFile);
    // Split statements by semicolon and run sequentially (robust against multiple statements)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      await db.query(stmt);
    }
    console.log('Seed applied successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

run();
