const { query } = require('./db/connection');

async function check() {
  try {
    console.log('📊 Checking results...\n');
    
    const result = await query(`
      SELECT 
        'ทั้งหมด' as label, COUNT(*) as count 
      FROM personnel
      UNION ALL
      SELECT 'คนครอง', COUNT(*) 
      FROM personnel WHERE vacancy_status = 'คนครอง'
      UNION ALL
      SELECT 'ตำแหน่งว่าง', COUNT(*) 
      FROM personnel WHERE vacancy_status = 'ตำแหน่งว่าง'
      UNION ALL
      SELECT 'สัญญาบัตร', COUNT(*) 
      FROM personnel WHERE rank_type = 'สัญญาบัตร'
      UNION ALL
      SELECT 'ประทวน', COUNT(*) 
      FROM personnel WHERE rank_type = 'ประทวน'
      UNION ALL
      SELECT 'ชาย', COUNT(*) 
      FROM personnel WHERE gender = 'ชาย' AND vacancy_status = 'คนครอง'
      UNION ALL
      SELECT 'หญิง', COUNT(*) 
      FROM personnel WHERE gender = 'หญิง' AND vacancy_status = 'คนครอง'
    `);
    
    console.table(result.rows);
    
    console.log('\n🎯 ควรจะได้ตามนี้จาก Excel:');
    console.log('ทั้งหมด:        4,601');
    console.log('คนครอง:        3,348');
    console.log('ตำแหน่งว่าง:    1,253');
    console.log('สัญญาบัตร:      2,053');
    console.log('ประทวน:        2,548');
    console.log('ชาย:           1,600');
    console.log('หญิง:          1,716');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Check failed:', error);
    process.exit(1);
  }
}

check();
