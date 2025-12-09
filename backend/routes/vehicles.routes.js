// backend/routes/vehicles.routes.js
// Complete Vehicles API Routes with Year Filtering

const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');

// query() already returns { rows, rowCount, ... } so use directly
const pool = { query };

// ============================================
// GET /api/vehicles/years
// Get available years from acquired_date
// IMPORTANT: This must be BEFORE /:id route
// ============================================
router.get('/years', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT EXTRACT(YEAR FROM acquired_date)::integer as year 
            FROM vehicles 
            WHERE acquired_date IS NOT NULL 
            ORDER BY year DESC
        `;
        
        const result = await pool.query(query);
        const years = result.rows.map(r => r.year);
        
        res.json({
            success: true,
            data: years,
            count: years.length
        });
    } catch (error) {
        console.error('Error fetching vehicle years:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vehicle years'
        });
    }
});

// ============================================
// GET /api/vehicles/stats
// Get vehicle statistics with optional year filtering
// Query params: yearStart, yearEnd
// IMPORTANT: This must be BEFORE /:id route
// ============================================
router.get('/stats', async (req, res) => {
    try {
        const { yearStart, yearEnd } = req.query;
        
        // Build WHERE clause for year filtering
        let yearFilter = '';
        let yearFilterWithWhere = '';
        let yearParams = [];
        
        if (yearStart && yearEnd) {
            yearFilter = `EXTRACT(YEAR FROM acquired_date) BETWEEN $1 AND $2`;
            yearFilterWithWhere = `WHERE ${yearFilter}`;
            yearParams = [parseInt(yearStart), parseInt(yearEnd)];
        } else if (yearStart) {
            yearFilter = `EXTRACT(YEAR FROM acquired_date) >= $1`;
            yearFilterWithWhere = `WHERE ${yearFilter}`;
            yearParams = [parseInt(yearStart)];
        } else if (yearEnd) {
            yearFilter = `EXTRACT(YEAR FROM acquired_date) <= $1`;
            yearFilterWithWhere = `WHERE ${yearFilter}`;
            yearParams = [parseInt(yearEnd)];
        }

        // Total count
        const totalQuery = `SELECT COUNT(*) as total FROM vehicles ${yearFilterWithWhere}`;
        const totalResult = await pool.query(totalQuery, yearParams);
        const total = parseInt(totalResult.rows[0].total);

        // By status
        const statusQuery = `
            SELECT 
                COALESCE(status, 'ใช้งานได้') as status, 
                COUNT(*) as count 
            FROM vehicles 
            ${yearFilterWithWhere}
            GROUP BY status 
            ORDER BY count DESC
        `;
        const statusResult = await pool.query(statusQuery, yearParams);

        // By department
        const deptQuery = `
            SELECT 
                department_code, 
                COUNT(*) as count 
            FROM vehicles 
            ${yearFilterWithWhere}
            GROUP BY department_code 
            ORDER BY 
                CASE 
                    WHEN department_code ~ '^ศพฐ\\.([0-9]+)$' 
                    THEN LPAD(SUBSTRING(department_code FROM 'ศพฐ\\.([0-9]+)')::text, 3, '0')
                    ELSE department_code 
                END
        `;
        const deptResult = await pool.query(deptQuery, yearParams);

        // By vehicle type (categorized)
        const typeQuery = `
            SELECT 
                vehicle_type as category, 
                COUNT(*) as count 
            FROM vehicles 
            ${yearFilterWithWhere}
            GROUP BY vehicle_type 
            ORDER BY count DESC
        `;
        const typeResult = await pool.query(typeQuery, yearParams);

        // By department with status breakdown
        const deptStatusQuery = `
            SELECT 
                department_code,
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'ใช้งานได้' OR status IS NULL THEN 1 END) as available,
                COUNT(CASE WHEN status = 'ชำรุด' THEN 1 END) as damaged,
                COUNT(CASE WHEN status = 'รอจำหน่าย' OR status = 'อยู่ระหว่างจำหน่าย' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'จำหน่าย' THEN 1 END) as disposed
            FROM vehicles 
            ${yearFilterWithWhere}
            GROUP BY department_code 
            ORDER BY 
                CASE 
                    WHEN department_code ~ '^ศพฐ\\.([0-9]+)$' 
                    THEN LPAD(SUBSTRING(department_code FROM 'ศพฐ\\.([0-9]+)')::text, 3, '0')
                    ELSE department_code 
                END
        `;
        const deptStatusResult = await pool.query(deptStatusQuery, yearParams);

        // Get year range info
        let yearRangeQuery;
        let yearRangeParams = [];
        
        if (yearFilterWithWhere) {
            yearRangeQuery = `
                SELECT 
                    MIN(EXTRACT(YEAR FROM acquired_date))::integer as min_year,
                    MAX(EXTRACT(YEAR FROM acquired_date))::integer as max_year,
                    COUNT(DISTINCT EXTRACT(YEAR FROM acquired_date))::integer as year_count
                FROM vehicles 
                ${yearFilterWithWhere}
            `;
            yearRangeParams = yearParams;
        } else {
            yearRangeQuery = `
                SELECT 
                    MIN(EXTRACT(YEAR FROM acquired_date))::integer as min_year,
                    MAX(EXTRACT(YEAR FROM acquired_date))::integer as max_year,
                    COUNT(DISTINCT EXTRACT(YEAR FROM acquired_date))::integer as year_count
                FROM vehicles 
                WHERE acquired_date IS NOT NULL
            `;
        }
        
        const yearRangeResult = await pool.query(yearRangeQuery, yearRangeParams);
        const yearRange = yearRangeResult.rows[0];

        res.json({
            success: true,
            data: {
                total,
                byStatus: statusResult.rows,
                byDepartment: deptResult.rows,
                categorized: typeResult.rows,
                byDepartmentWithStatus: deptStatusResult.rows,
                yearRange: {
                    min: yearRange.min_year,
                    max: yearRange.max_year,
                    count: yearRange.year_count
                },
                filter: {
                    yearStart: yearStart ? parseInt(yearStart) : null,
                    yearEnd: yearEnd ? parseInt(yearEnd) : null
                }
            }
        });
    } catch (error) {
        console.error('Error fetching vehicle stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vehicle statistics'
        });
    }
});

// ============================================
// GET /api/vehicles
// Get vehicles with filters
// Query params: department, type, status, search, limit, offset, yearStart, yearEnd
// ============================================
router.get('/', async (req, res) => {
    try {
        const { 
            department, 
            type, 
            status, 
            search, 
            limit = 100, 
            offset = 0,
            yearStart,
            yearEnd
        } = req.query;
        
        let query = 'SELECT * FROM vehicles WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as total FROM vehicles WHERE 1=1';
        let params = [];
        let paramIndex = 1;
        
        // Department filter
        if (department) {
            query += ` AND department_code = $${paramIndex}`;
            countQuery += ` AND department_code = $${paramIndex}`;
            params.push(department);
            paramIndex++;
        }
        
        // Type filter
        if (type) {
            query += ` AND vehicle_type = $${paramIndex}`;
            countQuery += ` AND vehicle_type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }
        
        // Status filter
        if (status) {
            if (status === 'ใช้งานได้') {
                query += ` AND (status = $${paramIndex} OR status IS NULL)`;
                countQuery += ` AND (status = $${paramIndex} OR status IS NULL)`;
            } else {
                query += ` AND status = $${paramIndex}`;
                countQuery += ` AND status = $${paramIndex}`;
            }
            params.push(status);
            paramIndex++;
        }
        
        // Search filter (license plate, brand, model)
        if (search) {
            query += ` AND (
                license_plate ILIKE $${paramIndex} OR 
                brand ILIKE $${paramIndex} OR 
                vehicle_type ILIKE $${paramIndex} OR
                department_code ILIKE $${paramIndex}
            )`;
            countQuery += ` AND (
                license_plate ILIKE $${paramIndex} OR 
                brand ILIKE $${paramIndex} OR 
                vehicle_type ILIKE $${paramIndex} OR
                department_code ILIKE $${paramIndex}
            )`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        
        // Year filter
        if (yearStart) {
            query += ` AND EXTRACT(YEAR FROM acquired_date) >= $${paramIndex}`;
            countQuery += ` AND EXTRACT(YEAR FROM acquired_date) >= $${paramIndex}`;
            params.push(parseInt(yearStart));
            paramIndex++;
        }
        
        if (yearEnd) {
            query += ` AND EXTRACT(YEAR FROM acquired_date) <= $${paramIndex}`;
            countQuery += ` AND EXTRACT(YEAR FROM acquired_date) <= $${paramIndex}`;
            params.push(parseInt(yearEnd));
            paramIndex++;
        }
        
        // Order and pagination
        query += ` ORDER BY 
            CASE 
                WHEN department_code ~ '^ศพฐ\\.([0-9]+)$' 
                THEN LPAD(SUBSTRING(department_code FROM 'ศพฐ\\.([0-9]+)')::text, 3, '0')
                ELSE department_code 
            END,
            license_plate`;
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await pool.query(query, params);
        
        // Get total count (without limit/offset params)
        const countParams = params.slice(0, -2);
        const countResult = await pool.query(countQuery, countParams);
        
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vehicles'
        });
    }
});

