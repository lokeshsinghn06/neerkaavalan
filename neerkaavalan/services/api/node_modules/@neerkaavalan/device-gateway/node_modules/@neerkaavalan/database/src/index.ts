import pg from 'pg';

const { Pool } = pg;

export const db = new Pool({
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5433),
  database: process.env.DATABASE_NAME ?? 'neerkaavalan',
  user: process.env.DATABASE_USER ?? 'neerkaavalan',
  password: process.env.DATABASE_PASSWORD ?? 'neerkaavalan_dev',
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export async function checkDatabaseConnection(): Promise<boolean> {
  const client = await db.connect();

  try {
    await client.query('SELECT 1');
    return true;
  } finally {
    client.release();
  }
}

export async function closeDatabase(): Promise<void> {
  await db.end();
}