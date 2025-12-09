const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { logger } = require('../middleware/logger');

// Get all personnel - ดึงข้อมูลทั้งหมด
router.get('/', authenticate, logger('view', 'personnel'), async (req, res) => {
    try {
        const { department, rank, status, search, limit = 1000, offset = 0 } = req.query;

        let sqlQuery = 'SELECT * FROM personnel WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        // Filter by department
        if (department && department !== 'all') {
            sqlQuery += ` AND department = $${paramIndex}`;
            params.push(department);
            paramIndex++;
        }

        // Filter by rank
        if (rank) {
            sqlQuery += ` AND rank = $${paramIndex}`;
            params.push(rank);
            paramIndex++;
        }

        // Filter by status
        if (status) {
            sqlQuery += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        // Search
        if (search) {
            sqlQuery += ` AND (
                full_name ILIKE $${paramIndex} OR 
                first_name ILIKE $${paramIndex} OR 
                last_name ILIKE $${paramIndex} OR 
                position ILIKE $${paramIndex} OR
                department ILIKE $${paramIndex}
            )`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        sqlQuery += ` ORDER BY id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await query(sqlQuery, params);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error('Get personnel error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
});

// Get personnel by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            'SELECT * FROM personnel WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูล'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Get personnel by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
        });
    }
});

// Get statistics - สถิติ
router.get('/stats/summary', authenticate, logger('view', 'stats'), async (req, res) => {
    try {
        const { department } = req.query;

        let whereClause = '1=1';
        const params = [];

        if (department && department !== 'all') {
            whereClause = 'department = $1';
            params.push(department);
        }

        // สถิติหลัก
        const mainStats = await query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'คนครอง') as occupied,
                COUNT(*) FILTER (WHERE status = 'ตำแหน่งว่าง') as vacant,
                COUNT(*) FILTER (WHERE gender = 'ชาย') as male,
                COUNT(*) FILTER (WHERE gender = 'หญิง') as female
            FROM personnel
            WHERE ${whereClause}
        `, params);

        // สถิติตามยศ
        const rankStats = await query(`
            SELECT rank, COUNT(*) as count
            FROM personnel
            WHERE ${whereClause} AND rank IS NOT NULL
            GROUP BY rank
            ORDER BY count DESC
            LIMIT 10
        `, params);

        // สถิติตามสังกัด
        const deptStats = await query(`
            SELECT department, COUNT(*) as count
            FROM personnel
            WHERE ${whereClause} AND department IS NOT NULL
            GROUP BY department
            ORDER BY count DESC
            LIMIT 10
        `, params);

        const stats = mainStats.rows[0];

        res.json({
            success: true,
            data: {
                total: parseInt(stats.total),
                occupied: parseInt(stats.occupied),
                vacant: parseInt(stats.vacant),
                male: parseInt(stats.male),
                female: parseInt(stats.female),
                occupiedPercent: stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0,
                vacantPercent: stats.total > 0 ? Math.round((stats.vacant / stats.total) * 100) : 0,
                byRank: rankStats.rows.reduce((acc, row) => {
                    acc[row.rank] = parseInt(row.count);
                    return acc;
                }, {}),
                bySangkat: deptStats.rows.reduce((acc, row) => {
                    acc[row.department] = parseInt(row.count);
                    return acc;
                }, {})
            }
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงสถิติ'
        });
    }
});

// Get departments list - รายการสังกัด
router.get('/departments/list', authenticate, async (req, res) => {
    try {
        const result = await query(`
            SELECT DISTINCT department 
            FROM personnel 
            WHERE department IS NOT NULL AND department != ''
            ORDER BY department
        `);

        res.json({
            success: true,
            data: result.rows.map(row => row.department)
        });

    } catch (error) {
        console.error('Get departments error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงรายการสังกัด'
        });
    }
});

module.exports = router;
