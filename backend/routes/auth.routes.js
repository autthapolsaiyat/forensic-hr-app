const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// =====================================================
// Helper Functions
// =====================================================
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

async function logActivity(userId, action, targetType, targetId, details, req) {
    try {
        await pool.query(`
            INSERT INTO activity_logs (user_id, action, target_type, target_id, details, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [userId, action, targetType, targetId, JSON.stringify(details), req.ip, req.get('User-Agent')]);
    } catch (err) {
        console.error('Log activity error:', err);
    }
}

async function getSetting(key) {
    const result = await pool.query('SELECT setting_value FROM system_settings WHERE setting_key = $1', [key]);
    return result.rows[0]?.setting_value;
}

// =====================================================
// Middleware: Verify Token
// =====================================================
async function verifyToken(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
    
    if (!token) {
        return res.status(401).json({ success: false, error: 'ไม่พบ Token' });
    }
    
    try {
        const result = await pool.query(`
            SELECT s.*, u.id as user_id, u.username, u.full_name, u.role, u.status, u.expire_date, u.division
            FROM user_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = $1 AND s.expires_at > NOW()
        `, [token]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                error: 'บัญชีนี้มีการล็อกอินเข้าใช้งานจากอุปกรณ์อื่น', 
                code: 'SESSION_KICKED' 
            });
        }
        
        const session = result.rows[0];
        
        // Check user status
        if (session.status === 'locked') {
            return res.status(403).json({ success: false, error: 'บัญชีถูกล็อก' });
        }
        
        if (session.status === 'expired' || (session.expire_date && new Date(session.expire_date) < new Date())) {
            return res.status(403).json({ success: false, error: 'บัญชีหมดอายุ', code: 'EXPIRED' });
        }
        
        req.user = {
            id: session.user_id,
            username: session.username,
            fullName: session.full_name,
            role: session.role,
            status: session.status,
            division: session.division,
            expireDate: session.expire_date
        };
        
        next();
    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// Middleware: Super Admin Only
function superAdminOnly(req, res, next) {
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' });
    }
    next();
}

// =====================================================
// POST /api/auth/login - เข้าสู่ระบบ
// =====================================================
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
        }
        
        // Find user
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        
        if (userResult.rows.length === 0) {
            await logActivity(null, 'login_failed', 'auth', null, { username, reason: 'user_not_found' }, req);
            return res.status(401).json({ success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        }
        
        const user = userResult.rows[0];
        
        // Check if locked
        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const remainingMinutes = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
            return res.status(403).json({ 
                success: false, 
                error: `บัญชีถูกล็อก กรุณารอ ${remainingMinutes} นาที` 
            });
        }
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            // Increment login attempts
            const maxAttempts = parseInt(await getSetting('max_login_attempts') || '3');
            const newAttempts = user.login_attempts + 1;
            
            if (newAttempts >= maxAttempts) {
                const lockMinutes = parseInt(await getSetting('lock_duration_minutes') || '30');
                const lockUntil = new Date(Date.now() + lockMinutes * 60000);
                
                await pool.query(
                    'UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3',
                    [newAttempts, lockUntil, user.id]
                );
                
                await logActivity(user.id, 'account_locked', 'auth', user.id, { attempts: newAttempts }, req);
                
                return res.status(403).json({ 
                    success: false, 
                    error: `ล็อกอินผิด ${maxAttempts} ครั้ง บัญชีถูกล็อก ${lockMinutes} นาที` 
                });
            } else {
                await pool.query('UPDATE users SET login_attempts = $1 WHERE id = $2', [newAttempts, user.id]);
            }
            
            await logActivity(user.id, 'login_failed', 'auth', user.id, { reason: 'wrong_password', attempts: newAttempts }, req);
            
            return res.status(401).json({ 
                success: false, 
                error: `รหัสผ่านไม่ถูกต้อง (เหลือ ${maxAttempts - newAttempts} ครั้ง)` 
            });
        }
        
        // Check status
        if (user.status === 'pending') {
            return res.status(403).json({ success: false, error: 'บัญชีรออนุมัติ', code: 'PENDING' });
        }
        
        if (user.status === 'rejected') {
            return res.status(403).json({ success: false, error: 'บัญชีถูกปฏิเสธ', code: 'REJECTED' });
        }
        
        if (user.status === 'locked') {
            return res.status(403).json({ success: false, error: 'บัญชีถูกล็อก', code: 'LOCKED' });
        }
        
        // Check expire date
        if (user.expire_date && new Date(user.expire_date) < new Date()) {
            await pool.query("UPDATE users SET status = 'expired' WHERE id = $1", [user.id]);
            return res.status(403).json({ success: false, error: 'บัญชีหมดอายุ', code: 'EXPIRED' });
        }
        
        // Single Session Enforcement - ลบ session เก่าทั้งหมดของ user นี้ (เตะออกจากเครื่องอื่น)
        const deletedSessions = await pool.query(
            'DELETE FROM user_sessions WHERE user_id = $1 RETURNING id',
            [user.id]
        );
        
        if (deletedSessions.rowCount > 0) {
            await logActivity(user.id, 'session_kicked', 'auth', user.id, { 
                kicked_sessions: deletedSessions.rowCount,
                reason: 'new_login_from_another_device'
            }, req);
        }
        
        // Create new session
        const token = generateToken();
        const sessionTimeout = parseInt(await getSetting('session_timeout_minutes') || '60');
        const expiresAt = new Date(Date.now() + sessionTimeout * 60000);
        
        await pool.query(`
            INSERT INTO user_sessions (user_id, token, ip_address, user_agent, expires_at)
            VALUES ($1, $2, $3, $4, $5)
        `, [user.id, token, req.ip, req.get('User-Agent'), expiresAt]);
        
        // Reset login attempts and update last_login
        await pool.query(
            'UPDATE users SET login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = $1',
            [user.id]
        );
        
        await logActivity(user.id, 'login', 'auth', user.id, { success: true }, req);
        
        // Check if expire soon
        let expireWarning = null;
        if (user.expire_date) {
            const warnDays = parseInt(await getSetting('warn_expire_days') || '7');
            const daysLeft = Math.ceil((new Date(user.expire_date) - new Date()) / (1000 * 60 * 60 * 24));
            if (daysLeft <= warnDays) {
                expireWarning = `บัญชีจะหมดอายุใน ${daysLeft} วัน`;
            }
        }
        
        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    fullName: user.full_name,
                    role: user.role,
                    division: user.division,
                    expireDate: user.expire_date
                },
                expiresAt,
                expireWarning
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// POST /api/auth/register - สมัครสมาชิก
// =====================================================
router.post('/register', async (req, res) => {
    try {
        const { username, password, fullName, rank, position, division, subdivision, phone, email } = req.body;
        
        // Validation
        if (!username || !password || !fullName) {
            return res.status(400).json({ success: false, error: 'กรุณากรอกข้อมูลให้ครบ' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ success: false, error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
        }
        
        // Check duplicate username
        const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Insert user
        const result = await pool.query(`
            INSERT INTO users (username, password_hash, full_name, rank, position, division, subdivision, phone, email, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
            RETURNING id, username, full_name, status
        `, [username, passwordHash, fullName, rank, position, division, subdivision, phone, email]);
        
        await logActivity(result.rows[0].id, 'register', 'auth', result.rows[0].id, { username }, req);
        
        res.status(201).json({
            success: true,
            message: 'สมัครสมาชิกสำเร็จ รอผู้ดูแลอนุมัติ',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// POST /api/auth/logout - ออกจากระบบ
// =====================================================
router.post('/logout', verifyToken, async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        await pool.query('DELETE FROM user_sessions WHERE token = $1', [token]);
        await logActivity(req.user.id, 'logout', 'auth', req.user.id, {}, req);
        
        res.json({ success: true, message: 'ออกจากระบบสำเร็จ' });
        
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/auth/me - ข้อมูลผู้ใช้ปัจจุบัน
// =====================================================
router.get('/me', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        const user = result.rows[0];
        
        res.json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                fullName: user.full_name,
                rank: user.rank,
                position: user.position,
                division: user.division,
                subdivision: user.subdivision,
                phone: user.phone,
                email: user.email,
                role: user.role,
                status: user.status,
                expireDate: user.expire_date,
                lastLogin: user.last_login
            }
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// POST /api/auth/renew-request - ขอต่ออายุ
// =====================================================
router.post('/renew-request', verifyToken, async (req, res) => {
    try {
        const { reason } = req.body;
        
        // Check existing request
        const existing = await pool.query(
            "SELECT id FROM renewal_requests WHERE user_id = $1 AND status = 'pending'",
            [req.user.id]
        );
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'มีคำขอที่รอดำเนินการอยู่แล้ว' });
        }
        
        const result = await pool.query(`
            INSERT INTO renewal_requests (user_id, reason)
            VALUES ($1, $2)
            RETURNING *
        `, [req.user.id, reason]);
        
        await logActivity(req.user.id, 'renew_request', 'auth', req.user.id, { reason }, req);
        
        res.status(201).json({
            success: true,
            message: 'ส่งคำขอต่ออายุสำเร็จ',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Renew request error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================================
// GET /api/auth/settings - ตั้งค่าระบบ (Public)
// =====================================================
router.get('/settings', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT setting_key, setting_value 
            FROM system_settings 
            WHERE setting_key IN ('system_name', 'organization_name', 'welcome_message', 'footer_text', 
                                  'admin_email', 'admin_phone', 'primary_color', 'main_logo', 'login_logo', 'favicon')
        `);
        
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

// Export middleware
router.verifyToken = verifyToken;
router.superAdminOnly = superAdminOnly;
router.logActivity = logActivity;

module.exports = router;
