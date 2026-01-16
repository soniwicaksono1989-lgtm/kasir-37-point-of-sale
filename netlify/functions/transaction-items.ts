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
            `SELECT ti.*, p.name as product_name, p.category as product_category 
             FROM transaction_items ti 
             LEFT JOIN products p ON p.id = ti.product_id 
             WHERE ti.transaction_id = $1 ORDER BY ti.created_at`,
            [transactionId]
          );
          return { statusCode: 200, headers, body: JSON.stringify(result.rows) };
        }
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'transaction_id required' }) };
      }

      case 'POST': {
        const data = JSON.parse(event.body || '{}');
        const result = await query(
          `INSERT INTO transaction_items (id, transaction_id, product_id, custom_name, file_name, length, width, real_width, quantity, unit_price, subtotal, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
           RETURNING *`,
          [
            data.transaction_id,
            data.product_id,
            data.custom_name,
            data.file_name,
            data.length,
            data.width,
            data.real_width,
            data.quantity || 1,
            data.unit_price || 0,
            data.subtotal || 0
          ]
        );
        return { statusCode: 201, headers, body: JSON.stringify(result.rows[0]) };
      }

      case 'DELETE': {
        if (transactionId) {
          await query('DELETE FROM transaction_items WHERE transaction_id = $1', [transactionId]);
          return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
        }
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'transaction_id required' }) };
      }

      default:
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
  } catch (error) {
    console.error('Transaction items error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
