import { Pool } from 'pg';

let pool: Pool | null = null;

export const getPool = (): Pool => {
  if (!pool) {
    // Use NETLIFY_DATABASE_URL (pooled) or NETLIFY_DATABASE_URL_UNPOOLED
    // NETLIFY_DATABASE_URL = pooled connection (recommended for serverless)
    // NETLIFY_DATABASE_URL_UNPOOLED = direct connection (for migrations/admin)
    const connectionString = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }
  return pool;
};

export const query = async (text: string, params?: any[]) => {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};
