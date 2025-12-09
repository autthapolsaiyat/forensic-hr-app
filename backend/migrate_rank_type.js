const { query } = require('./db/connection');

async function migrate() {
  try {
    console.log('🔧 Adding rank_type column...');
    
    // เพิ่มคอลัมน์
    await query(`
      ALTER TABLE personnel 
      ADD COLUMN IF NOT EXISTS rank_type VARCHAR(50)
    `);
    console.log('✅ Column added');
    
    // อัปเดตข้อมูลเดิมตาม pattern
    console.log('🔄 Updating existing data...');
    
    await query(`
      UPDATE personnel 
      SET rank_type = 'สัญญาบัตร'
      WHERE (rank LIKE '%ร.ต.%' OR rank LIKE '%ว่าที่%')
        AND rank_type IS NULL
    `);
    
    await query(`
      UPDATE personnel 
      SET rank_type = 'ประทวน'
      WHERE (rank LIKE '%พล.ต.%' OR rank LIKE '%พ.ต.%')
        AND rank_type IS NULL
    `);
    
    console.log('✅ Data updated');
    
    // สร้าง index
    await query(`
      CREATE INDEX IF NOT EXISTS idx_rank_type ON personnel(rank_type)
    `);
    console.log('✅ Index created');
    
    // แสดงสถิติ
    const stats = await query(`
      SELECT 
        rank_type,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE vacancy_status = 'คนครอง') as occupied,
        COUNT(*) FILTER (WHERE vacancy_status = 'ตำแหน่งว่าง') as vacant
      FROM personnel
      GROUP BY rank_type
    `);
    
    console.log('\n📊 Current stats:');
    console.table(stats.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
