const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

// =====================================================
// GET /api/weapons/stats - สถิติภาพรวมยุทธภัณฑ์
// =====================================================
router.get('/stats', async (req, res) => {
    try {
        const { division } = req.query;
        
        let whereClause = '';
        let params = [];
        
        if (division) {
            whereClause = 'WHERE division = $1';
            params = [division];
        }
        
        // สถิติรวมตามประเภทย่อย (subcategory)
        const statsQuery = `
            SELECT 
                subcategory,
                caliber,
                unit,
                SUM(total_quantity) as total,
                SUM(usable_quantity) as usable,
                SUM(damaged_quantity) as damaged,
                SUM(disposed_quantity) as disposed,
                SUM(additional_need) as need
            FROM weapons
            ${whereClause}
            GROUP BY subcategory, caliber, unit
            ORDER BY subcategory, caliber
        `;
        
        const statsResult = await pool.query(statsQuery, params);
        
        // สถิติรวมทั้งหมด
        const totalQuery = `
            SELECT 
                SUM(total_quantity) as total,
                SUM(usable_quantity) as usable,
                SUM(damaged_quantity) as damaged,
                SUM(disposed_quantity) as disposed
            FROM weapons
            ${whereClause}
        `;
        const totalResult = await pool.query(totalQuery, params);
        
        // สถิติแยกตามหน่วยงาน
        const byDivisionQuery = `
            SELECT 
                division,
                SUM(total_quantity) as total,
                SUM(usable_quantity) as usable,
                SUM(damaged_quantity) as damaged,
                COUNT(DISTINCT subcategory) as item_types
            FROM weapons
            ${whereClause}
            GROUP BY division
            ORDER BY division
        `;
        const byDivisionResult = await pool.query(byDivisionQuery, params);
        
        res.json({
            success: true,
            data: {
                summary: totalResult.rows[0],
                bySubcategory: statsResult.rows,
                byDivision: byDivisionResult.rows
            }
        });
        
    } catch (error) {
        console.error('Error fetching weapons stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/weapons/categories - ประเภทยุทธภัณฑ์
// =====================================================
router.get('/categories', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT category 
            FROM weapons 
            WHERE category IS NOT NULL 
            ORDER BY category
        `);
        
        res.json({
            success: true,
            data: result.rows.map(r => r.category)
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/weapons/subcategories - ประเภทย่อย
// =====================================================
router.get('/subcategories', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT subcategory, caliber, unit,
                SUM(total_quantity) as total,
                SUM(usable_quantity) as usable,
                SUM(damaged_quantity) as damaged,
                SUM(disposed_quantity) as disposed
            FROM weapons 
            WHERE subcategory IS NOT NULL 
            GROUP BY subcategory, caliber, unit
            ORDER BY subcategory, caliber
        `);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching subcategories:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/weapons/divisions - หน่วยงาน
// =====================================================
router.get('/divisions', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT division 
            FROM weapons 
            WHERE division IS NOT NULL 
            ORDER BY division
        `);
        
        res.json({
            success: true,
            data: result.rows.map(r => r.division)
        });
    } catch (error) {
        console.error('Error fetching divisions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/weapons/by-subcategory/:subcategory - รายการตามประเภทย่อย
// =====================================================
router.get('/by-subcategory/:subcategory', async (req, res) => {
    try {
        const { subcategory } = req.params;
        const { caliber } = req.query;
        
        let query = `
            SELECT * FROM weapons 
            WHERE subcategory = $1
        `;
        let params = [subcategory];
        
        if (caliber) {
            query += ' AND caliber = $2';
            params.push(caliber);
        }
        
        query += ' ORDER BY division, item_name';
        
        const result = await pool.query(query, params);
        
        // สถิติสรุป
        const statsQuery = `
            SELECT 
                SUM(total_quantity) as total,
                SUM(usable_quantity) as usable,
                SUM(damaged_quantity) as damaged,
                SUM(disposed_quantity) as disposed,
                SUM(additional_need) as need
            FROM weapons 
            WHERE subcategory = $1
            ${caliber ? 'AND caliber = $2' : ''}
        `;
        const statsResult = await pool.query(statsQuery, params);
        
        res.json({
            success: true,
            data: result.rows,
            stats: statsResult.rows[0],
            total: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching weapons by subcategory:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/weapons/by-division/:division - รายการตามหน่วยงาน
// =====================================================
router.get('/by-division/:division', async (req, res) => {
    try {
        const { division } = req.params;
        
        const result = await pool.query(`
            SELECT * FROM weapons 
            WHERE division = $1
            ORDER BY subcategory, item_name
        `, [division]);
        
        // สถิติสรุป
        const statsQuery = `
            SELECT 
                subcategory,
                caliber,
                unit,
                SUM(total_quantity) as total,
                SUM(usable_quantity) as usable,
                SUM(damaged_quantity) as damaged,
                SUM(additional_need) as need
            FROM weapons 
            WHERE division = $1
            GROUP BY subcategory, caliber, unit
            ORDER BY subcategory
        `;
        const statsResult = await pool.query(statsQuery, [division]);
        
        res.json({
            success: true,
            data: result.rows,
            bySubcategory: statsResult.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching weapons by division:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/weapons - ค้นหายุทธภัณฑ์
// =====================================================
router.get('/', async (req, res) => {
    try {
        const { 
            category,
            subcategory,
            division,
            caliber,
            search,
            page = 1, 
            limit = 20 
        } = req.query;
        
        let conditions = [];
        let params = [];
        let paramIndex = 1;
        
        if (category) {
            conditions.push(`category = $${paramIndex++}`);
            params.push(category);
        }
        
        if (subcategory) {
            conditions.push(`subcategory = $${paramIndex++}`);
            params.push(subcategory);
        }
        
        if (division) {
            conditions.push(`division = $${paramIndex++}`);
            params.push(division);
        }
        
        if (caliber) {
            conditions.push(`caliber = $${paramIndex++}`);
            params.push(caliber);
        }
        
        if (search) {
            conditions.push(`(item_name ILIKE $${paramIndex} OR brand ILIKE $${paramIndex} OR model ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Count total
        const countQuery = `SELECT COUNT(*) as total FROM weapons ${whereClause}`;
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total);
        
        // Get data
        const dataQuery = `
            SELECT * FROM weapons 
            ${whereClause}
            ORDER BY subcategory, division, item_name
            LIMIT $${paramIndex++} OFFSET $${paramIndex}
        `;
        params.push(parseInt(limit), offset);
        
        const dataResult = await pool.query(dataQuery, params);
        
        res.json({
            success: true,
            data: dataResult.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error fetching weapons:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/weapons/:id - รายละเอียด
// =====================================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM weapons WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
        }
        
        res.json({ success: true, data: result.rows[0] });
        
    } catch (error) {
        console.error('Error fetching weapon detail:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// POST /api/weapons - เพิ่มรายการใหม่
// =====================================================
router.post('/', async (req, res) => {
    try {
        const {
            category, subcategory,
            item_name, brand, model, caliber, unit,
            total_quantity, usable_quantity, damaged_quantity, lost_quantity, disposed_quantity,
            priority, priority_text, service_life, additional_need,
            division, remarks, source
        } = req.body;
        
        const result = await pool.query(`
            INSERT INTO weapons (
                category, subcategory,
                item_name, brand, model, caliber, unit,
                total_quantity, usable_quantity, damaged_quantity, lost_quantity, disposed_quantity,
                priority, priority_text, service_life, additional_need,
                division, remarks, source
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            RETURNING *
        `, [
            category, subcategory,
            item_name, brand, model, caliber, unit,
            total_quantity || 0, usable_quantity || 0, damaged_quantity || 0, lost_quantity || 0, disposed_quantity || 0,
            priority, priority_text, service_life, additional_need || 0,
            division, remarks, source
        ]);
        
        res.status(201).json({ success: true, data: result.rows[0] });
        
    } catch (error) {
        console.error('Error creating weapon:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// PUT /api/weapons/:id - แก้ไขข้อมูล
// =====================================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            category, subcategory,
            item_name, brand, model, caliber, unit,
            total_quantity, usable_quantity, damaged_quantity, lost_quantity, disposed_quantity,
            priority, priority_text, service_life, additional_need,
            division, remarks, source
        } = req.body;
        
        const result = await pool.query(`
            UPDATE weapons SET
                category = $1, subcategory = $2,
                item_name = $3, brand = $4, model = $5, caliber = $6, unit = $7,
                total_quantity = $8, usable_quantity = $9, damaged_quantity = $10, 
                lost_quantity = $11, disposed_quantity = $12,
                priority = $13, priority_text = $14, service_life = $15, additional_need = $16,
                division = $17, remarks = $18, source = $19,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $20
            RETURNING *
        `, [
            category, subcategory,
            item_name, brand, model, caliber, unit,
            total_quantity, usable_quantity, damaged_quantity, lost_quantity, disposed_quantity,
            priority, priority_text, service_life, additional_need,
            division, remarks, source, id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
        }
        
        res.json({ success: true, data: result.rows[0] });
        
    } catch (error) {
        console.error('Error updating weapon:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// DELETE /api/weapons/:id - ลบข้อมูล
// =====================================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM weapons WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
        }
        
        res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
        
    } catch (error) {
        console.error('Error deleting weapon:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
