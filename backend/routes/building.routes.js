const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

// =====================================================
// GET /api/building/stats - สถิติภาพรวมอาคาร
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
        
        // สถิติรวม
        const statsQuery = `
            SELECT 
                COUNT(*) as total_records,
                COUNT(CASE WHEN subdivision IS NULL OR subdivision = '' THEN 1 END) as hq_count,
                COUNT(CASE WHEN subdivision IS NOT NULL AND subdivision != '' THEN 1 END) as branch_count,
                COUNT(CASE WHEN ownership_status = 'has_building' THEN 1 END) as has_building,
                COUNT(CASE WHEN ownership_status = 'use_other' THEN 1 END) as use_other,
                COUNT(CASE WHEN ownership_status = 'wait_budget' THEN 1 END) as wait_budget,
                COUNT(CASE WHEN ownership_status = 'finding_land' THEN 1 END) as finding_land
            FROM building
            ${whereClause}
        `;
        
        const statsResult = await pool.query(statsQuery, params);
        
        // สถิติกองบังคับการ (ไม่มี พฐ.จว.)
        const hqQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status IN ('ใช้การได้', 'ใช้งานได้') THEN 1 END) as active
            FROM building
            WHERE (subdivision IS NULL OR subdivision = '')
            ${division ? 'AND division = $1' : ''}
        `;
        const hqResult = await pool.query(hqQuery, params);
        
        // สถิติ พฐ.จว. (มี subdivision)
        const branchQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN ownership_status = 'has_building' THEN 1 END) as has_building,
                COUNT(CASE WHEN ownership_status = 'use_other' THEN 1 END) as use_other,
                COUNT(CASE WHEN ownership_status = 'wait_budget' THEN 1 END) as wait_budget,
                COUNT(CASE WHEN ownership_status = 'finding_land' THEN 1 END) as finding_land
            FROM building
            WHERE subdivision IS NOT NULL AND subdivision != ''
            ${division ? 'AND division = $1' : ''}
        `;
        const branchResult = await pool.query(branchQuery, params);
        
        // สถิติแยกตามหน่วยงาน (division)
        const byDivisionQuery = `
            SELECT 
                division,
                COUNT(*) as total,
                COUNT(CASE WHEN subdivision IS NULL OR subdivision = '' THEN 1 END) as hq_count,
                COUNT(CASE WHEN subdivision IS NOT NULL AND subdivision != '' THEN 1 END) as branch_count,
                COUNT(CASE WHEN ownership_status = 'has_building' THEN 1 END) as has_building,
                COUNT(CASE WHEN ownership_status = 'use_other' THEN 1 END) as use_other,
                COUNT(CASE WHEN ownership_status = 'wait_budget' THEN 1 END) as wait_budget,
                COUNT(CASE WHEN ownership_status = 'finding_land' THEN 1 END) as finding_land
            FROM building
            ${whereClause}
            GROUP BY division
            ORDER BY division
        `;
        const byDivisionResult = await pool.query(byDivisionQuery, params);
        
        // นับจำนวน พฐ.จว. ทั้งหมด (unique subdivisions)
        const totalBranchesQuery = `
            SELECT COUNT(DISTINCT subdivision) as total_branches
            FROM building
            WHERE subdivision IS NOT NULL AND subdivision != ''
        `;
        const totalBranchesResult = await pool.query(totalBranchesQuery);
        
        res.json({
            success: true,
            data: {
                ...statsResult.rows[0],
                hq: hqResult.rows[0],
                branch: branchResult.rows[0],
                total_branches: parseInt(totalBranchesResult.rows[0].total_branches),
                byDivision: byDivisionResult.rows
            }
        });
        
    } catch (error) {
        console.error('Error fetching building stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/building/divisions - รายชื่อหน่วยงาน (บก.)
// =====================================================
router.get('/divisions', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT division 
            FROM building 
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
// GET /api/building/subdivisions - รายชื่อ พฐ.จว.
// =====================================================
router.get('/subdivisions', async (req, res) => {
    try {
        const { division } = req.query;
        
        let query = `
            SELECT DISTINCT subdivision 
            FROM building 
            WHERE subdivision IS NOT NULL AND subdivision != ''
        `;
        let params = [];
        
        if (division) {
            query += ' AND division = $1';
            params = [division];
        }
        
        query += ' ORDER BY subdivision';
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            data: result.rows.map(r => r.subdivision)
        });
    } catch (error) {
        console.error('Error fetching subdivisions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/building/provinces - จังหวัด
// =====================================================
router.get('/provinces', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT province 
            FROM building 
            WHERE province IS NOT NULL 
            ORDER BY province
        `);
        
        res.json({
            success: true,
            data: result.rows.map(r => r.province)
        });
    } catch (error) {
        console.error('Error fetching provinces:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/building/hq - อาคารกองบังคับการ
// =====================================================
router.get('/hq', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM building 
            WHERE subdivision IS NULL OR subdivision = ''
            ORDER BY division, building_name
        `);
        
        res.json({
            success: true,
            data: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching HQ buildings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/building/branches/:division - พฐ.จว. ในสังกัด
// =====================================================
router.get('/branches/:division', async (req, res) => {
    try {
        const { division } = req.params;
        
        const result = await pool.query(`
            SELECT * FROM building 
            WHERE division = $1 
            AND subdivision IS NOT NULL AND subdivision != ''
            ORDER BY subdivision, building_name
        `, [division]);
        
        // สถิติสรุป
        const statsQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN ownership_status = 'has_building' THEN 1 END) as has_building,
                COUNT(CASE WHEN ownership_status = 'use_other' THEN 1 END) as use_other,
                COUNT(CASE WHEN ownership_status = 'wait_budget' THEN 1 END) as wait_budget,
                COUNT(CASE WHEN ownership_status = 'finding_land' THEN 1 END) as finding_land
            FROM building 
            WHERE division = $1 
            AND subdivision IS NOT NULL AND subdivision != ''
        `;
        const statsResult = await pool.query(statsQuery, [division]);
        
        res.json({
            success: true,
            data: result.rows,
            stats: statsResult.rows[0],
            total: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching branch buildings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/building - ค้นหาอาคาร
// =====================================================
router.get('/', async (req, res) => {
    try {
        const { 
            division, 
            subdivision,
            province,
            status,
            ownership_status,
            search,
            page = 1, 
            limit = 20 
        } = req.query;
        
        let conditions = [];
        let params = [];
        let paramIndex = 1;
        
        if (division) {
            conditions.push(`division = $${paramIndex++}`);
            params.push(division);
        }
        
        if (subdivision) {
            conditions.push(`subdivision = $${paramIndex++}`);
            params.push(subdivision);
        }
        
        if (province) {
            conditions.push(`province = $${paramIndex++}`);
            params.push(province);
        }
        
        if (status) {
            conditions.push(`status = $${paramIndex++}`);
            params.push(status);
        }
        
        if (ownership_status) {
            conditions.push(`ownership_status = $${paramIndex++}`);
            params.push(ownership_status);
        }
        
        if (search) {
            conditions.push(`(building_name ILIKE $${paramIndex} OR subdivision ILIKE $${paramIndex} OR division ILIKE $${paramIndex} OR province ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Count total
        const countQuery = `SELECT COUNT(*) as total FROM building ${whereClause}`;
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total);
        
        // Get data
        const dataQuery = `
            SELECT * FROM building 
            ${whereClause}
            ORDER BY division, subdivision, building_name
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
        console.error('Error fetching buildings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/building/:id - รายละเอียดอาคาร
// =====================================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM building WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
        }
        
        res.json({ success: true, data: result.rows[0] });
        
    } catch (error) {
        console.error('Error fetching building detail:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// POST /api/building - เพิ่มอาคารใหม่
// =====================================================
router.post('/', async (req, res) => {
    try {
        const {
            bureau, division, subdivision,
            building_name, building_count, building_size, building_type,
            budget_year, operation_year, building_age,
            status, ownership_status,
            land_type, land_doc_number, land_area,
            subdistrict, district, province,
            location_lat, location_lng,
            master_plan_url, remarks
        } = req.body;
        
        const result = await pool.query(`
            INSERT INTO building (
                bureau, division, subdivision,
                building_name, building_count, building_size, building_type,
                budget_year, operation_year, building_age,
                status, ownership_status,
                land_type, land_doc_number, land_area,
                subdistrict, district, province,
                location_lat, location_lng,
                master_plan_url, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
            RETURNING *
        `, [
            bureau, division, subdivision,
            building_name, building_count || 1, building_size, building_type,
            budget_year, operation_year, building_age,
            status, ownership_status,
            land_type, land_doc_number, land_area,
            subdistrict, district, province,
            location_lat, location_lng,
            master_plan_url, remarks
        ]);
        
        res.status(201).json({ success: true, data: result.rows[0] });
        
    } catch (error) {
        console.error('Error creating building:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// PUT /api/building/:id - แก้ไขข้อมูล
// =====================================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            bureau, division, subdivision,
            building_name, building_count, building_size, building_type,
            budget_year, operation_year, building_age,
            status, ownership_status,
            land_type, land_doc_number, land_area,
            subdistrict, district, province,
            location_lat, location_lng,
            master_plan_url, remarks
        } = req.body;
        
        const result = await pool.query(`
            UPDATE building SET
                bureau = $1, division = $2, subdivision = $3,
                building_name = $4, building_count = $5, building_size = $6, building_type = $7,
                budget_year = $8, operation_year = $9, building_age = $10,
                status = $11, ownership_status = $12,
                land_type = $13, land_doc_number = $14, land_area = $15,
                subdistrict = $16, district = $17, province = $18,
                location_lat = $19, location_lng = $20,
                master_plan_url = $21, remarks = $22,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $23
            RETURNING *
        `, [
            bureau, division, subdivision,
            building_name, building_count, building_size, building_type,
            budget_year, operation_year, building_age,
            status, ownership_status,
            land_type, land_doc_number, land_area,
            subdistrict, district, province,
            location_lat, location_lng,
            master_plan_url, remarks, id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
        }
        
        res.json({ success: true, data: result.rows[0] });
        
    } catch (error) {
        console.error('Error updating building:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// DELETE /api/building/:id - ลบข้อมูล
// =====================================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM building WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
        }
        
        res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
        
    } catch (error) {
        console.error('Error deleting building:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
