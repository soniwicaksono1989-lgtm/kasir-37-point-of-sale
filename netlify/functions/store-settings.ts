import { Handler } from '@netlify/functions';
import { query } from './db';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS'
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    switch (event.httpMethod) {
      case 'GET': {
        const result = await query('SELECT * FROM store_settings LIMIT 1');
        if (result.rows.length === 0) {
          // Return default settings if none exist
          return { 
            statusCode: 200, 
            headers, 
            body: JSON.stringify({
              store_name: '37 Concept',
              address: '',
              phone: '',
              logo_url: '',
              bank_name: '',
              bank_account_number: '',
              bank_account_name: ''
            }) 
          };
        }
        return { statusCode: 200, headers, body: JSON.stringify(result.rows[0]) };
      }

      case 'PUT': {
        const data = JSON.parse(event.body || '{}');
        
        // Check if settings exist
        const existing = await query('SELECT id FROM store_settings LIMIT 1');
        
        if (existing.rows.length === 0) {
          // Create new settings
          const result = await query(
            `INSERT INTO store_settings (id, store_name, address, phone, logo_url, bank_name, bank_account_number, bank_account_name, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
             RETURNING *`,
            [data.store_name, data.address, data.phone, data.logo_url, data.bank_name, data.bank_account_number, data.bank_account_name]
          );
          return { statusCode: 200, headers, body: JSON.stringify(result.rows[0]) };
        }
        
        // Update existing settings
        const result = await query(
          `UPDATE store_settings SET store_name = $1, address = $2, phone = $3, logo_url = $4, bank_name = $5, bank_account_number = $6, bank_account_name = $7, updated_at = NOW()
           WHERE id = $8 RETURNING *`,
          [data.store_name, data.address, data.phone, data.logo_url, data.bank_name, data.bank_account_number, data.bank_account_name, existing.rows[0].id]
        );
        return { statusCode: 200, headers, body: JSON.stringify(result.rows[0]) };
      }

      default:
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }
  } catch (error) {
    console.error('Store settings error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
