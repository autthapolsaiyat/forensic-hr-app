const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');

// Helper function สำหรับเรียงลำดับหน่วยงาน
const getHeadquartersOrder = () => `
  CASE 
    WHEN headquarters = 'ส่วนบังคับบัญชา' THEN 1
    WHEN headquarters = 'บก.อก.' THEN 2
    WHEN headquarters = 'พฐก.' THEN 3
    WHEN headquarters = 'ทว.' THEN 4
    WHEN headquarters = 'ศพฐ.1' THEN 5
    WHEN headquarters = 'ศพฐ.2' THEN 6
    WHEN headquarters = 'ศพฐ.3' THEN 7
    WHEN headquarters = 'ศพฐ.4' THEN 8
    WHEN headquarters = 'ศพฐ.5' THEN 9
    WHEN headquarters = 'ศพฐ.6' THEN 10
    WHEN headquarters = 'ศพฐ.7' THEN 11
    WHEN headquarters = 'ศพฐ.8' THEN 12
    WHEN headquarters = 'ศพฐ.9' THEN 13
    WHEN headquarters = 'ศพฐ.10' THEN 14
    WHEN headquarters = 'สฝจ.' THEN 15
    ELSE 999
  END
`;

// Helper function สำหรับเรียงลำดับแผนก/ฝ่าย (ตามไฟล์ Excel)
const getDepartmentOrder = (hq) => {
  const orderMaps = {
    'ส่วนบังคับบัญชา': {
      'กพอ.': 1,
      'ศขบ.': 2
    },
    'บก.อก.': {
      'ฝธร.': 1,
      'ฝยศ.': 2,
      'ฝกบ.': 3,
      'ฝงป.': 4,
      'ฝกม.': 5,
      'ฝทส.': 6
    },
    'พฐก.': {
      'ฝอ.': 1,
      'กสก.': 2,
      'กอส.': 3,
      'กอป.': 4,
      'กคม.': 5,
      'กยส.': 6,
      'กนฝ.': 7,
      'กชว.': 8,
      'กคพ.': 9,
      'กชช.': 10
    },
    'ทว.': {
      'ฝอ.': 1,
      'ฝทว.1': 2,
      'ฝทว.2': 3,
      'ฝทว.3': 4,
      'ฝทว.4': 5,
      'ฝทว.5': 6,
      'ฝทว.6': 7,
      'ฝทว.7': 8,
      'กชช.': 9
    },
    'สฝจ.': {
      'ฝ่ายฝึกอบรม': 1,
      'ฝ่ายพัฒนา': 2,
      'ฝ่ายปกครอง': 3,
      'กลุ่มงานมาตรฐาน': 4
    }
  };

  // ศพฐ. ทุกศูนย์ใช้รูปแบบเดียวกัน
  const sphoPattern = {
    'กคพ.': 10,
    'กคม.': 6,
    'กชช.': 11,
    'กชว.': 9,
    'กนฝ.': 8,
    'กยส.': 7,
    'กสก.': 3,
    'กอป.': 5,
    'กอส.': 4,
    'ฝอ.': 2
  };

  if (hq && hq.startsWith('ศพฐ.')) {
    return sphoPattern;
  }

  return orderMaps[hq] || {};
};

// Summary
router.get('/summary', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE vacancy_status = 'คนครอง') as occupied,
        COUNT(*) FILTER (WHERE vacancy_status = 'ตำแหน่งว่าง') as vacant,
        COUNT(*) FILTER (WHERE vacancy_status = 'ตำแหน่งว่าง' AND rank_type = 'สัญญาบัตร') as vacant_sanyabat,
        COUNT(*) FILTER (WHERE vacancy_status = 'ตำแหน่งว่าง' AND rank_type = 'ประทวน') as vacant_pratawan,
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

