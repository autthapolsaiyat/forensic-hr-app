const { query } = require('./db/connection');

async function test() {
  try {
    const result = await query('SELECT COUNT(*) FROM personnel');
    console.log('✅ Connected to database');
    console.log('📊 Current records:', result.rows[0].count);
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

test();
