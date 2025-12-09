-- =====================================================
-- Auth & User Management Schema
-- ระบบจัดการผู้ใช้งาน สพฐ.ตร.
-- =====================================================

-- Drop existing tables
DROP TABLE IF EXISTS import_logs CASCADE;
DROP TABLE IF EXISTS renewal_requests CASCADE;
DROP TABLE IF EXISTS uploaded_files CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =====================================================
-- 1. users - ผู้ใช้งาน
-- =====================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- ข้อมูลส่วนตัว
    full_name VARCHAR(100) NOT NULL,
    rank VARCHAR(50),                       -- ยศ
    position VARCHAR(100),                  -- ตำแหน่ง
    division VARCHAR(50),                   -- หน่วยงาน (ศพฐ.1-10)
    subdivision VARCHAR(100),               -- พฐ.จว.
    phone VARCHAR(20),
    email VARCHAR(100),
    
    -- สิทธิ์และสถานะ
    role VARCHAR(20) DEFAULT 'user',        -- 'super_admin', 'admin', 'user'
    status VARCHAR(20) DEFAULT 'pending',   -- 'pending', 'active', 'locked', 'expired', 'rejected'
    permissions JSONB DEFAULT '{}',         -- สิทธิ์เพิ่มเติม
    
    -- วันหมดอายุ
    expire_date DATE,
    
    -- ความปลอดภัย
    last_login TIMESTAMP,
    login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    password_changed_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. user_sessions - Sessions
-- =====================================================
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. activity_logs - ประวัติการใช้งาน
-- =====================================================
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    
    -- กิจกรรม
    action VARCHAR(50) NOT NULL,            -- 'login', 'logout', 'view', 'create', 'update', 'delete', 'export', 'import'
    target_type VARCHAR(50),                -- 'personnel', 'vehicle', 'equipment', etc.
    target_id INT,
    
    -- รายละเอียด
    details JSONB,
    
    -- ข้อมูลเพิ่มเติม
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 4. system_settings - ตั้งค่าระบบ
-- =====================================================
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50),               -- 'text', 'image', 'color', 'number', 'json'
    description TEXT,
    updated_by INT REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 5. uploaded_files - ไฟล์ที่อัปโหลด
-- =====================================================
CREATE TABLE uploaded_files (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),                  -- 'logo', 'background', 'favicon', 'import'
    mime_type VARCHAR(100),
    file_size INT,
    uploaded_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 6. renewal_requests - คำขอต่ออายุ
-- =====================================================
CREATE TABLE renewal_requests (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',   -- 'pending', 'approved', 'rejected'
    approved_by INT REFERENCES users(id),
    approved_at TIMESTAMP,
    new_expire_date DATE,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 7. import_logs - ประวัติการ Import
-- =====================================================
CREATE TABLE import_logs (
    id SERIAL PRIMARY KEY,
    data_type VARCHAR(50) NOT NULL,         -- 'personnel', 'vehicle', 'equipment', etc.
    file_name VARCHAR(255),
    file_size INT,
    total_rows INT,
    success_count INT,
    skipped_count INT,
    error_count INT,
    import_mode VARCHAR(50),                -- 'add_only', 'update', 'replace'
    skipped_details JSONB,
    error_details JSONB,
    backup_file VARCHAR(255),
    duration_sec INT,
    imported_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_division ON users(division);
CREATE INDEX idx_users_expire_date ON users(expire_date);

CREATE INDEX idx_sessions_token ON user_sessions(token);
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

CREATE INDEX idx_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_logs_action ON activity_logs(action);
CREATE INDEX idx_logs_created ON activity_logs(created_at);

CREATE INDEX idx_settings_key ON system_settings(setting_key);

CREATE INDEX idx_import_logs_type ON import_logs(data_type);
CREATE INDEX idx_import_logs_created ON import_logs(created_at);

-- =====================================================
-- Default Data
-- =====================================================

-- Super Admin (password: admin123)
INSERT INTO users (username, password_hash, full_name, rank, position, division, role, status, expire_date)
VALUES (
    'superadmin',
    '$2b$10$rQZ5x5kJ5x5kJ5x5kJ5x5O5x5kJ5x5kJ5x5kJ5x5kJ5x5kJ5x5kJ5x',
    'Super Administrator',
    '-',
    'ผู้ดูแลระบบ',
    'สพฐ.ตร.',
    'super_admin',
    'active',
    '2030-12-31'
);

-- Default Settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('system_name', 'ระบบสารสนเทศ สพฐ.ตร.', 'text', 'ชื่อระบบ'),
('organization_name', 'สำนักงานพิสูจน์หลักฐานตำรวจ', 'text', 'ชื่อหน่วยงาน'),
('welcome_message', 'ยินดีต้อนรับเข้าสู่ระบบ', 'text', 'ข้อความต้อนรับ'),
('footer_text', '© 2568 สพฐ.ตร. All rights reserved', 'text', 'ข้อความท้ายหน้า'),
('admin_email', 'admin@forensic.police.go.th', 'text', 'อีเมลผู้ดูแล'),
('admin_phone', '02-XXX-XXXX', 'text', 'เบอร์โทรผู้ดูแล'),
('max_login_attempts', '3', 'number', 'จำนวนครั้งล็อกอินผิดก่อนล็อก'),
('lock_duration_minutes', '30', 'number', 'ระยะเวลาล็อกบัญชี (นาที)'),
('session_timeout_minutes', '60', 'number', 'Session timeout (นาที)'),
('default_expire_days', '90', 'number', 'อายุเริ่มต้นผู้ใช้ใหม่ (วัน)'),
('warn_expire_days', '7', 'number', 'แจ้งเตือนก่อนหมดอายุ (วัน)'),
('primary_color', '#1a3a5c', 'color', 'สีหลัก'),
('main_logo', '/images/logo.png', 'image', 'โลโก้หลัก'),
('login_logo', '/images/login-logo.png', 'image', 'โลโก้หน้าล็อกอิน'),
('favicon', '/images/favicon.ico', 'image', 'Favicon');

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE users IS 'ผู้ใช้งานระบบ';
COMMENT ON TABLE user_sessions IS 'Sessions ผู้ใช้';
COMMENT ON TABLE activity_logs IS 'ประวัติการใช้งาน';
COMMENT ON TABLE system_settings IS 'ตั้งค่าระบบ';
COMMENT ON TABLE uploaded_files IS 'ไฟล์ที่อัปโหลด';
COMMENT ON TABLE renewal_requests IS 'คำขอต่ออายุ';
COMMENT ON TABLE import_logs IS 'ประวัติการ Import';
