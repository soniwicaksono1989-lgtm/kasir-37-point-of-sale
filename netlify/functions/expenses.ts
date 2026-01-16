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
    const path = event.path.replace('/.netlify/functions/expenses', '').replace('/api/expenses', '');
    const id = path.replace('/', '');

    switch (event.httpMethod) {
      case 'GET': {
        if (id) {
          const result = await query('SELECT * FROM expenses WHERE id = $1', [id]);
          if (result.rows.length === 0) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: 'Expense not found' }) };
          }
          return { statusCode: 200, headers, body: JSON.stringify(result.rows[0]) };
        }
        
        const { start_date, end_date } = event.queryStringParameters || {};
        if (start_date && end_date) {
          const result = await query(
            `SELECT * FROM expenses WHERE expense_date >= $1 AND expense_date <= $2 ORDER BY expense_date DESC`,
            [start_date, end_date]
          );
          return { statusCode: 200, headers, body: JSON.stringify(result.rows) };
        }
        
        const result = await query('SELECT * FROM expenses ORDER BY expense_date DESC');
        return { statusCode: 200, headers, body: JSON.stringify(result.rows) };
      }

      case 'POST': {
        const data = JSON.parse(event.body || '{}');
        const result = await query(
          `INSERT INTO expenses (id, description, amount, category, expense_date, created_by, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING *`,
          [data.description, data.amount, data.category, data.expense_date || new Date().toISOString().slice(0, 10), data.created_by]
        );
        return { statusCode: 201, headers, body: JSON.stringify(result.rows[0]) };
      }

      case 'PUT': {
        if (!id) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID required' }) };
        }
        const data = JSON.parse(event.body || '{}');
        const result = await query(
          `UPDATE expenses SET description = $1, amount = $2, category = $3, expense_date = $4, updated_at = NOW()
           WHERE id = $5 RETURNING *`,
          [data.description, data.amount, data.category, data.expense_date, id]
        );
        if (result.rows.length === 0) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Expense not found' }) };
        }
        return { statusCode: 200, headers, body: JSON.stringify(result.rows[0]) };
      }

      case 'DELETE': {
        if (!id) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID required' }) };
        }
        await query('DELETE FROM expenses WHERE id = $1', [id]);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      default:
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
  } catch (error) {
    console.error('Expenses error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
