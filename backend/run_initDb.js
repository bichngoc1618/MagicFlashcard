import initDb from './src/config/initDb.js';

(async () => {
  try {
    await initDb();
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
})();
