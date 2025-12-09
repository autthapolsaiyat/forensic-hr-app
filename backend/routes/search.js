const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');

router.get('/', async (req, res) => {
  try {
    const { q, headquarters, gender, vacancy_status } = req.query;
    
    let conditions = [];
    let params = [];
    let paramCount = 1;
    
    if (q) {
      conditions.push(`(full_name ILIKE $${paramCount} OR position ILIKE $${paramCount} OR rank ILIKE $${paramCount})`);
      params.push(`%${q}%`);
      paramCount++;
    }
    
    if (headquarters) {
      conditions.push(`headquarters = $${paramCount}`);
      params.push(headquarters);
      paramCount++;
    }
    
    if (gender) {
      conditions.push(`gender = $${paramCount}`);
      params.push(gender);
      paramCount++;
    }
    
    if (vacancy_status) {
      conditions.push(`vacancy_status = $${paramCount}`);
      params.push(vacancy_status);
      paramCount++;
    }
    
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    
    const result = await query(`
      SELECT full_name, rank, position, headquarters, department, gender, vacancy_status
      FROM personnel
      ${whereClause}
      ORDER BY full_name
      LIMIT 100
    `, params);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
