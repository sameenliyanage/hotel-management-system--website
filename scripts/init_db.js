const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

const repoRoot = path.resolve(__dirname, '..');
const schemaPath = path.join(repoRoot, 'schema.sql');
const dbPath = path.join(repoRoot, 'hotel.db');

if (!fs.existsSync(schemaPath)) {
  console.error(`schema.sql not found at ${schemaPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(schemaPath, 'utf8');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database', err);
    process.exit(1);
  }

  db.exec('PRAGMA foreign_keys = ON;', (err) => {
    if (err) console.error('Failed to enable foreign keys', err);
    db.exec(sql, (err2) => {
      if (err2) {
        console.error('Failed to execute schema', err2);
        process.exit(1);
      }
      console.log(`Database created: ${dbPath}`);
      db.close();
    });
  });
});
