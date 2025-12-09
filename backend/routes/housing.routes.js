const express = require('express');
const router = express.Router();
const pool = require("../db/connection")

// =====================================================
// GET /api/housing/stats - สถิติภาพรวมที่พักอาศัย
// =====================================================
router.get('/stats', async (req, res) => {
    try {
        const { division, yearStart, yearEnd } = req.query;
        
        let conditions = [];
        let params = [];
        let paramIndex = 1;
        
        if (division) {
            conditions.push(`division = $${paramIndex++}`);
            params.push(division);
        }
        
        if (yearStart) {
            conditions.push(`budget_year >= $${paramIndex++}`);
            params.push(parseInt(yearStart));
        }
        
        if (yearEnd) {
            conditions.push(`budget_year <= $${paramIndex++}`);
            params.push(parseInt(yearEnd));
        }
        
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        // สถิติรวม
        const statsQuery = `
            SELECT 
                COUNT(*) as total_records,
                COALESCE(SUM(total_rooms), 0) as total_rooms,
                COALESCE(SUM(occupied_rooms), 0) as occupied_rooms,
                COALESCE(SUM(vacant_rooms), 0) as vacant_rooms,
                COALESCE(SUM(damaged_rooms), 0) as damaged_rooms,
                COALESCE(SUM(under_construction), 0) as under_construction,
                COALESCE(SUM(authorized_quota), 0) as total_authorized,
                COALESCE(SUM(current_occupants), 0) as total_occupants,
                COALESCE(SUM(entitled_stay), 0) as total_entitled,
                COALESCE(SUM(private_housing), 0) as total_private,
                COALESCE(SUM(rent_allowance), 0) as total_rent_allowance,
                COALESCE(SUM(other_agency), 0) as total_other_agency,
                COALESCE(SUM(shortage), 0) as total_shortage
            FROM housing
            ${whereClause}
        `;
        
        const statsResult = await pool.query(statsQuery, params);
        
        // สถิติแยกตามประเภทที่พัก
        const byTypeQuery = `
            SELECT 
                housing_type,
                COUNT(*) as count,
                COALESCE(SUM(total_rooms), 0) as total_rooms,
                COALESCE(SUM(damaged_rooms), 0) as damaged_rooms,
                COALESCE(SUM(under_construction), 0) as under_construction,
                COALESCE(SUM(entitled_stay), 0) as entitled_stay
            FROM housing
            ${whereClause}
            GROUP BY housing_type
            ORDER BY total_rooms DESC
        `;
        
        const byTypeResult = await pool.query(byTypeQuery, params);
        
        // สถิติแยกตามหน่วยงาน (division) - ใช้ whereClause สำหรับ filter ปี
        const byDivisionQuery = `
            SELECT 
                division,
                COUNT(*) as count,
                COALESCE(SUM(total_rooms), 0) as total_rooms,
                COALESCE(SUM(occupied_rooms), 0) as occupied_rooms,
                COALESCE(SUM(vacant_rooms), 0) as vacant_rooms,
                COALESCE(SUM(damaged_rooms), 0) as damaged_rooms,
                COALESCE(SUM(authorized_quota), 0) as authorized_quota,
                COALESCE(SUM(current_occupants), 0) as current_occupants,
                COALESCE(SUM(private_housing), 0) as private_housing,
                COALESCE(SUM(rent_allowance), 0) as rent_allowance,
                COALESCE(SUM(other_agency), 0) as other_agency,
                COALESCE(SUM(shortage), 0) as shortage
            FROM housing
            ${whereClause}
            GROUP BY division
            ORDER BY division
        `;
        
        const byDivisionResult = await pool.query(byDivisionQuery, params);
        
        // สถิติแยกตามปีงบประมาณ
        const byYearQuery = `
            SELECT 
                budget_year as year,
                COUNT(*) as count,
                COALESCE(SUM(total_rooms), 0) as total_rooms
            FROM housing
            WHERE budget_year IS NOT NULL
            ${conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : ''}
            GROUP BY budget_year
            ORDER BY budget_year DESC
        `;
        
        const byYearResult = await pool.query(byYearQuery, params);
        
        // นับจำนวนปีที่เลือก
        const yearsInRange = byYearResult.rows.length;
        const yearsList = byYearResult.rows.map(r => r.year);
        
        res.json({
            success: true,
            data: {
                ...statsResult.rows[0],
                byType: byTypeResult.rows,
                byDivision: byDivisionResult.rows,
                byYear: byYearResult.rows,
                yearsInRange,
                yearsList,
                filterApplied: { yearStart, yearEnd }
            }
        });
        
    } catch (error) {
        console.error('Error fetching housing stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/housing/divisions - รายชื่อหน่วยงาน
// =====================================================
router.get('/divisions', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT division 
            FROM housing 
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
// GET /api/housing/types - ประเภทที่พัก
// =====================================================
router.get('/types', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT housing_type 
            FROM housing 
            WHERE housing_type IS NOT NULL 
            ORDER BY housing_type
        `);
        
        res.json({
            success: true,
            data: result.rows.map(r => r.housing_type)
        });
    } catch (error) {
        console.error('Error fetching types:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/housing/years - ปีงบประมาณ
// =====================================================
router.get('/years', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT budget_year 
            FROM housing 
            WHERE budget_year IS NOT NULL 
            ORDER BY budget_year DESC
        `);
        
        res.json({
            success: true,
            data: result.rows.map(r => r.budget_year)
        });
    } catch (error) {
        console.error('Error fetching years:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/housing - ค้นหาที่พักอาศัย
// =====================================================
router.get('/', async (req, res) => {
    try {
        const { 
            division, 
            subdivision,
            housing_type, 
            status,
            budget_year,
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
            conditions.push(`subdivision ILIKE $${paramIndex++}`);
            params.push(`%${subdivision}%`);
        }
        
        if (housing_type) {
            conditions.push(`housing_type = $${paramIndex++}`);
            params.push(housing_type);
        }
        
        if (status) {
            conditions.push(`status = $${paramIndex++}`);
            params.push(status);
        }
        
        if (budget_year) {
            conditions.push(`budget_year = $${paramIndex++}`);
            params.push(parseInt(budget_year));
        }
        
        if (search) {
            conditions.push(`(
                housing_name ILIKE $${paramIndex} OR 
                subdivision ILIKE $${paramIndex} OR 
                division ILIKE $${paramIndex} OR
                remarks ILIKE $${paramIndex}
            )`);
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        // Count total
        const countResult = await pool.query(
            `SELECT COUNT(*) FROM housing ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);
        
        // Get data with pagination
        const offset = (page - 1) * limit;
        params.push(limit, offset);
        
        const dataResult = await pool.query(`
            SELECT * FROM housing 
            ${whereClause}
            ORDER BY division, subdivision, housing_type
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, params);
        
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
        console.error('Error fetching housing:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/housing/:id - ดูรายละเอียดที่พัก
// =====================================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM housing WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลที่พัก' });
        }
        
        res.json({ success: true, data: result.rows[0] });
        
    } catch (error) {
        console.error('Error fetching housing detail:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// POST /api/housing - เพิ่มที่พักใหม่
// =====================================================
router.post('/', async (req, res) => {
    try {
        const {
            bureau, division, subdivision,
            housing_type, housing_name, housing_code,
            total_rooms, occupied_rooms, vacant_rooms, damaged_rooms, under_construction,
            authorized_quota, current_occupants,
            entitled_stay, private_housing, rent_allowance, other_agency, shortage,
            budget_year, operation_year,
            status, address, location_lat, location_lng, remarks
        } = req.body;
        
        const result = await pool.query(`
            INSERT INTO housing (
                bureau, division, subdivision,
                housing_type, housing_name, housing_code,
                total_rooms, occupied_rooms, vacant_rooms, damaged_rooms, under_construction,
                authorized_quota, current_occupants,
                entitled_stay, private_housing, rent_allowance, other_agency, shortage,
                budget_year, operation_year,
                status, address, location_lat, location_lng, remarks
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
            ) RETURNING *
        `, [
            bureau, division, subdivision,
            housing_type, housing_name, housing_code,
            total_rooms || 0, occupied_rooms || 0, vacant_rooms || 0, damaged_rooms || 0, under_construction || 0,
            authorized_quota || 0, current_occupants || 0,
            entitled_stay || 0, private_housing || 0, rent_allowance || 0, other_agency || 0, shortage || 0,
            budget_year, operation_year,
            status || 'ใช้งานได้', address, location_lat, location_lng, remarks
        ]);
        
        res.status(201).json({ success: true, data: result.rows[0] });
        
    } catch (error) {
        console.error('Error creating housing:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// PUT /api/housing/:id - แก้ไขข้อมูลที่พัก
// =====================================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            bureau, division, subdivision,
            housing_type, housing_name, housing_code,
            total_rooms, occupied_rooms, vacant_rooms, damaged_rooms, under_construction,
            authorized_quota, current_occupants,
            entitled_stay, private_housing, rent_allowance, other_agency, shortage,
            budget_year, operation_year,
            status, address, location_lat, location_lng, remarks
        } = req.body;
        
        const result = await pool.query(`
            UPDATE housing SET
                bureau = $1, division = $2, subdivision = $3,
                housing_type = $4, housing_name = $5, housing_code = $6,
                total_rooms = $7, occupied_rooms = $8, vacant_rooms = $9, 
                damaged_rooms = $10, under_construction = $11,
                authorized_quota = $12, current_occupants = $13,
                entitled_stay = $14, private_housing = $15, rent_allowance = $16, 
                other_agency = $17, shortage = $18,
                budget_year = $19, operation_year = $20,
                status = $21, address = $22, location_lat = $23, location_lng = $24, 
                remarks = $25, updated_at = CURRENT_TIMESTAMP
            WHERE id = $26
            RETURNING *
        `, [
            bureau, division, subdivision,
            housing_type, housing_name, housing_code,
            total_rooms, occupied_rooms, vacant_rooms, damaged_rooms, under_construction,
            authorized_quota, current_occupants,
            entitled_stay, private_housing, rent_allowance, other_agency, shortage,
            budget_year, operation_year,
            status, address, location_lat, location_lng, remarks,
            id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลที่พัก' });
        }
        
        res.json({ success: true, data: result.rows[0] });
        
    } catch (error) {
        console.error('Error updating housing:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// DELETE /api/housing/:id - ลบข้อมูลที่พัก
// =====================================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM housing WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลที่พัก' });
        }
        
        res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
        
    } catch (error) {
        console.error('Error deleting housing:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// POST /api/housing/import - Import จาก Excel
// =====================================================
router.post('/import', async (req, res) => {
    try {
        const { data } = req.body;
        
        if (!data || !Array.isArray(data)) {
            return res.status(400).json({ success: false, error: 'ข้อมูลไม่ถูกต้อง' });
        }
        
        let imported = 0;
        let errors = [];
        
        for (const row of data) {
            try {
                await pool.query(`
                    INSERT INTO housing (
                        bureau, division, subdivision,
                        housing_type, total_rooms, damaged_rooms,
                        authorized_quota, current_occupants,
                        entitled_stay, private_housing, rent_allowance, shortage,
                        budget_year, remarks
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                `, [
                    row.bureau || 'สพฐ.ตร.',
                    row.division,
                    row.subdivision,
                    row.housing_type,
                    row.total_rooms || 0,
                    row.damaged_rooms || 0,
                    row.authorized_quota || 0,
                    row.current_occupants || 0,
                    row.entitled_stay || 0,
                    row.private_housing || 0,
                    row.rent_allowance || 0,
                    row.shortage || 0,
                    row.budget_year,
                    row.remarks
                ]);
                imported++;
            } catch (err) {
                errors.push({ row, error: err.message });
            }
        }
        
        res.json({
            success: true,
            message: `นำเข้าข้อมูลสำเร็จ ${imported} รายการ`,
            imported,
            errors: errors.length > 0 ? errors : undefined
        });
        
    } catch (error) {
        console.error('Error importing housing:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
