const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/connection');
const { jwtSecret, jwtExpire, cookieOptions } = require('../../config/jwt');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../middleware/logger');

// Register - สมัครสมาชิก
router.post('/register', async (req, res) => {
    try {
        const { username, password, email, full_name } = req.body;

        // Validation
        if (!username || !password || !email) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
            });
        }

        // ตรวจสอบ username ซ้ำ
        const existingUser = await query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'ชื่อผู้ใช้หรืออีเมลนี้มีอยู่ในระบบแล้ว'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Insert user
        const result = await query(
            `INSERT INTO users (username, password_hash, email, full_name) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, username, email, full_name, role, created_at`,
            [username, password_hash, email, full_name]
        );

        const user = result.rows[0];

        // Log activity
        await logActivity(user.id, 'register', 'users', { username, email }, req);

        res.status(201).json({
            success: true,
            message: 'สมัครสมาชิกสำเร็จ',
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก'
        });
    }
});

// Login - เข้าสู่ระบบ
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'
            });
        }

        // หา user
        const result = await query(
            'SELECT * FROM users WHERE username = $1 AND is_active = true',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        const user = result.rows[0];

        // ตรวจสอบ password
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        // อัพเดท last_login
        await query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );

        // สร้าง JWT Token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            jwtSecret,
            { expiresIn: jwtExpire }
        );

        // Log activity
        await logActivity(user.id, 'login', 'users', { username }, req);

        // ส่ง token ผ่าน cookie
        res.cookie('token', token, cookieOptions);

        res.json({
            success: true,
            message: 'เข้าสู่ระบบสำเร็จ',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role
                },
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
        });
    }
});

// Logout - ออกจากระบบ
router.post('/logout', authenticate, async (req, res) => {
    try {
        // Log activity
        await logActivity(req.user.id, 'logout', 'users', {}, req);

        // ลบ cookie
        res.clearCookie('token');

        res.json({
            success: true,
            message: 'ออกจากระบบสำเร็จ'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการออกจากระบบ'
        });
    }
});

// Get Current User - ดึงข้อมูลผู้ใช้ปัจจุบัน
router.get('/me', authenticate, async (req, res) => {
    try {
        res.json({
            success: true,
            data: req.user
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้'
        });
    }
});

module.exports = router;
