const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

const db = new Database('./hotel.db', { verbose: console.log });

try {
    // 1. Add the new column to the Staff table
    db.prepare('ALTER TABLE Staff ADD COLUMN password_hash TEXT').run();
    console.log("✅ Successfully added 'password_hash' column to Staff table.");
} catch (error) {
    console.log("⚠️ Column might already exist. Skipping creation.");
}

// 2. Generate a secure hash for the password "admin123"
const defaultPassword = 'admin123';
const saltRounds = 10;
const hash = bcrypt.hashSync(defaultPassword, saltRounds);

// 3. Update any staff member who doesn't have a password yet
const updateStmt = db.prepare('UPDATE Staff SET password_hash = ? WHERE password_hash IS NULL');
const info = updateStmt.run(hash);

console.log(`✅ Updated ${info.changes} staff member(s) with the default password: admin123`);
db.close();