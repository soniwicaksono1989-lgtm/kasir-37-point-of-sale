import { Handler } from '@netlify/functions';
import { query } from './db';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const transactionId = event.queryStringParameters?.transaction_id;

    switch (event.httpMethod) {
      case 'GET': {
        if (transactionId) {
          const result = await query(
            'SELECT * FROM payments WHERE transaction_id = $1 ORDER BY created_at',
            [transactionId]
          );
          return { statusCode: 200, headers, body: JSON.stringify(result.rows) };
        }
        const result = await query('SELECT * FROM payments ORDER BY created_at DESC');
        return { statusCode: 200, headers, body: JSON.stringify(result.rows) };
      }

      case 'POST': {
        const data = JSON.parse(event.body || '{}');
        const result = await query(
          `INSERT INTO payments (id, transaction_id, amount, payment_method, notes, created_by, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
           RETURNING *`,
          [data.transaction_id, data.amount, data.payment_method || 'Cash', data.notes, data.created_by]
        );
        return { statusCode: 201, headers, body: JSON.stringify(result.rows[0]) };
      }

      case 'DELETE': {
        const id = event.queryStringParameters?.id;
        if (id) {
          await query('DELETE FROM payments WHERE id = $1', [id]);
          return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID required' }) };
      }

      default:
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
  } catch (error) {
    console.error('Payments error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
