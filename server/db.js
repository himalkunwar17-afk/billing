// Dual-environment Database Adapter
// - development: local SQLite (better-sqlite3)
// - production: Neon PostgreSQL (pg)

import path from 'path';
import { rootDir } from './env.js';

const dbClient = (
  process.env.DB_CLIENT ||
  (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL ? 'postgres' : 'sqlite')
).toLowerCase();

export const isPostgres = dbClient === 'postgres' || dbClient === 'postgresql';

let adapter = null;
let initPromise = null;

/**
 * Convert SQLite `?` placeholders outside quotes into PostgreSQL `$1, $2, ...`
 */
function toPgSql(sql) {
  let out = '';
  let paramIndex = 1;
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && !inDouble) {
      if (inSingle && sql[i + 1] === "'") {
        out += "''";
        i++;
        continue;
      }
      inSingle = !inSingle;
      out += ch;
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      out += ch;
    } else if (ch === '?' && !inSingle && !inDouble) {
      out += `$${paramIndex++}`;
    } else {
      out += ch;
    }
  }

  return out;
}

function createSqliteAdapter(sqliteDb) {
  let txQueue = Promise.resolve();

  const execOps = {
    async get(sql, params = []) {
      return sqliteDb.prepare(sql).get(...params);
    },
    async all(sql, params = []) {
      return sqliteDb.prepare(sql).all(...params);
    },
    async run(sql, params = []) {
      const info = sqliteDb.prepare(sql).run(...params);
      return {
        lastInsertRowid: Number(info.lastInsertRowid),
        changes: info.changes,
      };
    },
    async exec(sql) {
      sqliteDb.exec(sql);
    },
  };

  return {
    ...execOps,
    transaction(fn) {
      const runTx = async () => {
        sqliteDb.exec('BEGIN');
        try {
          const result = await fn(execOps);
          sqliteDb.exec('COMMIT');
          return result;
        } catch (err) {
          sqliteDb.exec('ROLLBACK');
          throw err;
        }
      };
      const next = txQueue.then(runTx, runTx);
      txQueue = next.catch(() => {});
      return next;
    },
    async close() {
      sqliteDb.close();
    },
  };
}

function createPgExecutor(clientOrPool) {
  return {
    async get(sql, params = []) {
      const res = await clientOrPool.query(toPgSql(sql), params);
      return res.rows[0];
    },
    async all(sql, params = []) {
      const res = await clientOrPool.query(toPgSql(sql), params);
      return res.rows;
    },
    async run(sql, params = []) {
      const isInsert = /^\s*INSERT\s+INTO\s+/i.test(sql) && !/\bRETURNING\b/i.test(sql);
      const pgSql = toPgSql(isInsert ? `${sql.trim().replace(/;$/, '')} RETURNING id` : sql);
      const res = await clientOrPool.query(pgSql, params);
      return {
        lastInsertRowid: res.rows?.[0]?.id ?? null,
        changes: res.rowCount ?? 0,
      };
    },
    async exec(sql) {
      await clientOrPool.query(sql);
    },
  };
}

