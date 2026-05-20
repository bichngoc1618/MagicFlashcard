import fs from 'fs/promises';
import path from 'path';
import db from '../src/config/db.js';

// When run from the `backend` folder (npm run migrate), process.cwd() is the backend root.
const sqlFile = path.join(process.cwd(), 'create_heart_transactions.sql');

async function run() {
  try {
    const sql = await fs.readFile(sqlFile, 'utf8');
    console.log('Running migration:', sqlFile);
    // split by ; but be robust: execute whole file as one query (MySQL accepts multiple statements only if enabled)
    await db.query(sql);
    console.log('Migration applied successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

run();
