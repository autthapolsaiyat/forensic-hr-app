const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const authRoutes = require('./auth.routes');
const bcrypt = require('bcrypt');

const verifyToken = authRoutes.verifyToken;
const superAdminOnly = authRoutes.superAdminOnly;
const logActivity = authRoutes.logActivity;

// =====================================================
// GET /api/admin/stats - สถิติภาพรวม
// =====================================================
router.get('/stats', verifyToken, superAdminOnly, async (req, res) => {
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'active') as active,
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE status = 'locked') as locked,
                COUNT(*) FILTER (WHERE status = 'expired') as expired,
                COUNT(*) FILTER (WHERE expire_date IS NOT NULL AND expire_date <= CURRENT_DATE + INTERVAL '7 days' AND expire_date > CURRENT_DATE) as expiring
            FROM users
            WHERE role != 'super_admin'
        `);

        const online = await pool.query(`
            SELECT COUNT(*) as count FROM user_sessions WHERE expires_at > NOW()
        `);

        res.json({
            success: true,
            data: {
                total: parseInt(stats.rows[0].total),
                active: parseInt(stats.rows[0].active),
                pending: parseInt(stats.rows[0].pending),
                locked: parseInt(stats.rows[0].locked),
                expired: parseInt(stats.rows[0].expired),
                expiring: parseInt(stats.rows[0].expiring),
                online: parseInt(online.rows[0].count)
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/admin/users - รายการผู้ใช้
// =====================================================
router.get('/users', verifyToken, superAdminOnly, async (req, res) => {
    try {
        const { page = 1, limit = 10, search, division, status } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = "WHERE role != 'super_admin'";
        const params = [];
        let paramIndex = 1;

        if (search) {
            whereClause += ` AND (full_name ILIKE $${paramIndex} OR position ILIKE $${paramIndex} OR username ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (division) {
            whereClause += ` AND division = $${paramIndex}`;
            params.push(division);
            paramIndex++;
        }

        if (status) {
            whereClause += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM users ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        const usersResult = await pool.query(
            `SELECT id, username, full_name, rank, position, division, subdivision, phone, email, 
                    role, status, expire_date, last_login, created_at
             FROM users ${whereClause}
             ORDER BY created_at DESC
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: usersResult.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/admin/divisions - รายการหน่วยงาน
// =====================================================
router.get('/divisions', verifyToken, superAdminOnly, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT division FROM users 
            WHERE division IS NOT NULL AND division != ''
            ORDER BY division
        `);
        res.json({ success: true, data: result.rows.map(r => r.division) });
    } catch (error) {
        console.error('Get divisions error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// PUT /api/admin/users/:id - อัพเดทผู้ใช้
// =====================================================
router.put('/users/:id', verifyToken, superAdminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const { action, expireDate, days } = req.body;

        let query = '';
        let params = [];
        let message = '';

        switch (action) {
            case 'approve':
                const expireDays = days || 90;
                query = `UPDATE users SET status = 'active', expire_date = CURRENT_DATE + INTERVAL '${expireDays} days', updated_at = NOW() WHERE id = $1`;
                params = [id];
                message = 'อนุมัติสำเร็จ';
                break;

            case 'reject':
                query = `UPDATE users SET status = 'rejected', updated_at = NOW() WHERE id = $1`;
                params = [id];
                message = 'ปฏิเสธสำเร็จ';
                break;

            case 'lock':
                query = `UPDATE users SET status = 'locked', updated_at = NOW() WHERE id = $1`;
                params = [id];
                message = 'ล็อกบัญชีสำเร็จ';
                break;

            case 'unlock':
                query = `UPDATE users SET status = 'active', login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = $1`;
                params = [id];
                message = 'ปลดล็อกสำเร็จ';
                break;

            case 'save':
                if (expireDate) {
                    query = `UPDATE users SET expire_date = $1, updated_at = NOW() WHERE id = $2`;
                    params = [expireDate, id];
                    message = 'บันทึกสำเร็จ';
                } else {
                    return res.status(400).json({ success: false, error: 'กรุณาระบุวันหมดอายุ' });
                }
                break;

            default:
                return res.status(400).json({ success: false, error: 'Action ไม่ถูกต้อง' });
        }

        await pool.query(query, params);
        await logActivity(req.user.id, `user_${action}`, 'user', parseInt(id), { action }, req);

        res.json({ success: true, message });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// POST /api/admin/users/:id/reset-password - รีเซ็ตรหัสผ่าน
// =====================================================
router.post('/users/:id/reset-password', verifyToken, superAdminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ 
                success: false, 
                error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' 
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [hashedPassword, id]
        );

        await logActivity(req.user.id, 'reset_password', 'user', parseInt(id), {}, req);

        res.json({ 
            success: true, 
            message: 'รีเซ็ตรหัสผ่านสำเร็จ',
            newPassword: newPassword
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// POST /api/admin/users/bulk - Bulk Actions
// =====================================================
router.post('/users/bulk', verifyToken, superAdminOnly, async (req, res) => {
    try {
        const { action, userIds } = req.body;

        if (!userIds || userIds.length === 0) {
            return res.status(400).json({ success: false, error: 'กรุณาเลือกผู้ใช้' });
        }

        let query = '';
        let message = '';

        switch (action) {
            case 'approve':
                query = `UPDATE users SET status = 'active', expire_date = CURRENT_DATE + INTERVAL '90 days', updated_at = NOW() WHERE id = ANY($1)`;
                message = `อนุมัติ ${userIds.length} รายการสำเร็จ`;
                break;

            case 'lock':
                query = `UPDATE users SET status = 'locked', updated_at = NOW() WHERE id = ANY($1)`;
                message = `ล็อก ${userIds.length} รายการสำเร็จ`;
                break;

            case 'unlock':
                query = `UPDATE users SET status = 'active', login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = ANY($1)`;
                message = `ปลดล็อก ${userIds.length} รายการสำเร็จ`;
                break;

            case 'extend30':
                query = `UPDATE users SET expire_date = COALESCE(expire_date, CURRENT_DATE) + INTERVAL '30 days', updated_at = NOW() WHERE id = ANY($1)`;
                message = `ต่ออายุ ${userIds.length} รายการสำเร็จ (+30 วัน)`;
                break;

            case 'extend365':
                query = `UPDATE users SET expire_date = COALESCE(expire_date, CURRENT_DATE) + INTERVAL '365 days', updated_at = NOW() WHERE id = ANY($1)`;
                message = `ต่ออายุ ${userIds.length} รายการสำเร็จ (+1 ปี)`;
                break;

            case 'delete':
                query = `DELETE FROM users WHERE id = ANY($1) AND role != 'super_admin'`;
                message = `ลบ ${userIds.length} รายการสำเร็จ`;
                break;

            default:
                return res.status(400).json({ success: false, error: 'Action ไม่ถูกต้อง' });
        }

        await pool.query(query, [userIds]);
        await logActivity(req.user.id, `bulk_${action}`, 'user', null, { userIds, action }, req);

        res.json({ success: true, message });
    } catch (error) {
        console.error('Bulk action error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// POST /api/admin/users/approve-all - อนุมัติทั้งหมด
// =====================================================
router.post('/users/approve-all', verifyToken, superAdminOnly, async (req, res) => {
    try {
        const { days = 90 } = req.body;

        const result = await pool.query(`
            UPDATE users 
            SET status = 'active', expire_date = CURRENT_DATE + INTERVAL '${days} days', updated_at = NOW() 
            WHERE status = 'pending'
            RETURNING id
        `);

        await logActivity(req.user.id, 'approve_all', 'user', null, { count: result.rowCount, days }, req);

        res.json({ 
            success: true, 
            message: `อนุมัติ ${result.rowCount} รายการสำเร็จ` 
        });
    } catch (error) {
        console.error('Approve all error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// DELETE /api/admin/users/:id - ลบผู้ใช้
// =====================================================
router.delete('/users/:id', verifyToken, superAdminOnly, async (req, res) => {
    try {
        const { id } = req.params;

        const check = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
        if (check.rows[0]?.role === 'super_admin') {
            return res.status(403).json({ success: false, error: 'ไม่สามารถลบ Super Admin ได้' });
        }

        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        await logActivity(req.user.id, 'delete_user', 'user', parseInt(id), {}, req);

        res.json({ success: true, message: 'ลบผู้ใช้สำเร็จ' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/admin/logs - Activity Logs
// =====================================================
router.get('/logs', verifyToken, superAdminOnly, async (req, res) => {
    try {
        const { page = 1, limit = 15, search, dateFrom, dateTo, type } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = "WHERE 1=1";
        const params = [];
        let paramIndex = 1;

        if (search) {
            whereClause += ` AND (u.full_name ILIKE $${paramIndex} OR a.details::text ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (dateFrom) {
            whereClause += ` AND a.created_at >= $${paramIndex}`;
            params.push(dateFrom);
            paramIndex++;
        }

        if (dateTo) {
            whereClause += ` AND a.created_at <= $${paramIndex}::date + INTERVAL '1 day'`;
            params.push(dateTo);
            paramIndex++;
        }

        if (type) {
            whereClause += ` AND a.action = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM activity_logs a LEFT JOIN users u ON a.user_id = u.id ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        const logsResult = await pool.query(
            `SELECT a.*, u.full_name as user_name
             FROM activity_logs a
             LEFT JOIN users u ON a.user_id = u.id
             ${whereClause}
             ORDER BY a.created_at DESC
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: logsResult.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/admin/stats/charts - Chart Data
// =====================================================
router.get('/stats/charts', verifyToken, superAdminOnly, async (req, res) => {
    try {
        const { days = 30 } = req.query;

        const dailyLogins = await pool.query(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM activity_logs
            WHERE action = 'login' AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
            GROUP BY DATE(created_at)
            ORDER BY date
        `);

        const divisions = await pool.query(`
            SELECT u.division as name, COUNT(*) as count
            FROM activity_logs a
            JOIN users u ON a.user_id = u.id
            WHERE a.created_at >= CURRENT_DATE - INTERVAL '${days} days' AND u.division IS NOT NULL
            GROUP BY u.division
            ORDER BY count DESC
            LIMIT 5
        `);

        const hourly = await pool.query(`
            SELECT EXTRACT(HOUR FROM created_at)::int as hour, COUNT(*) as count
            FROM activity_logs
            WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
            GROUP BY hour
            ORDER BY hour
        `);

        const pages = await pool.query(`
            SELECT target_type as name, COUNT(*) as count
            FROM activity_logs
            WHERE action = 'view' AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
            GROUP BY target_type
            ORDER BY count DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            data: {
                dailyLogins: dailyLogins.rows.map(r => ({ date: r.date, count: parseInt(r.count) })),
                divisions: divisions.rows.map(r => ({ name: r.name, count: parseInt(r.count) })),
                devices: { desktop: 65, mobile: 25, tablet: 10 },
                hourly: hourly.rows.map(r => ({ hour: r.hour, count: parseInt(r.count) })),
                pages: pages.rows.map(r => ({ name: r.name || 'Unknown', count: parseInt(r.count) }))
            }
        });
    } catch (error) {
        console.error('Get chart data error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/admin/settings - Get Settings
// =====================================================
router.get('/settings', verifyToken, superAdminOnly, async (req, res) => {
    try {
        const result = await pool.query('SELECT setting_key, setting_value FROM system_settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// PUT /api/admin/settings - Update Settings
// =====================================================
router.put('/settings', verifyToken, superAdminOnly, async (req, res) => {
    try {
        const settings = req.body;
        
        for (const [key, value] of Object.entries(settings)) {
            await pool.query(
                `UPDATE system_settings SET setting_value = $1, updated_by = $2, updated_at = NOW() WHERE setting_key = $3`,
                [value, req.user.id, key]
            );
        }
        
        await logActivity(req.user.id, 'update_settings', 'settings', null, settings, req);
        res.json({ success: true, message: 'บันทึกการตั้งค่าสำเร็จ' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/admin/import/status - Import Status
// =====================================================
router.get('/import/status', verifyToken, superAdminOnly, async (req, res) => {
    try {
        const counts = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM personnel) as personnel,
                (SELECT COUNT(*) FROM vehicles) as vehicle,
                (SELECT COUNT(*) FROM equipment) as equipment,
                (SELECT COUNT(*) FROM housing) as housing,
                (SELECT COUNT(*) FROM budget_items) as budget,
                (SELECT COUNT(*) FROM buildings) as building,
                (SELECT COUNT(*) FROM weapons) as weapon,
                (SELECT COUNT(*) FROM users WHERE role != 'super_admin') as users
        `);

        res.json({
            success: true,
            data: {
                personnel: { count: parseInt(counts.rows[0].personnel) || 0 },
                vehicle: { count: parseInt(counts.rows[0].vehicle) || 0 },
                equipment: { count: parseInt(counts.rows[0].equipment) || 0 },
                housing: { count: parseInt(counts.rows[0].housing) || 0 },
                budget: { count: parseInt(counts.rows[0].budget) || 0 },
                building: { count: parseInt(counts.rows[0].building) || 0 },
                weapon: { count: parseInt(counts.rows[0].weapon) || 0 },
                users: { count: parseInt(counts.rows[0].users) || 0 }
            }
        });
    } catch (error) {
        console.error('Get import status error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
