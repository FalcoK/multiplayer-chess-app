// Hybrid Database Connection Layer (SQLite or PostgreSQL / Supabase)
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv6first');
}
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');

let isPostgres = false;
let pgPool = null;
let sqliteDb = null;

// Determine if we should connect to Postgres (Supabase)
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for Supabase cloud connections
    }
  });
  isPostgres = true;
  console.log('Database Mode: CLOUD (PostgreSQL / Supabase)');
} else {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, 'chess.db');
  sqliteDb = new sqlite3.Database(dbPath);
  // Enable foreign keys locally
  sqliteDb.run('PRAGMA foreign_keys = ON;');
  console.log('Database Mode: LOCAL (SQLite)');
}

/**
 * Helper to convert SQLite style parameter placeholders (?) 
 * to PostgreSQL style placeholders ($1, $2, $3, ...)
 * @param {string} sql 
 * @returns {string}
 */
function translateQuery(sql) {
  if (!isPostgres) return sql;
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

// Promise-based wrappers
function run(sql, params = []) {
  const translatedSql = translateQuery(sql);
  
  if (isPostgres) {
    return pgPool.query(translatedSql, params)
      .then(res => {
        // Return structured object similar to SQLite
        return { id: null, changes: res.rowCount };
      });
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(translatedSql, params, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }
}

function get(sql, params = []) {
  const translatedSql = translateQuery(sql);
  
  if (isPostgres) {
    return pgPool.query(translatedSql, params)
      .then(res => res.rows[0] || null);
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.get(translatedSql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }
}

function all(sql, params = []) {
  const translatedSql = translateQuery(sql);
  
  if (isPostgres) {
    return pgPool.query(translatedSql, params)
      .then(res => res.rows);
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(translatedSql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

// Initial database schema builder
async function initDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  if (isPostgres) {
    try {
      // In Postgres, we can execute the whole schema block at once
      await pgPool.query(schema);
      
      // Auto-migrations for email verification
      try {
        await pgPool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE');
        await pgPool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified INTEGER DEFAULT 0');
        await pgPool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255)');
      } catch (e) {
        console.warn('Postgres migration warning:', e.message);
      }
      
      console.log('PostgreSQL (Supabase) database schema initialized.');
    } catch (err) {
      console.error('Failed to initialize PostgreSQL schema:', err);
      throw err;
    }
  } else {
    // In SQLite, we must split and run serialize
    const schemaCleaned = schema
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    const statements = schemaCleaned
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    return new Promise((resolve, reject) => {
      sqliteDb.serialize(() => {
        let success = true;
        for (const statement of statements) {
          sqliteDb.run(statement, (err) => {
            if (err) {
              console.error('Failed to execute statement:', statement);
              console.error(err);
              success = false;
            }
          });
        }
        
        // Auto-migrations for email verification in SQLite (ignores duplicate column errors)
        sqliteDb.run('ALTER TABLE users ADD COLUMN email TEXT;', () => {});
        sqliteDb.run('ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0;', () => {});
        sqliteDb.run('ALTER TABLE users ADD COLUMN verification_token TEXT;', () => {});

        if (success) {
          console.log('SQLite database schema initialized.');
          resolve();
        } else {
          reject(new Error('Failed to initialize SQLite schema.'));
        }
      });
    });
  }
}

module.exports = {
  db: isPostgres ? pgPool : sqliteDb,
  run,
  get,
  all,
  initDatabase,
  isPostgres
};