// Departments (รวมข้อมูลเพศด้วย + กพอ., ศขบ. เป็น main cards)
router.get('/departments', async (req, res) => {
  try {
    // ดึงข้อมูลหน่วยงานหลัก
    const mainResult = await query(`
      SELECT 
        headquarters as dept, 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE rank_type = 'สัญญาบัตร') as sanyabat,
        COUNT(*) FILTER (WHERE rank_type = 'ประทวน') as pratawan,
        COUNT(*) FILTER (WHERE vacancy_status = 'ตำแหน่งว่าง') as vacant,
        COUNT(*) FILTER (WHERE gender = 'ชาย' AND vacancy_status = 'คนครอง') as male,
        COUNT(*) FILTER (WHERE gender = 'หญิง' AND vacancy_status = 'คนครอง') as female
      FROM personnel 
      WHERE headquarters IS NOT NULL AND headquarters != 'ไม่ระบุ'
      GROUP BY headquarters 
      ORDER BY ${getHeadquartersOrder()}
    `);
    
    // ดึงข้อมูล กพอ. และ ศขบ. เป็น main cards
    const specialDepts = await query(`
      SELECT 
        department as dept,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE rank_type = 'สัญญาบัตร') as sanyabat,
        COUNT(*) FILTER (WHERE rank_type = 'ประทวน') as pratawan,
        COUNT(*) FILTER (WHERE vacancy_status = 'ตำแหน่งว่าง') as vacant,
        COUNT(*) FILTER (WHERE gender = 'ชาย' AND vacancy_status = 'คนครอง') as male,
        COUNT(*) FILTER (WHERE gender = 'หญิง' AND vacancy_status = 'คนครอง') as female
      FROM personnel
      WHERE headquarters = 'ส่วนบังคับบัญชา' 
        AND department IN ('กพอ.', 'ศขบ.')
      GROUP BY department
      ORDER BY department
    `);
    
    // รวมข้อมูล: หน่วยงานหลัก + กพอ., ศขบ.
    const allDepts = [...mainResult.rows, ...specialDepts.rows];
    
    res.json({ success: true, data: allDepts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Department detail
router.get('/department/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    // ตรวจสอบว่า name เป็น department หรือ headquarters
    const isDepartment = ['กพอ.', 'ศขบ.'].includes(name);
    
    let stats, subDepts;
    
    if (isDepartment) {
      // ถ้าเป็น department (กพอ., ศขบ.) → query WHERE department = name
      stats = await query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE vacancy_status = 'คนครอง') as occupied,
          COUNT(*) FILTER (WHERE vacancy_status = 'ตำแหน่งว่าง') as vacant,
          COUNT(*) FILTER (WHERE gender = 'ชาย' AND vacancy_status = 'คนครอง') as male,
          COUNT(*) FILTER (WHERE gender = 'หญิง' AND vacancy_status = 'คนครอง') as female,
          COUNT(*) FILTER (WHERE rank_type = 'สัญญาบัตร') as sanyabat,
          COUNT(*) FILTER (WHERE rank_type = 'ประทวน') as pratawan
        FROM personnel 
        WHERE department = $1
      `, [name]);
      
      // ไม่แสดง subdepartments สำหรับ department
      subDepts = { rows: [] };
      
    } else {
      // ถ้าเป็น headquarters → query WHERE headquarters = name
      stats = await query(`
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
      
      // Query subdepartments แต่ไม่รวม กพอ., ศขบ. (เพราะเป็น main cards แล้ว)
      const excludeCondition = name === 'ส่วนบังคับบัญชา' 
        ? "AND department NOT IN ('กพอ.', 'ศขบ.')" 
        : "";
      
      subDepts = await query(`
        SELECT 
          department as dept,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE rank_type = 'สัญญาบัตร') as sanyabat,
          COUNT(*) FILTER (WHERE rank_type = 'ประทวน') as pratawan,
          COUNT(*) FILTER (WHERE vacancy_status = 'ตำแหน่งว่าง') as vacant
        FROM personnel 
        WHERE headquarters = $1 AND department IS NOT NULL ${excludeCondition}
        GROUP BY department 
        ORDER BY department
      `, [name]);
      
      // เรียงลำดับแผนก/ฝ่ายตามที่กำหนด
      const deptOrder = getDepartmentOrder(name);
      subDepts.rows.sort((a, b) => {
        const orderA = deptOrder[a.dept] || 999;
        const orderB = deptOrder[b.dept] || 999;
        return orderA - orderB;
      });
    }
    
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
      ORDER BY ${getHeadquartersOrder()}
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
      ORDER BY ${getHeadquartersOrder()}
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
        ORDER BY department
      `, [hq.headquarters]);
      
      // เรียงลำดับแผนก/ฝ่ายตามที่กำหนด
      const deptOrder = getDepartmentOrder(hq.headquarters);
      deptResult.rows.sort((a, b) => {
        const orderA = deptOrder[a.name] || 999;
        const orderB = deptOrder[b.name] || 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });
      
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
