const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');

// Summary
router.get('/summary', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE vacancy_status = 'คนครอง') as occupied,
        COUNT(*) FILTER (WHERE vacancy_status = 'ตำแหน่งว่าง') as vacant,
        COUNT(*) FILTER (WHERE gender = 'ชาย' AND vacancy_status = 'คนครอง') as male,
        COUNT(*) FILTER (WHERE gender = 'หญิง' AND vacancy_status = 'คนครอง') as female,
        COUNT(*) FILTER (WHERE rank_type = 'ประทวน') as pratawan,
        COUNT(*) FILTER (WHERE rank_type = 'สัญญาบัตร') as sanyabat
      FROM personnel
      WHERE headquarters != 'ไม่ระบุ'
    `);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Departments
router.get('/departments', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        headquarters as dept, 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE rank_type = 'สัญญาบัตร') as sanyabat,
        COUNT(*) FILTER (WHERE rank_type = 'ประทวน') as pratawan,
        COUNT(*) FILTER (WHERE vacancy_status = 'ตำแหน่งว่าง') as vacant
      FROM personnel 
      WHERE headquarters IS NOT NULL AND headquarters != 'ไม่ระบุ'
      GROUP BY headquarters 
      ORDER BY 
        CASE 
          WHEN headquarters = 'บก.อก.' THEN 0
          WHEN headquarters = 'สพฐ.ตร.' THEN 1
          ELSE 2
        END,
        headquarters
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Department detail
router.get('/department/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const stats = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE vacancy_status = 'คนครอง') as occupied,
        COUNT(*) FILTER (WHERE vacancy_status = 'ตำแหน่งว่าง') as vacant,
        COUNT(*) FILTER (WHERE gender = 'ชาย' AND vacancy_status = 'คนครอง') as male,
        COUNT(*) FILTER (WHERE gender = 'หญิง' AND vacancy_status = 'คนครอง') as female,
        COUNT(*) FILTER (WHERE rank_type = 'สัญญาบัตร') as sanyabat,
        COUNT(*) FILTER (WHERE rank_type = 'ประทวน') as pratawan
      FROM personnel 
      WHERE headquarters = $1
    `, [name]);
    
    const subDepts = await query(`
      SELECT 
        department as dept,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE rank_type = 'สัญญาบัตร') as sanyabat,
        COUNT(*) FILTER (WHERE rank_type = 'ประทวน') as pratawan
      FROM personnel 
      WHERE headquarters = $1 AND department IS NOT NULL 
      GROUP BY department 
      ORDER BY department
    `, [name]);
    
    res.json({ success: true, stats: stats.rows[0], subDepartments: subDepts.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Map data
router.get('/map', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        headquarters as name,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE rank_type = 'สัญญาบัตร') as sanyabat,
        COUNT(*) FILTER (WHERE rank_type = 'ประทวน') as pratawan,
        COUNT(*) FILTER (WHERE gender = 'ชาย' AND vacancy_status = 'คนครอง') as male,
        COUNT(*) FILTER (WHERE gender = 'หญิง' AND vacancy_status = 'คนครอง') as female,
        COUNT(*) FILTER (WHERE vacancy_status = 'ตำแหน่งว่าง') as vacant,
        COUNT(*) FILTER (WHERE vacancy_status = 'คนครอง') as occupied,
        MAX(latitude) as lat,
        MAX(longitude) as lng
      FROM personnel 
      WHERE headquarters IS NOT NULL 
        AND headquarters != 'ไม่ระบุ'
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL 
      GROUP BY headquarters 
      ORDER BY headquarters
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Vacancies by department
router.get('/vacancies/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const result = await query(`
      SELECT rank, position, department, full_name, headquarters 
      FROM personnel 
      WHERE headquarters = $1 
        AND vacancy_status = 'ตำแหน่งว่าง' 
      ORDER BY department, position
      LIMIT 100
    `, [name]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Organization structure
router.get('/organization', async (req, res) => {
  try {
    const hqResult = await query(`
      SELECT 
        headquarters,
        COUNT(DISTINCT department) as dept_count,
        COUNT(*) as total
      FROM personnel
      WHERE headquarters IS NOT NULL AND headquarters != 'ไม่ระบุ'
      GROUP BY headquarters
      ORDER BY 
        CASE 
          WHEN headquarters = 'บก.อก.' THEN 0
          WHEN headquarters = 'สพฐ.ตร.' THEN 1
          WHEN headquarters = 'พฐก.' THEN 2
          WHEN headquarters = 'ทว.' THEN 3
          WHEN headquarters = 'สฝจ.' THEN 4
          ELSE 5
        END,
        headquarters
    `);
    
    const organization = [];
    
    for (const hq of hqResult.rows) {
      const deptResult = await query(`
        SELECT 
          department as name,
          COUNT(*) as count
        FROM personnel
        WHERE headquarters = $1 AND department IS NOT NULL
        GROUP BY department
        ORDER BY count DESC
      `, [hq.headquarters]);
      
      organization.push({
        headquarters: hq.headquarters,
        total: parseInt(hq.total),
        dept_count: parseInt(hq.dept_count),
        departments: deptResult.rows.map(d => ({
          name: d.name,
          count: parseInt(d.count)
        }))
      });
    }
    
    res.json({ success: true, data: organization });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
