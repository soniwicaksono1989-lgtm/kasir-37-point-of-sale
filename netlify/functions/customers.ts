import { Handler } from '@netlify/functions';
import { query } from './db';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const path = event.path.replace('/.netlify/functions/customers', '').replace('/api/customers', '');
    const id = path.replace('/', '');

    switch (event.httpMethod) {
      case 'GET': {
        if (id) {
          const result = await query('SELECT * FROM customers WHERE id = $1', [id]);
          if (result.rows.length === 0) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: 'Customer not found' }) };
          }
          return { statusCode: 200, headers, body: JSON.stringify(result.rows[0]) };
        }
        
        const search = event.queryStringParameters?.search;
        if (search) {
          const result = await query(
            `SELECT * FROM customers WHERE name ILIKE $1 OR phone ILIKE $1 ORDER BY name`,
            [`%${search}%`]
          );
          return { statusCode: 200, headers, body: JSON.stringify(result.rows) };
        }
        
        const result = await query('SELECT * FROM customers ORDER BY created_at DESC');
        return { statusCode: 200, headers, body: JSON.stringify(result.rows) };
      }

      case 'POST': {
        const data = JSON.parse(event.body || '{}');
        const result = await query(
          `INSERT INTO customers (id, name, phone, address, customer_type, deposit_balance, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING *`,
          [data.name, data.phone, data.address, data.customer_type || 'End User', data.deposit_balance || 0]
        );
        return { statusCode: 201, headers, body: JSON.stringify(result.rows[0]) };
      }

      case 'PUT': {
        if (!id) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID required' }) };
        }
        const data = JSON.parse(event.body || '{}');
        const result = await query(
          `UPDATE customers SET name = $1, phone = $2, address = $3, customer_type = $4, deposit_balance = $5, updated_at = NOW()
           WHERE id = $6 RETURNING *`,
          [data.name, data.phone, data.address, data.customer_type, data.deposit_balance, id]
        );
        if (result.rows.length === 0) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Customer not found' }) };
        }
        return { statusCode: 200, headers, body: JSON.stringify(result.rows[0]) };
      }

      case 'DELETE': {
        if (!id) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID required' }) };
        }
        await query('DELETE FROM customers WHERE id = $1', [id]);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      default:
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
  } catch (error) {
    console.error('Customers error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
