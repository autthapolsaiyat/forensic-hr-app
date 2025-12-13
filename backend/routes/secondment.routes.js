const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

// GET /api/secondment - รายการไปช่วยราชการทั้งหมด
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM secondment ORDER BY id
        `);
        res.json({ success: true, data: result.rows, total: result.rows.length });
    } catch (error) {
        console.error('Secondment error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/secondment/stats - สถิติไปช่วยราชการ
router.get('/stats', async (req, res) => {
    try {
        // Total count
        const totalResult = await pool.query('SELECT COUNT(*) as total FROM secondment');
        
        // By gender
        const genderResult = await pool.query(`
            SELECT gender, COUNT(*) as count 
            FROM secondment 
            GROUP BY gender
        `);
        
        // By origin unit
        const originResult = await pool.query(`
            SELECT origin_unit, COUNT(*) as count 
            FROM secondment 
            GROUP BY origin_unit 
            ORDER BY count DESC
        `);
        
        // By destination unit
        const destResult = await pool.query(`
            SELECT destination_unit, COUNT(*) as count 
            FROM secondment 
            GROUP BY destination_unit 
            ORDER BY count DESC
        `);
        
        // By note type (ช่วยราชการ vs มอบหมายหน้าที่)
        const noteResult = await pool.query(`
            SELECT note, COUNT(*) as count 
            FROM secondment 
            GROUP BY note
        `);

        const genderMap = {};
        genderResult.rows.forEach(r => genderMap[r.gender] = parseInt(r.count));

        res.json({
            success: true,
            data: {
                total: parseInt(totalResult.rows[0].total),
                male: genderMap['ชาย'] || 0,
                female: genderMap['หญิง'] || 0,
                by_origin: originResult.rows,
                by_destination: destResult.rows,
                by_note: noteResult.rows
            }
        });
    } catch (error) {
        console.error('Secondment stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/secondment/summary - สรุปสำหรับ Dashboard
router.get('/summary', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE gender = 'ชาย' OR gender IS NULL) as male,
                COUNT(*) FILTER (WHERE gender = 'หญิง') as female,
                COUNT(*) FILTER (WHERE note = 'ช่วยราชการ') as secondment_type,
                COUNT(*) FILTER (WHERE note = 'มอบหมายหน้าที่') as assignment_type
            FROM secondment
        `);
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Secondment summary error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
