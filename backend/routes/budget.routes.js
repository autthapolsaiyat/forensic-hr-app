const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

// =====================================================
// GET /api/budget/stats - สถิติภาพรวมงบลงทุน
// =====================================================
router.get('/stats', async (req, res) => {
    try {
        const { yearStart, yearEnd, division } = req.query;
        
        let conditions = [];
        let params = [];
        let paramIndex = 1;
        
        if (yearStart) {
            conditions.push(`fiscal_year_start >= $${paramIndex++}`);
            params.push(parseInt(yearStart));
        }
        
        if (yearEnd) {
            conditions.push(`fiscal_year_end <= $${paramIndex++}`);
            params.push(parseInt(yearEnd));
        }
        
        if (division) {
            conditions.push(`division = $${paramIndex++}`);
            params.push(division);
        }
        
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        // สถิติรวม
        const statsQuery = `
            SELECT 
                COUNT(*) as total_records,
                COUNT(CASE WHEN status_group = 'signed' THEN 1 END) as total_signed,
                COUNT(CASE WHEN status_group != 'signed' OR status_group IS NULL THEN 1 END) as total_pending,
                COUNT(CASE WHEN budget_type = 'งบปีเดียว' THEN 1 END) as total_single_year,
                COUNT(CASE WHEN budget_type = 'งบผูกพัน' THEN 1 END) as total_multi_year,
                COUNT(CASE WHEN project_type = 'โครงการ' THEN 1 END) as total_project,
                COUNT(CASE WHEN project_type = 'รายการ' THEN 1 END) as total_item,
                COALESCE(SUM(CASE WHEN status_group = 'signed' THEN contract_amount ELSE 0 END), 0) as total_signed_amount,
                COALESCE(SUM(contract_amount), 0) as total_amount
            FROM budget
            ${whereClause}
        `;
        
        const statsResult = await pool.query(statsQuery, params);
        
        // สถิติแยกตามหน่วยงาน
        const byDivisionQuery = `
            SELECT 
                division,
                COUNT(*) as count,
                COUNT(CASE WHEN status_group = 'signed' THEN 1 END) as signed_count,
                COALESCE(SUM(CASE WHEN status_group = 'signed' THEN contract_amount ELSE 0 END), 0) as signed_amount,
                COALESCE(SUM(contract_amount), 0) as total_amount
            FROM budget
            ${whereClause}
            GROUP BY division
            ORDER BY count DESC
        `;
        
        const byDivisionResult = await pool.query(byDivisionQuery, params);
        
        // สถิติแยกตามสถานะ
        const byStatusQuery = `
            SELECT 
                status,
                status_group,
                COUNT(*) as count,
                COALESCE(SUM(contract_amount), 0) as amount
            FROM budget
            ${whereClause}
            GROUP BY status, status_group
            ORDER BY count DESC
        `;
        
        const byStatusResult = await pool.query(byStatusQuery, params);
        
        // สถิติแยกตามประเภทงบ
        const byBudgetTypeQuery = `
            SELECT 
                budget_type,
                COUNT(*) as count,
                COALESCE(SUM(contract_amount), 0) as amount
            FROM budget
            ${whereClause}
            GROUP BY budget_type
            ORDER BY count DESC
        `;
        
        const byBudgetTypeResult = await pool.query(byBudgetTypeQuery, params);
        
        // สถิติแยกตามลักษณะงาน
        const byProjectTypeQuery = `
            SELECT 
                project_type,
                COUNT(*) as count,
                COALESCE(SUM(contract_amount), 0) as amount
            FROM budget
            ${whereClause}
            GROUP BY project_type
            ORDER BY count DESC
        `;
        
        const byProjectTypeResult = await pool.query(byProjectTypeQuery, params);
        
        // รายการปีงบประมาณ
        const yearsQuery = `
            SELECT DISTINCT fiscal_year_start as year
            FROM budget
            WHERE fiscal_year_start IS NOT NULL
            ${conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : ''}
            ORDER BY year DESC
        `;
        
        const yearsResult = await pool.query(yearsQuery, params);
        
        res.json({
            success: true,
            data: {
                ...statsResult.rows[0],
                byDivision: byDivisionResult.rows,
                byStatus: byStatusResult.rows,
                byBudgetType: byBudgetTypeResult.rows,
                byProjectType: byProjectTypeResult.rows,
                yearsInRange: yearsResult.rows.length,
                yearsList: yearsResult.rows.map(r => r.year),
                filterApplied: { yearStart, yearEnd, division }
            }
        });
        
    } catch (error) {
        console.error('Error fetching budget stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/budget/divisions - รายชื่อหน่วยงาน
// =====================================================
router.get('/divisions', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT division 
            FROM budget 
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
// GET /api/budget/categories - หมวดงาน
// =====================================================
router.get('/categories', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT category 
            FROM budget 
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
// GET /api/budget/years - ปีงบประมาณ
// =====================================================
router.get('/years', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT fiscal_year_start as year
            FROM budget 
            WHERE fiscal_year_start IS NOT NULL 
            ORDER BY year DESC
        `);
        
        res.json({
            success: true,
            data: result.rows.map(r => r.year)
        });
    } catch (error) {
        console.error('Error fetching years:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/budget/statuses - สถานะ
// =====================================================
router.get('/statuses', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT status, status_group
            FROM budget 
            WHERE status IS NOT NULL 
            ORDER BY status
        `);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching statuses:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/budget - ค้นหารายการงบลงทุน
// =====================================================
router.get('/', async (req, res) => {
    try {
        const { 
            division, 
            category,
            project_type, 
            status,
            status_group,
            budget_type,
            yearStart,
            yearEnd,
            contractor,
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
        
        if (category) {
            conditions.push(`category = $${paramIndex++}`);
            params.push(category);
        }
        
        if (project_type) {
            conditions.push(`project_type = $${paramIndex++}`);
            params.push(project_type);
        }
        
        if (status) {
            conditions.push(`status ILIKE $${paramIndex++}`);
            params.push(`%${status}%`);
        }
        
        if (status_group) {
            conditions.push(`status_group = $${paramIndex++}`);
            params.push(status_group);
        }
        
        if (budget_type) {
            conditions.push(`budget_type = $${paramIndex++}`);
            params.push(budget_type);
        }
        
        if (yearStart) {
            conditions.push(`fiscal_year_start >= $${paramIndex++}`);
            params.push(parseInt(yearStart));
        }
        
        if (yearEnd) {
            conditions.push(`fiscal_year_end <= $${paramIndex++}`);
            params.push(parseInt(yearEnd));
        }
        
        if (contractor) {
            conditions.push(`contractor ILIKE $${paramIndex++}`);
            params.push(`%${contractor}%`);
        }
        
        if (search) {
            conditions.push(`(project_name ILIKE $${paramIndex} OR contractor ILIKE $${paramIndex} OR division ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Count total
        const countQuery = `SELECT COUNT(*) as total, COALESCE(SUM(contract_amount), 0) as total_amount FROM budget ${whereClause}`;
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total);
        const totalAmount = parseFloat(countResult.rows[0].total_amount);
        
        // Get data
        const dataQuery = `
            SELECT * FROM budget 
            ${whereClause}
            ORDER BY id DESC
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
                totalPages: Math.ceil(total / limit),
                totalAmount
            }
        });
        
    } catch (error) {
        console.error('Error fetching budget:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/budget/:id - รายละเอียดงบลงทุน
// =====================================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM budget WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
        }
        
        res.json({ success: true, data: result.rows[0] });
        
    } catch (error) {
        console.error('Error fetching budget detail:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// POST /api/budget - เพิ่มรายการใหม่
// =====================================================
router.post('/', async (req, res) => {
    try {
        const {
            division, category, project_name, project_type,
            status, status_group, contract_amount,
            fiscal_year, fiscal_year_start, fiscal_year_end, budget_type,
            contract_date, end_date, installments, contractor,
            progress, remarks
        } = req.body;
        
        const result = await pool.query(`
            INSERT INTO budget (
                division, category, project_name, project_type,
                status, status_group, contract_amount,
                fiscal_year, fiscal_year_start, fiscal_year_end, budget_type,
                contract_date, end_date, installments, contractor,
                progress, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *
        `, [
            division, category, project_name, project_type,
            status, status_group, contract_amount,
            fiscal_year, fiscal_year_start, fiscal_year_end, budget_type,
            contract_date, end_date, installments, contractor,
            progress, remarks
        ]);
        
        res.status(201).json({ success: true, data: result.rows[0] });
        
    } catch (error) {
        console.error('Error creating budget:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// PUT /api/budget/:id - แก้ไขข้อมูล
// =====================================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            division, category, project_name, project_type,
            status, status_group, contract_amount,
            fiscal_year, fiscal_year_start, fiscal_year_end, budget_type,
            contract_date, end_date, installments, contractor,
            progress, remarks
        } = req.body;
        
        const result = await pool.query(`
            UPDATE budget SET
                division = $1, category = $2, project_name = $3, project_type = $4,
                status = $5, status_group = $6, contract_amount = $7,
                fiscal_year = $8, fiscal_year_start = $9, fiscal_year_end = $10, budget_type = $11,
                contract_date = $12, end_date = $13, installments = $14, contractor = $15,
                progress = $16, remarks = $17, updated_at = CURRENT_TIMESTAMP
            WHERE id = $18
            RETURNING *
        `, [
            division, category, project_name, project_type,
            status, status_group, contract_amount,
            fiscal_year, fiscal_year_start, fiscal_year_end, budget_type,
            contract_date, end_date, installments, contractor,
            progress, remarks, id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
        }
        
        res.json({ success: true, data: result.rows[0] });
        
    } catch (error) {
        console.error('Error updating budget:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// DELETE /api/budget/:id - ลบข้อมูล
// =====================================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM budget WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'ไม่พบข้อมูล' });
        }
        
        res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
        
    } catch (error) {
        console.error('Error deleting budget:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