// ============================================
// GET /api/vehicles/:id
// Get single vehicle by ID
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM vehicles WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Vehicle not found'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching vehicle:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vehicle'
        });
    }
});

// ============================================
// POST /api/vehicles
// Create new vehicle
// ============================================
router.post('/', async (req, res) => {
    try {
        const {
            department_code,
            vehicle_type,
            brand,
            license_plate,
            acquired_date,
            vehicle_age,
            source,
            status,
            remarks
        } = req.body;
        
        const result = await pool.query(`
            INSERT INTO vehicles (
                department_code, vehicle_type, brand, license_plate,
                acquired_date, vehicle_age, source, status, remarks,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            RETURNING *
        `, [
            department_code, vehicle_type, brand, license_plate,
            acquired_date, vehicle_age, source, status || 'ใช้งานได้', remarks
        ]);
        
        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Vehicle created successfully'
        });
    } catch (error) {
        console.error('Error creating vehicle:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create vehicle'
        });
    }
});

// ============================================
// PUT /api/vehicles/:id
// Update vehicle
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            department_code,
            vehicle_type,
            brand,
            license_plate,
            acquired_date,
            vehicle_age,
            source,
            status,
            remarks
        } = req.body;
        
        const result = await pool.query(`
            UPDATE vehicles SET
                department_code = COALESCE($1, department_code),
                vehicle_type = COALESCE($2, vehicle_type),
                brand = COALESCE($3, brand),
                license_plate = COALESCE($4, license_plate),
                acquired_date = COALESCE($5, acquired_date),
                vehicle_age = COALESCE($6, vehicle_age),
                source = COALESCE($7, source),
                status = COALESCE($8, status),
                remarks = COALESCE($9, remarks),
                updated_at = NOW()
            WHERE id = $10
            RETURNING *
        `, [
            department_code, vehicle_type, brand, license_plate,
            acquired_date, vehicle_age, source, status, remarks, id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Vehicle not found'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0],
            message: 'Vehicle updated successfully'
        });
    } catch (error) {
        console.error('Error updating vehicle:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update vehicle'
        });
    }
});

