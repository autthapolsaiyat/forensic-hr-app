const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');

// Get activity logs - ดึง logs (Admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { user_id, action, limit = 100, offset = 0 } = req.query;

        let sqlQuery = `
            SELECT 
                l.id,
                l.user_id,
                u.username,
                u.full_name,
                l.action,
                l.target,
                l.details,
                l.ip_address,
                l.created_at
            FROM activity_logs l
            LEFT JOIN users u ON l.user_id = u.id
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        if (user_id) {
            sqlQuery += ` AND l.user_id = $${paramIndex}`;
            params.push(user_id);
            paramIndex++;
        }

        if (action) {
            sqlQuery += ` AND l.action = $${paramIndex}`;
            params.push(action);
            paramIndex++;
        }

        sqlQuery += ` ORDER BY l.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await query(sqlQuery, params);

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึง logs'
        });
    }
});

// Get logs statistics
router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
    try {
        const stats = await query(`
            SELECT 
                COUNT(*) as total_logs,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(*) FILTER (WHERE action = 'login') as login_count,
                COUNT(*) FILTER (WHERE action = 'view') as view_count,
                COUNT(*) FILTER (WHERE action = 'export') as export_count,
                COUNT(*) FILTER (WHERE action = 'import') as import_count
            FROM activity_logs
            WHERE created_at >= NOW() - INTERVAL '7 days'
        `);

        // Top users
        const topUsers = await query(`
            SELECT 
                u.username,
                u.full_name,
                COUNT(*) as activity_count
            FROM activity_logs l
            JOIN users u ON l.user_id = u.id
            WHERE l.created_at >= NOW() - INTERVAL '7 days'
            GROUP BY u.username, u.full_name
            ORDER BY activity_count DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                summary: stats.rows[0],
                topUsers: topUsers.rows
            }
        });

    } catch (error) {
        console.error('Get logs stats error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงสถิติ logs'
        });
    }
});

module.exports = router;
