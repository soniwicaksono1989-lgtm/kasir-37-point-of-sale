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
    const path = event.path.replace('/.netlify/functions/products', '').replace('/api/products', '');
    const id = path.replace('/', '');

    switch (event.httpMethod) {
      case 'GET': {
        if (id) {
          const result = await query('SELECT * FROM products WHERE id = $1', [id]);
          if (result.rows.length === 0) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: 'Product not found' }) };
          }
          return { statusCode: 200, headers, body: JSON.stringify(result.rows[0]) };
        }
        const result = await query('SELECT * FROM products ORDER BY created_at DESC');
        return { statusCode: 200, headers, body: JSON.stringify(result.rows) };
      }

      case 'POST': {
        const data = JSON.parse(event.body || '{}');
        const result = await query(
          `INSERT INTO products (id, name, category, price_reseller, price_end_user, stock, unit, is_active, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
           RETURNING *`,
          [data.name, data.category, data.price_reseller, data.price_end_user, data.stock || 0, data.unit, data.is_active ?? true]
        );
        return { statusCode: 201, headers, body: JSON.stringify(result.rows[0]) };
      }

      case 'PUT': {
        if (!id) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID required' }) };
        }
        const data = JSON.parse(event.body || '{}');
        const result = await query(
          `UPDATE products SET name = $1, category = $2, price_reseller = $3, price_end_user = $4, stock = $5, unit = $6, is_active = $7, updated_at = NOW()
           WHERE id = $8 RETURNING *`,
          [data.name, data.category, data.price_reseller, data.price_end_user, data.stock, data.unit, data.is_active, id]
        );
        if (result.rows.length === 0) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Product not found' }) };
        }
        return { statusCode: 200, headers, body: JSON.stringify(result.rows[0]) };
      }

      case 'DELETE': {
        if (!id) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID required' }) };
        }
        await query('DELETE FROM products WHERE id = $1', [id]);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      default:
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
  } catch (error) {
    console.error('Products error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