// ============================================
// DELETE /api/vehicles/:id
// Delete vehicle
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM vehicles WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Vehicle not found'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0],
            message: 'Vehicle deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting vehicle:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete vehicle'
        });
    }
});

// ============================================
// GET /api/vehicles/department/:code
// Get vehicles by department
// ============================================
router.get('/department/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const { yearStart, yearEnd } = req.query;
        
        let query = 'SELECT * FROM vehicles WHERE department_code = $1';
        let params = [code];
        let paramIndex = 2;
        
        if (yearStart) {
            query += ` AND EXTRACT(YEAR FROM acquired_date) >= $${paramIndex}`;
            params.push(parseInt(yearStart));
            paramIndex++;
        }
        
        if (yearEnd) {
            query += ` AND EXTRACT(YEAR FROM acquired_date) <= $${paramIndex}`;
            params.push(parseInt(yearEnd));
            paramIndex++;
        }
        
        query += ' ORDER BY vehicle_type, license_plate';
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching vehicles by department:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vehicles'
        });
    }
});

// ============================================
// GET /api/vehicles/type/:type
// Get vehicles by type
// ============================================
router.get('/type/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const { yearStart, yearEnd } = req.query;
        
        let query = 'SELECT * FROM vehicles WHERE vehicle_type = $1';
        let params = [type];
        let paramIndex = 2;
        
        if (yearStart) {
            query += ` AND EXTRACT(YEAR FROM acquired_date) >= $${paramIndex}`;
            params.push(parseInt(yearStart));
            paramIndex++;
        }
        
        if (yearEnd) {
            query += ` AND EXTRACT(YEAR FROM acquired_date) <= $${paramIndex}`;
            params.push(parseInt(yearEnd));
            paramIndex++;
        }
        
        query += ` ORDER BY 
            CASE 
                WHEN department_code ~ '^ศพฐ\\.([0-9]+)$' 
                THEN LPAD(SUBSTRING(department_code FROM 'ศพฐ\\.([0-9]+)')::text, 3, '0')
                ELSE department_code 
            END,
            license_plate`;
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching vehicles by type:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch vehicles'
        });
    }
});

module.exports = router;
