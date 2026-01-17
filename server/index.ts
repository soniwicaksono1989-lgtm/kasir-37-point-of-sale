import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const query = async (text: string, params?: any[]) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

app.use(cors());
app.use(express.json());

// Serve static files from the dist folder
app.use(express.static(path.join(__dirname, '../dist')));

// ===================== PRODUCTS API =====================
app.get('/api/products', async (req, res) => {
  try {
    const result = await query('SELECT * FROM products ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, category, unit, price_reseller, price_end_user, stock, is_active } = req.body;
    const result = await query(
      `INSERT INTO products (name, category, unit, price_reseller, price_end_user, stock, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, category, unit, price_reseller || 0, price_end_user || 0, stock || 0, is_active !== false]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, category, unit, price_reseller, price_end_user, stock, is_active } = req.body;
    const result = await query(
      `UPDATE products SET name = $1, category = $2, unit = $3, price_reseller = $4, 
       price_end_user = $5, stock = $6, is_active = $7, updated_at = NOW() 
       WHERE id = $8 RETURNING *`,
      [name, category, unit, price_reseller, price_end_user, stock, is_active, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ===================== CUSTOMERS API =====================
app.get('/api/customers', async (req, res) => {
  try {
    const { search } = req.query;
    let result;
    if (search) {
      result = await query(
        `SELECT * FROM customers WHERE name ILIKE $1 OR phone ILIKE $1 ORDER BY name`,
        [`%${search}%`]
      );
    } else {
      result = await query('SELECT * FROM customers ORDER BY created_at DESC');
    }
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

app.get('/api/customers/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { name, phone, address, customer_type, deposit_balance } = req.body;
    const result = await query(
      `INSERT INTO customers (name, phone, address, customer_type, deposit_balance) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, phone || null, address || null, customer_type || 'End User', deposit_balance || 0]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { name, phone, address, customer_type, deposit_balance } = req.body;
    const result = await query(
      `UPDATE customers SET name = $1, phone = $2, address = $3, customer_type = $4, 
       deposit_balance = $5, updated_at = NOW() WHERE id = $6 RETURNING *`,
      [name, phone, address, customer_type, deposit_balance, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await query('DELETE FROM customers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// ===================== TRANSACTIONS API =====================
app.get('/api/transactions', async (req, res) => {
  try {
    const { startDate, endDate, status, customerId } = req.query;
    let sql = 'SELECT * FROM transactions WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (startDate && endDate) {
      sql += ` AND created_at >= $${paramIndex} AND created_at <= $${paramIndex + 1}`;
      params.push(startDate, endDate);
      paramIndex += 2;
    }
    if (status) {
      sql += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    if (customerId) {
      sql += ` AND customer_id = $${paramIndex}`;
      params.push(customerId);
      paramIndex++;
    }
    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.get('/api/transactions/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM transactions WHERE id = $1', [req.params.id]);
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const { invoice_number, customer_id, customer_name, customer_type, total_price, discount_amount, amount_paid, status, notes, created_by } = req.body;
    const result = await query(
      `INSERT INTO transactions (invoice_number, customer_id, customer_name, customer_type, total_price, discount_amount, amount_paid, status, notes, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [invoice_number, customer_id || null, customer_name || null, customer_type || 'End User', total_price || 0, discount_amount || 0, amount_paid || 0, status || 'Lunas', notes || null, created_by || null]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

app.put('/api/transactions/:id', async (req, res) => {
  try {
    const { customer_id, customer_name, customer_type, total_price, discount_amount, amount_paid, status, notes } = req.body;
    const result = await query(
      `UPDATE transactions SET customer_id = $1, customer_name = $2, customer_type = $3, 
       total_price = $4, discount_amount = $5, amount_paid = $6, status = $7, notes = $8, updated_at = NOW() 
       WHERE id = $9 RETURNING *`,
      [customer_id, customer_name, customer_type, total_price, discount_amount, amount_paid, status, notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    await query('DELETE FROM transaction_items WHERE transaction_id = $1', [req.params.id]);
    await query('DELETE FROM payments WHERE transaction_id = $1', [req.params.id]);
    await query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// ===================== TRANSACTION ITEMS API =====================
app.get('/api/transaction-items', async (req, res) => {
  try {
    const { transaction_id } = req.query;
    if (transaction_id) {
      const result = await query(
        `SELECT ti.*, p.name as product_name, p.category, p.unit 
         FROM transaction_items ti 
         LEFT JOIN products p ON ti.product_id = p.id 
         WHERE ti.transaction_id = $1`,
        [transaction_id]
      );
      res.json(result.rows);
    } else {
      const result = await query('SELECT * FROM transaction_items ORDER BY created_at DESC');
      res.json(result.rows);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transaction items' });
  }
});

app.post('/api/transaction-items', async (req, res) => {
  try {
    const { transaction_id, product_id, custom_name, quantity, unit_price, subtotal, width, length, real_width, file_name } = req.body;
    const result = await query(
      `INSERT INTO transaction_items (transaction_id, product_id, custom_name, quantity, unit_price, subtotal, width, length, real_width, file_name) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [transaction_id, product_id || null, custom_name || null, quantity || 1, unit_price || 0, subtotal || 0, width || null, length || null, real_width || null, file_name || null]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating transaction item:', error);
    res.status(500).json({ error: 'Failed to create transaction item' });
  }
});

app.delete('/api/transaction-items', async (req, res) => {
  try {
    const { transaction_id } = req.query;
    await query('DELETE FROM transaction_items WHERE transaction_id = $1', [transaction_id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction items' });
  }
});

// ===================== PAYMENTS API =====================
app.get('/api/payments', async (req, res) => {
  try {
    const { transaction_id } = req.query;
    if (transaction_id) {
      const result = await query('SELECT * FROM payments WHERE transaction_id = $1', [transaction_id]);
      res.json(result.rows);
    } else {
      const result = await query('SELECT * FROM payments ORDER BY created_at DESC');
      res.json(result.rows);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

app.post('/api/payments', async (req, res) => {
  try {
    const { transaction_id, amount, payment_method, notes, created_by } = req.body;
    const result = await query(
      `INSERT INTO payments (transaction_id, amount, payment_method, notes, created_by) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [transaction_id, amount, payment_method || null, notes || null, created_by || null]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

app.delete('/api/payments/:id', async (req, res) => {
  try {
    await query('DELETE FROM payments WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

// ===================== EXPENSES API =====================
app.get('/api/expenses', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let result;
    if (startDate && endDate) {
      result = await query(
        'SELECT * FROM expenses WHERE expense_date >= $1 AND expense_date <= $2 ORDER BY expense_date DESC',
        [startDate, endDate]
      );
    } else {
      result = await query('SELECT * FROM expenses ORDER BY expense_date DESC');
    }
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

app.get('/api/expenses/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM expenses WHERE id = $1', [req.params.id]);
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const { description, amount, category, expense_date, created_by } = req.body;
    const result = await query(
      `INSERT INTO expenses (description, amount, category, expense_date, created_by) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [description, amount, category || null, expense_date || new Date().toISOString().split('T')[0], created_by || null]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { description, amount, category, expense_date } = req.body;
    const result = await query(
      `UPDATE expenses SET description = $1, amount = $2, category = $3, expense_date = $4, updated_at = NOW() 
       WHERE id = $5 RETURNING *`,
      [description, amount, category, expense_date, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    await query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// ===================== DEPOSIT LOGS API =====================
app.get('/api/deposit-logs', async (req, res) => {
  try {
    const { customer_id } = req.query;
    if (customer_id) {
      const result = await query('SELECT * FROM deposit_logs WHERE customer_id = $1 ORDER BY created_at DESC', [customer_id]);
      res.json(result.rows);
    } else {
      const result = await query('SELECT * FROM deposit_logs ORDER BY created_at DESC');
      res.json(result.rows);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deposit logs' });
  }
});

app.post('/api/deposit-logs', async (req, res) => {
  try {
    const { customer_id, amount, type, notes, created_by } = req.body;
    const result = await query(
      `INSERT INTO deposit_logs (customer_id, amount, type, notes, created_by) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [customer_id, amount, type || 'deposit', notes || null, created_by || null]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create deposit log' });
  }
});

// ===================== STORE SETTINGS API =====================
app.get('/api/store-settings', async (req, res) => {
  try {
    const result = await query('SELECT * FROM store_settings LIMIT 1');
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.json({
        store_name: 'Toko Saya',
        address: '',
        phone: '',
        logo_url: '',
        bank_name: '',
        bank_account_number: '',
        bank_account_name: ''
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch store settings' });
  }
});

app.put('/api/store-settings', async (req, res) => {
  try {
    const { store_name, address, phone, logo_url, bank_name, bank_account_number, bank_account_name } = req.body;
    
    // Check if settings exist
    const existing = await query('SELECT id FROM store_settings LIMIT 1');
    
    if (existing.rows.length > 0) {
      const result = await query(
        `UPDATE store_settings SET store_name = $1, address = $2, phone = $3, logo_url = $4, 
         bank_name = $5, bank_account_number = $6, bank_account_name = $7, updated_at = NOW() 
         WHERE id = $8 RETURNING *`,
        [store_name, address, phone, logo_url, bank_name, bank_account_number, bank_account_name, existing.rows[0].id]
      );
      res.json(result.rows[0]);
    } else {
      const result = await query(
        `INSERT INTO store_settings (store_name, address, phone, logo_url, bank_name, bank_account_number, bank_account_name) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [store_name, address, phone, logo_url, bank_name, bank_account_number, bank_account_name]
      );
      res.json(result.rows[0]);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update store settings' });
  }
});

// ===================== INIT DATABASE =====================
app.post('/api/init-db', async (req, res) => {
  try {
    // Create tables if they don't exist
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        unit VARCHAR(20) DEFAULT 'pcs',
        price_reseller DECIMAL(15,2) DEFAULT 0,
        price_end_user DECIMAL(15,2) DEFAULT 0,
        stock INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        customer_type VARCHAR(20) DEFAULT 'End User',
        deposit_balance DECIMAL(15,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id UUID REFERENCES customers(id),
        customer_name VARCHAR(255),
        customer_type VARCHAR(20) DEFAULT 'End User',
        total_price DECIMAL(15,2) DEFAULT 0,
        discount_amount DECIMAL(15,2) DEFAULT 0,
        amount_paid DECIMAL(15,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'Lunas',
        notes TEXT,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS transaction_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id UUID NOT NULL REFERENCES transactions(id),
        product_id UUID REFERENCES products(id),
        custom_name VARCHAR(255),
        quantity DECIMAL(15,4) DEFAULT 1,
        unit_price DECIMAL(15,2) DEFAULT 0,
        subtotal DECIMAL(15,2) DEFAULT 0,
        width DECIMAL(10,2),
        length DECIMAL(10,2),
        real_width DECIMAL(10,2),
        file_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id UUID NOT NULL REFERENCES transactions(id),
        amount DECIMAL(15,2) NOT NULL,
        payment_method VARCHAR(50),
        notes TEXT,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        category VARCHAR(100),
        expense_date DATE DEFAULT CURRENT_DATE,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS deposit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES customers(id),
        amount DECIMAL(15,2) NOT NULL,
        type VARCHAR(20) DEFAULT 'deposit',
        notes TEXT,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS store_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_name VARCHAR(255) DEFAULT 'Toko Saya',
        address TEXT,
        phone VARCHAR(50),
        logo_url TEXT,
        bank_name VARCHAR(100),
        bank_account_number VARCHAR(50),
        bank_account_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    res.json({ success: true, message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Error initializing database:', error);
    res.status(500).json({ error: 'Failed to initialize database' });
  }
});

// SPA fallback - must be last
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