function createPgAdapter(pool) {
  return {
    ...createPgExecutor(pool),
    async transaction(fn) {
      const client = await pool.connect();
      const txOps = createPgExecutor(client);
      try {
        await client.query('BEGIN');
        const result = await fn(txOps);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}

async function initSqliteSchema(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      company_name TEXT DEFAULT 'My Company',
      company_name_np TEXT DEFAULT '',
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      pan_no TEXT DEFAULT '',
      bank_name TEXT DEFAULT '',
      bank_account TEXT DEFAULT '',
      logo_url TEXT DEFAULT '',
      fiscal_year TEXT DEFAULT '2081/82',
      invoice_prefix TEXT DEFAULT 'INV',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      category_id INTEGER REFERENCES categories(id),
      unit TEXT DEFAULT 'pcs',
      purchase_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      stock_quantity REAL DEFAULT 0,
      min_stock_level REAL DEFAULT 0,
      is_vat_applicable INTEGER DEFAULT 1,
      hsn_code TEXT DEFAULT '',
      description TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      pan_no TEXT DEFAULT '',
      is_vat_registered INTEGER DEFAULT 0,
      balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      pan_no TEXT DEFAULT '',
      is_vat_registered INTEGER DEFAULT 0,
      balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT UNIQUE NOT NULL,
      date_ad TEXT NOT NULL,
      date_bs TEXT NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      customer_name TEXT DEFAULT '',
      customer_pan TEXT DEFAULT '',
      customer_address TEXT DEFAULT '',
      subtotal REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      taxable_amount REAL DEFAULT 0,
      vat_amount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      amount_in_words TEXT DEFAULT '',
      payment_method TEXT DEFAULT 'cash',
      payment_status TEXT DEFAULT 'paid',
      notes TEXT DEFAULT '',
      is_cancelled INTEGER DEFAULT 0,
      created_by TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      product_name TEXT NOT NULL,
      hsn_code TEXT DEFAULT '',
      quantity REAL NOT NULL,
      unit TEXT DEFAULT 'pcs',
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      discount_pct REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      taxable_amount REAL NOT NULL,
      vat_pct REAL DEFAULT 13,
      vat_amount REAL NOT NULL,
      total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT NOT NULL,
      supplier_invoice_no TEXT DEFAULT '',
      date_ad TEXT NOT NULL,
      date_bs TEXT NOT NULL,
      supplier_id INTEGER REFERENCES suppliers(id),
      supplier_name TEXT DEFAULT '',
      supplier_pan TEXT DEFAULT '',
      supplier_address TEXT DEFAULT '',
      subtotal REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      taxable_amount REAL DEFAULT 0,
      vat_amount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      amount_in_words TEXT DEFAULT '',
      payment_method TEXT DEFAULT 'cash',
      payment_status TEXT DEFAULT 'paid',
      notes TEXT DEFAULT '',
      is_cancelled INTEGER DEFAULT 0,
      created_by TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      product_name TEXT NOT NULL,
      hsn_code TEXT DEFAULT '',
      quantity REAL NOT NULL,
      unit TEXT DEFAULT 'pcs',
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      discount_pct REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      taxable_amount REAL NOT NULL,
      vat_pct REAL DEFAULT 13,
      vat_amount REAL NOT NULL,
      total REAL NOT NULL
    );
  `);
}

async function initPostgresSchema(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      company_name TEXT DEFAULT 'My Company',
      company_name_np TEXT DEFAULT '',
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      pan_no TEXT DEFAULT '',
      bank_name TEXT DEFAULT '',
      bank_account TEXT DEFAULT '',
      logo_url TEXT DEFAULT '',
      fiscal_year TEXT DEFAULT '2081/82',
      invoice_prefix TEXT DEFAULT 'INV',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      category_id INTEGER REFERENCES categories(id),
      unit TEXT DEFAULT 'pcs',
      purchase_price DOUBLE PRECISION DEFAULT 0,
      selling_price DOUBLE PRECISION DEFAULT 0,
      stock_quantity DOUBLE PRECISION DEFAULT 0,
      min_stock_level DOUBLE PRECISION DEFAULT 0,
      is_vat_applicable INTEGER DEFAULT 1,
      hsn_code TEXT DEFAULT '',
      description TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      pan_no TEXT DEFAULT '',
      is_vat_registered INTEGER DEFAULT 0,
      balance DOUBLE PRECISION DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      pan_no TEXT DEFAULT '',
      is_vat_registered INTEGER DEFAULT 0,
      balance DOUBLE PRECISION DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      invoice_no TEXT UNIQUE NOT NULL,
      date_ad TEXT NOT NULL,
      date_bs TEXT NOT NULL,
      customer_id INTEGER REFERENCES customers(id),
      customer_name TEXT DEFAULT '',
      customer_pan TEXT DEFAULT '',
      customer_address TEXT DEFAULT '',
      subtotal DOUBLE PRECISION DEFAULT 0,
      discount_amount DOUBLE PRECISION DEFAULT 0,
      taxable_amount DOUBLE PRECISION DEFAULT 0,
      vat_amount DOUBLE PRECISION DEFAULT 0,
      total_amount DOUBLE PRECISION DEFAULT 0,
      amount_in_words TEXT DEFAULT '',
      payment_method TEXT DEFAULT 'cash',
      payment_status TEXT DEFAULT 'paid',
      notes TEXT DEFAULT '',
      is_cancelled INTEGER DEFAULT 0,
      created_by TEXT DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id SERIAL PRIMARY KEY,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      product_name TEXT NOT NULL,
      hsn_code TEXT DEFAULT '',
      quantity DOUBLE PRECISION NOT NULL,
      unit TEXT DEFAULT 'pcs',
      rate DOUBLE PRECISION NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      discount_pct DOUBLE PRECISION DEFAULT 0,
      discount_amount DOUBLE PRECISION DEFAULT 0,
      taxable_amount DOUBLE PRECISION NOT NULL,
      vat_pct DOUBLE PRECISION DEFAULT 13,
      vat_amount DOUBLE PRECISION NOT NULL,
      total DOUBLE PRECISION NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id SERIAL PRIMARY KEY,
      invoice_no TEXT NOT NULL,
      supplier_invoice_no TEXT DEFAULT '',
      date_ad TEXT NOT NULL,
      date_bs TEXT NOT NULL,
      supplier_id INTEGER REFERENCES suppliers(id),
      supplier_name TEXT DEFAULT '',
      supplier_pan TEXT DEFAULT '',
      supplier_address TEXT DEFAULT '',
      subtotal DOUBLE PRECISION DEFAULT 0,
      discount_amount DOUBLE PRECISION DEFAULT 0,
      taxable_amount DOUBLE PRECISION DEFAULT 0,
      vat_amount DOUBLE PRECISION DEFAULT 0,
      total_amount DOUBLE PRECISION DEFAULT 0,
      amount_in_words TEXT DEFAULT '',
      payment_method TEXT DEFAULT 'cash',
      payment_status TEXT DEFAULT 'paid',
      notes TEXT DEFAULT '',
      is_cancelled INTEGER DEFAULT 0,
      created_by TEXT DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id SERIAL PRIMARY KEY,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      product_name TEXT NOT NULL,
      hsn_code TEXT DEFAULT '',
      quantity DOUBLE PRECISION NOT NULL,
      unit TEXT DEFAULT 'pcs',
      rate DOUBLE PRECISION NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      discount_pct DOUBLE PRECISION DEFAULT 0,
      discount_amount DOUBLE PRECISION DEFAULT 0,
      taxable_amount DOUBLE PRECISION NOT NULL,
      vat_pct DOUBLE PRECISION DEFAULT 13,
      vat_amount DOUBLE PRECISION NOT NULL,
      total DOUBLE PRECISION NOT NULL
    );
  `);
}

async function seedDefaultData(db) {
  const settingsCount = await db.get('SELECT COUNT(*) AS count FROM settings');
  if (Number(settingsCount?.count || 0) === 0) {
    await db.run(
      `INSERT INTO settings (id, company_name, fiscal_year, invoice_prefix)
       VALUES (1, 'My Company', '2081/82', 'INV')`
    );
  }

  const categoryCount = await db.get('SELECT COUNT(*) AS count FROM categories');
  if (Number(categoryCount?.count || 0) === 0) {
    const samples = [
      ['Electronics', 'Electronic items and accessories'],
      ['Stationery', 'Office and school stationery'],
      ['General', 'General merchandise'],
    ];
    for (const [name, description] of samples) {
      await db.run('INSERT INTO categories (name, description) VALUES (?, ?)', [name, description]);
    }
  }
}

export async function initDb() {
  if (adapter) return adapter;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (isPostgres) {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required when DB_CLIENT=postgres');
      }
      const { default: pg } = await import('pg');
      // Parse PostgreSQL int8 (COUNT(*)) as JS numbers to match SQLite behavior
      pg.types.setTypeParser(20, (val) => parseInt(val, 10));

      const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      });

      const pgDb = createPgAdapter(pool);
      await initPostgresSchema(pgDb);
      await seedDefaultData(pgDb);
      adapter = pgDb;
      console.log('Database connected: PostgreSQL (Neon)');
      return adapter;
    } else {
      const { default: Database } = await import('better-sqlite3');
      const sqliteRel = process.env.SQLITE_PATH || './server/billing.db';
      const sqlitePath = path.isAbsolute(sqliteRel) ? sqliteRel : path.resolve(rootDir, sqliteRel);
      const sqliteDb = new Database(sqlitePath);
      sqliteDb.pragma('journal_mode = WAL');
      sqliteDb.pragma('foreign_keys = ON');

      const sqliteAdapter = createSqliteAdapter(sqliteDb);
      await initSqliteSchema(sqliteAdapter);
      await seedDefaultData(sqliteAdapter);
      adapter = sqliteAdapter;
      console.log(`Database connected: SQLite (${sqlitePath})`);
      return adapter;
    }
  })();

  return initPromise;
}

const db = {
  async get(sql, params = []) {
    const conn = await initDb();
    return conn.get(sql, params);
  },
  async all(sql, params = []) {
    const conn = await initDb();
    return conn.all(sql, params);
  },
  async run(sql, params = []) {
    const conn = await initDb();
    return conn.run(sql, params);
  },
  async exec(sql) {
    const conn = await initDb();
    return conn.exec(sql);
  },
  async transaction(fn) {
    const conn = await initDb();
    return conn.transaction(fn);
  },
  async close() {
    if (adapter) {
      await adapter.close();
      adapter = null;
      initPromise = null;
    }
  },
};

export default db;
