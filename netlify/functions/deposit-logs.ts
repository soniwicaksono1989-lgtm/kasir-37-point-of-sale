import { Handler } from '@netlify/functions';
import { query } from './db';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const customerId = event.queryStringParameters?.customer_id;

    switch (event.httpMethod) {
      case 'GET': {
        if (customerId) {
          const result = await query(
            'SELECT * FROM deposit_logs WHERE customer_id = $1 ORDER BY created_at DESC',
            [customerId]
          );
          return { statusCode: 200, headers, body: JSON.stringify(result.rows) };
        }
        const result = await query('SELECT * FROM deposit_logs ORDER BY created_at DESC');
        return { statusCode: 200, headers, body: JSON.stringify(result.rows) };
      }

      case 'POST': {
        const data = JSON.parse(event.body || '{}');
        const result = await query(
          `INSERT INTO deposit_logs (id, customer_id, amount, type, notes, created_by, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
           RETURNING *`,
          [data.customer_id, data.amount, data.type || 'deposit', data.notes, data.created_by]
        );
        return { statusCode: 201, headers, body: JSON.stringify(result.rows[0]) };
      }

      default:
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
  } catch (error) {
    console.error('Deposit logs error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
