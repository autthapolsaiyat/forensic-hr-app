const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

// Helper function to get connection
async function getConnection() {
    return pool.connect ? await pool.connect() : pool;
}

// GET /api/equipment/years - Get available years (MUST be before /:id)
router.get('/years', async (req, res) => {
    let client;
    try {
        client = await getConnection();
        const result = await client.query(`
            SELECT DISTINCT acquired_year 
            FROM equipment 
            WHERE acquired_year IS NOT NULL 
            ORDER BY acquired_year DESC
        `);
        res.json({ 
            success: true, 
            data: result.rows.map(r => r.acquired_year) 
        });
    } catch (error) {
        console.error('Error fetching years:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (client && client.release) client.release();
    }
});

// GET /api/equipment/stats - Get statistics (MUST be before /:id)
router.get('/stats', async (req, res) => {
    let client;
    try {
        client = await getConnection();
        const { year, yearStart, yearEnd } = req.query;
        
        let yearCondition = '';
        const params = [];
        
        if (year && year !== 'all') {
            if (year.includes('-')) {
                const [start, end] = year.split('-');
                yearCondition = ' WHERE acquired_year >= $1 AND acquired_year <= $2';
                params.push(parseInt(start), parseInt(end));
            } else {
                yearCondition = ' WHERE acquired_year = $1';
                params.push(parseInt(year));
            }
        } else if (yearStart || yearEnd) {
            const conditions = [];
            if (yearStart) {
                params.push(parseInt(yearStart));
                conditions.push(`acquired_year >= $${params.length}`);
            }
            if (yearEnd) {
                params.push(parseInt(yearEnd));
                conditions.push(`acquired_year <= $${params.length}`);
            }
            if (conditions.length > 0) {
                yearCondition = ' WHERE ' + conditions.join(' AND ');
            }
        }
        
        // Total counts
        const totalResult = await client.query(`
            SELECT 
                COUNT(*) as total_items,
                COALESCE(SUM(quantity), COUNT(*)) as total_quantity,
                COUNT(*) FILTER (WHERE status = 'ใช้งานได้' OR status IS NULL) as available,
                COUNT(*) FILTER (WHERE status = 'ชำรุด') as damaged,
                COUNT(*) FILTER (WHERE status = 'รอจำหน่าย') as pending,
                COUNT(*) FILTER (WHERE status = 'จำหน่าย') as disposed
            FROM equipment ${yearCondition}
        `, params);

        // By category
        const categoryResult = await client.query(`
            SELECT category, COUNT(*) as count, COALESCE(SUM(quantity), COUNT(*)) as total_qty
            FROM equipment ${yearCondition}
            ${yearCondition ? 'AND' : 'WHERE'} category IS NOT NULL
            GROUP BY category
            ORDER BY count DESC
        `.replace('WHERE  AND', 'WHERE'), params);

        // By unit
        const unitResult = await client.query(`
            SELECT unit, COUNT(*) as count, COALESCE(SUM(quantity), COUNT(*)) as total_qty
            FROM equipment ${yearCondition}
            ${yearCondition ? 'AND' : 'WHERE'} unit IS NOT NULL
            GROUP BY unit
            ORDER BY count DESC
        `.replace('WHERE  AND', 'WHERE'), params);

        // By year
        const yearResult = await client.query(`
            SELECT acquired_year as year, COUNT(*) as count
            FROM equipment
            WHERE acquired_year IS NOT NULL
            GROUP BY acquired_year
            ORDER BY acquired_year DESC
        `);

        const stats = totalResult.rows[0];
        
        res.json({
            success: true,
            data: {
                totalItems: parseInt(stats.total_items),
                totalQuantity: parseInt(stats.total_quantity),
                available: parseInt(stats.available),
                damaged: parseInt(stats.damaged),
                pending: parseInt(stats.pending),
                disposed: parseInt(stats.disposed || 0),
                byCategory: categoryResult.rows,
                byUnit: unitResult.rows,
                byYear: yearResult.rows
            }
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (client && client.release) client.release();
    }
});

// GET /api/equipment - Get equipment list with filters
router.get('/', async (req, res) => {
    let client;
    try {
        client = await getConnection();
        
        const { search, category, unit, status, year, yearStart, yearEnd, limit = 100, offset = 0 } = req.query;
        
        let query = 'SELECT * FROM equipment WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        // Text search
        if (search) {
            query += ` AND (item_name ILIKE $${paramIndex} OR equipment_code ILIKE $${paramIndex} OR remarks ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Category filter
        if (category) {
            query += ` AND category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        // Unit filter
        if (unit) {
            query += ` AND unit = $${paramIndex}`;
            params.push(unit);
            paramIndex++;
        }

        // Status filter
        if (status) {
            if (status === 'ใช้งานได้') {
                query += ` AND (status = $${paramIndex} OR status IS NULL)`;
            } else {
                query += ` AND status = $${paramIndex}`;
            }
            params.push(status);
            paramIndex++;
        }

        // Year filter (single year or range)
        if (year && year !== 'all') {
            if (year.includes('-')) {
                const [start, end] = year.split('-');
                query += ` AND acquired_year >= $${paramIndex} AND acquired_year <= $${paramIndex + 1}`;
                params.push(parseInt(start), parseInt(end));
                paramIndex += 2;
            } else {
                query += ` AND acquired_year = $${paramIndex}`;
                params.push(parseInt(year));
                paramIndex++;
            }
        } else {
            // Year range filters
            if (yearStart) {
                query += ` AND acquired_year >= $${paramIndex}`;
                params.push(parseInt(yearStart));
                paramIndex++;
            }

            if (yearEnd) {
                query += ` AND acquired_year <= $${paramIndex}`;
                params.push(parseInt(yearEnd));
                paramIndex++;
            }
        }

        query += ` ORDER BY id ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await client.query(query, params);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching equipment:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (client && client.release) client.release();
    }
});

// GET /api/equipment/:id - Get single equipment (MUST be after /years and /stats)
router.get('/:id', async (req, res) => {
    let client;
    try {
        client = await getConnection();
        const { id } = req.params;
        
        // Check if id is numeric
        if (isNaN(parseInt(id))) {
            return res.status(400).json({ success: false, message: 'Invalid ID' });
        }
        
        const result = await client.query('SELECT * FROM equipment WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching equipment:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (client && client.release) client.release();
    }
});

// POST /api/equipment - Create new equipment
router.post('/', async (req, res) => {
    let client;
    try {
        client = await getConnection();
        const { 
            sequence_no, bureau, division, unit, item_name, 
            equipment_code, acquired_year, quantity, photo_url, 
            remarks, status, category 
        } = req.body;

        const result = await client.query(`
            INSERT INTO equipment 
            (sequence_no, bureau, division, unit, item_name, equipment_code, 
             acquired_year, quantity, photo_url, remarks, status, category)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [sequence_no, bureau, division, unit, item_name, equipment_code, 
            acquired_year, quantity || 1, photo_url, remarks, status || 'ใช้งานได้', category]);

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating equipment:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (client && client.release) client.release();
    }
});

// PUT /api/equipment/:id - Update equipment
router.put('/:id', async (req, res) => {
    let client;
    try {
        client = await getConnection();
        const { id } = req.params;
        const { 
            sequence_no, bureau, division, unit, item_name, 
            equipment_code, acquired_year, quantity, photo_url, 
            remarks, status, category 
        } = req.body;

        const result = await client.query(`
            UPDATE equipment SET
                sequence_no = COALESCE($1, sequence_no),
                bureau = COALESCE($2, bureau),
                division = COALESCE($3, division),
                unit = COALESCE($4, unit),
                item_name = COALESCE($5, item_name),
                equipment_code = COALESCE($6, equipment_code),
                acquired_year = COALESCE($7, acquired_year),
                quantity = COALESCE($8, quantity),
                photo_url = COALESCE($9, photo_url),
                remarks = COALESCE($10, remarks),
                status = COALESCE($11, status),
                category = COALESCE($12, category),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $13
            RETURNING *
        `, [sequence_no, bureau, division, unit, item_name, equipment_code, 
            acquired_year, quantity, photo_url, remarks, status, category, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating equipment:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (client && client.release) client.release();
    }
});

// DELETE /api/equipment/:id - Delete equipment
router.delete('/:id', async (req, res) => {
    let client;
    try {
        client = await getConnection();
        const { id } = req.params;
        
        const result = await client.query('DELETE FROM equipment WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Not found' });
        }

        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        console.error('Error deleting equipment:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (client && client.release) client.release();
    }
});

module.exports = router;
