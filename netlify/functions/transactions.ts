import { Handler } from '@netlify/functions';
import { query } from './db';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

const generateInvoiceNumber = async (): Promise<string> => {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `INV-37CONCEPT-${dateStr}-`;
  
  const result = await query(
    `SELECT invoice_number FROM transactions WHERE invoice_number LIKE $1 ORDER BY invoice_number DESC LIMIT 1`,
    [`${prefix}%`]
  );
  
  let seq = 1;
  if (result.rows.length > 0) {
    const lastNum = result.rows[0].invoice_number.replace(prefix, '');
    seq = parseInt(lastNum, 10) + 1;
  }
  
  return `${prefix}${seq.toString().padStart(5, '0')}`;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const path = event.path.replace('/.netlify/functions/transactions', '').replace('/api/transactions', '');
    const id = path.replace('/', '');

    switch (event.httpMethod) {
      case 'GET': {
        if (id) {
          const result = await query('SELECT * FROM transactions WHERE id = $1', [id]);
          if (result.rows.length === 0) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: 'Transaction not found' }) };
          }
          return { statusCode: 200, headers, body: JSON.stringify(result.rows[0]) };
        }
        
        const { start_date, end_date } = event.queryStringParameters || {};
        if (start_date && end_date) {
          const result = await query(
            `SELECT * FROM transactions WHERE created_at >= $1 AND created_at <= $2 ORDER BY created_at DESC`,
            [start_date, end_date]
          );
          return { statusCode: 200, headers, body: JSON.stringify(result.rows) };
        }
        
        const result = await query('SELECT * FROM transactions ORDER BY created_at DESC');
        return { statusCode: 200, headers, body: JSON.stringify(result.rows) };
      }

      case 'POST': {
        const data = JSON.parse(event.body || '{}');
        const invoiceNumber = data.invoice_number || await generateInvoiceNumber();
        
        const result = await query(
          `INSERT INTO transactions (id, invoice_number, customer_id, customer_name, customer_type, total_price, discount_amount, amount_paid, status, notes, created_by, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
           RETURNING *`,
          [
            invoiceNumber,
            data.customer_id,
            data.customer_name,
            data.customer_type || 'End User',
            data.total_price || 0,
            data.discount_amount || 0,
            data.amount_paid || 0,
            data.status || 'Piutang',
            data.notes,
            data.created_by
          ]
        );
        return { statusCode: 201, headers, body: JSON.stringify(result.rows[0]) };
      }

      case 'PUT': {
        if (!id) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID required' }) };
        }
        const data = JSON.parse(event.body || '{}');
        const result = await query(
          `UPDATE transactions SET customer_id = $1, customer_name = $2, customer_type = $3, total_price = $4, discount_amount = $5, amount_paid = $6, status = $7, notes = $8, updated_at = NOW()
           WHERE id = $9 RETURNING *`,
          [data.customer_id, data.customer_name, data.customer_type, data.total_price, data.discount_amount, data.amount_paid, data.status, data.notes, id]
        );
        if (result.rows.length === 0) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Transaction not found' }) };
        }
        return { statusCode: 200, headers, body: JSON.stringify(result.rows[0]) };
      }

      case 'DELETE': {
        if (!id) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID required' }) };
        }
        // Delete related items first
        await query('DELETE FROM transaction_items WHERE transaction_id = $1', [id]);
        await query('DELETE FROM payments WHERE transaction_id = $1', [id]);
        await query('DELETE FROM transactions WHERE id = $1', [id]);
        return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
      }

      default:
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
  } catch (error) {
    console.error('Transactions error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
