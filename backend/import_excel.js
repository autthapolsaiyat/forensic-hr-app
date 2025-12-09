const XLSX = require('xlsx');
const { query, getClient } = require('./db/connection');

// พิกัดจริงของแต่ละหน่วยงาน
function getCoordinates(headquarters) {
  const coords = {
    'สพฐ.ตร.': { lat: 13.744954783434084, lng: 100.53607075357132 },
    'ทว.': { lat: 13.743474663279548, lng: 100.53791312473577 },
    'พฐก.': { lat: 13.744923518649601, lng: 100.5360063805579 },
    'สฝจ.': { lat: 13.744965205027995, lng: 100.53602783822903 },
    'บก.อก.': { lat: 13.744903404881452, lng: 100.53617370348023 },
    'ศพฐ.1': { lat: 14.086724535348978, lng: 100.61748691124835 },
    'ศพฐ.2': { lat: 13.359722342136367, lng: 100.9821307805515 },
    'ศพฐ.3': { lat: 15.039252580896889, lng: 102.13639950756752 },
    'ศพฐ.4': { lat: 16.452610533313244, lng: 102.82083910759494 },
    'ศพฐ.5': { lat: 18.298711413229217, lng: 99.49283729599023 },
    'ศพฐ.6': { lat: 16.84476997061663, lng: 100.25778586712323 },
    'ศพฐ.7': { lat: 13.765064366376409, lng: 100.05641562473605 },
    'ศพฐ.8': { lat: 9.11373572588828, lng: 99.22722813816331 },
    'ศพฐ.9': { lat: 7.004260119623432, lng: 100.3061735958133 },
    'ศพฐ.10': { lat: 6.533593531576763, lng: 101.28182576697367 }
  };
  
  return coords[headquarters] || { lat: null, lng: null };
}

async function importExcel(filePath) {
  console.log('📂 Reading Excel file...');
  const workbook = XLSX.readFile(filePath);
  
  const sanyabatSheet = workbook.Sheets['สัญญาบัตร (2)'] || workbook.Sheets['สัญญาบัตร'];
  const pratawanSheet = workbook.Sheets['ประทวน (2)'] || workbook.Sheets['ประทวน'];
  
  if (!sanyabatSheet || !pratawanSheet) {
    throw new Error('ไม่พบ sheet ที่ต้องการ');
  }
  
  const sanyabatData = XLSX.utils.sheet_to_json(sanyabatSheet);
  const pratawanData = XLSX.utils.sheet_to_json(pratawanSheet);
  
  console.log(`📊 สัญญาบัตร: ${sanyabatData.length} แถว`);
  console.log(`📊 ประทวน: ${pratawanData.length} แถว`);
  
  console.log('🗑️ Deleting old data...');
  await query('DELETE FROM personnel');
  console.log('✅ Old data cleared');
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    let inserted = 0;
    const batchSize = 100;
    let values = [];
    
    async function insertBatch() {
      if (values.length === 0) return;
      
      const placeholders = [];
      for (let i = 0; i < values.length; i += 10) {
        const params = [];
        for (let j = 0; j < 10; j++) {
          params.push(`$${i + j + 1}`);
        }
        placeholders.push(`(${params.join(', ')})`);
      }
      
      await client.query(`
        INSERT INTO personnel (
          rank, gender, full_name, position, headquarters, department,
          vacancy_status, rank_type, latitude, longitude
        ) VALUES ${placeholders.join(', ')}
      `, values);
      
      inserted += values.length / 10;
      console.log(`📝 Inserted ${inserted} records...`);
      values = [];
    }
    
    // Import สัญญาบัตร
    console.log('\n📥 Importing สัญญาบัตร...');
    for (const row of sanyabatData) {
      const fullName = row['ชื่อ-นามสกุล'] || '';
      const vacancyStatus = row['ว่าง'] === 'ว่าง' ? 'ตำแหน่งว่าง' : 'คนครอง';
      const headquarters = row['บก.'] || 'ไม่ระบุ';
      const department = row['สังกัด'] || null;
      
      const { lat, lng } = getCoordinates(headquarters);
      
      values.push(
        row['ยศ'] || null,
        row['เพศ'] || null,
        fullName,
        row['ชื่อตำแหน่ง'] || null,
        headquarters,
        department,
        vacancyStatus,
        'สัญญาบัตร',
        lat,
        lng
      );
      
      if (values.length >= batchSize * 10) {
        await insertBatch();
      }
    }
    
    if (values.length > 0) await insertBatch();
    
    // Import ประทวน
    console.log('\n📥 Importing ประทวน...');
    for (const row of pratawanData) {
      const fullName = row['ชื่อ-นามสกุล'] || '';
      let vacancyStatus = 'คนครอง';
      if (fullName === 'ตำแหน่งว่าง' || row['ว่าง'] === 'ว่าง') {
        vacancyStatus = 'ตำแหน่งว่าง';
      }
      
      const headquarters = row['บก.'] || 'ไม่ระบุ';
      const department = row['สังกัด'] || null;
      
      const { lat, lng } = getCoordinates(headquarters);
      
      values.push(
        row['ยศ'] || null,
        row['เพศ'] || null,
        fullName,
        row['ชื่อตำแหน่ง'] || null,
        headquarters,
        department,
        vacancyStatus,
        'ประทวน',
        lat,
        lng
      );
      
      if (values.length >= batchSize * 10) {
        await insertBatch();
      }
    }
    
    if (values.length > 0) await insertBatch();
    
    await client.query('COMMIT');
    console.log(`\n✅ Imported ${inserted} records successfully`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  
  const stats = await query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE vacancy_status = 'คนครอง') as occupied,
      COUNT(*) FILTER (WHERE vacancy_status = 'ตำแหน่งว่าง') as vacant,
      COUNT(*) FILTER (WHERE rank_type = 'สัญญาบัตร') as sanyabat,
      COUNT(*) FILTER (WHERE rank_type = 'ประทวน') as pratawan
    FROM personnel
  `);
  
  console.log('\n📊 สถิติหลัง Import:');
  console.table(stats.rows);
  
  const coordStats = await query(`
    SELECT 
      headquarters,
      latitude,
      longitude,
      COUNT(*) as count
    FROM personnel
    WHERE latitude IS NOT NULL
    GROUP BY headquarters, latitude, longitude
    ORDER BY headquarters
  `);
  
  console.log('\n🗺️ พิกัดแต่ละหน่วยงาน:');
  console.table(coordStats.rows);
}

if (require.main === module) {
  const filePath = process.argv[2] || './data.xlsx';
  importExcel(filePath)
    .then(() => {
      console.log('✅ Import completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Import failed:', err);
      process.exit(1);
    });
}

module.exports = { importExcel };
