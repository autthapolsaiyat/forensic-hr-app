const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'forensic-hr-db.postgres.database.azure.com',
  port: 5432,
  database: 'forensic_hr',
  user: 'forensicadmin',
  password: 'ForensicHR2025!Strong',
  ssl: { rejectUnauthorized: false }
});

async function createAdmin() {
  console.log('🔐 Creating admin user...\n');
  
  try {
    const hashedPassword = await bcrypt.hash('Admin@2025', 10);
    
    // ใช้ password_hash ตาม schema
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, email, full_name, role, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW())
       ON CONFLICT (username) DO UPDATE 
       SET password_hash = EXCLUDED.password_hash,
           email = EXCLUDED.email,
           is_active = true
       RETURNING id, username, email, role`,
      ['admin', hashedPassword, 'admin@forensic.go.th', 'ผู้ดูแลระบบ', 'admin']
    );

    console.log('✅ Admin user created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Username: admin');
    console.log('Password: Admin@2025');
    console.log('Email:    admin@forensic.go.th');
    console.log('Role:     admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createAdmin();
