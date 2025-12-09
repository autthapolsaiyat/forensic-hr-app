-- ระบบจัดการกำลังพล - สำนักงานนิติวิทยาศาสตร์
-- Database Schema for PostgreSQL

-- ลบตารางเก่าถ้ามี
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS personnel CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ตาราง users (ข้อมูลผู้ใช้)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user', -- admin, user
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    CONSTRAINT chk_role CHECK (role IN ('admin', 'user'))
);

-- ตาราง personnel (ข้อมูลกำลังพล)
CREATE TABLE personnel (
    id SERIAL PRIMARY KEY,
    rank VARCHAR(50),                 -- ยศ
    gender VARCHAR(10),               -- เพศ
    full_name VARCHAR(100),           -- ชื่อ-นามสกุล
    first_name VARCHAR(50),           -- ชื่อ
    last_name VARCHAR(50),            -- นามสกุล
    position VARCHAR(100),            -- ชื่อตำแหน่ง
    department VARCHAR(100),          -- สังกัด
    status VARCHAR(20),               -- ว่าง/คนครอง
    appointed_date DATE,              -- วันแต่งตั้งครั้งสุดท้าย
    level_date TIMESTAMP,             -- ระดับนี้เมื่อ
    hire_date DATE,                   -- วันบรรจุสัญญาบัตร
    birth_date DATE,                  -- วดป.เกิด
    education VARCHAR(200),           -- คุณวุฒิ
    hometown VARCHAR(100),            -- ภูมิลำเนา
    new_department_group VARCHAR(100),-- กลุ่มสายงานใหม่
    new_work_line VARCHAR(100),       -- สายงานใหม่
    new_duty VARCHAR(100),            -- ทำหน้าที่ใหม่
    appointment_order VARCHAR(200),   -- คำสั่งแต่งตั้ง
    retirement_date DATE,             -- เกษียณ
    headquarters VARCHAR(100),        -- บก.
    vacancy_status VARCHAR(20),       -- ว่าง
    position_level VARCHAR(20),       -- ระดับตำแหน่ง
    duty VARCHAR(100),                -- หน้าที่
    sequence_number VARCHAR(20),      -- ลำดับ
    promotion_education VARCHAR(200), -- คุณวุฒิเลื่อนระดับ
    police_course VARCHAR(100),       -- หลักสูตรเป็นตำรวจ
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    CONSTRAINT chk_gender CHECK (gender IN ('ชาย', 'หญิง', NULL))
);

-- ตาราง activity_logs (Log การใช้งาน)
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,     -- login, logout, view, export, import, create, update, delete
    target VARCHAR(100),              -- ชื่อตารางหรือ resource ที่ทำงาน
    details TEXT,                     -- รายละเอียด
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- สร้าง Index เพื่อ Performance
CREATE INDEX idx_personnel_department ON personnel(department);
CREATE INDEX idx_personnel_rank ON personnel(rank);
CREATE INDEX idx_personnel_status ON personnel(status);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- สร้าง Admin User เริ่มต้น (password: admin123)
-- Password hash สร้างจาก bcrypt
INSERT INTO users (username, password_hash, email, full_name, role) 
VALUES (
    'admin',
    '$2b$10$YourHashedPasswordHere',  -- ต้อง hash จริงตอน deploy
    'admin@forensic.go.th',
    'ผู้ดูแลระบบ',
    'admin'
);

-- สร้าง Function สำหรับ auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- สร้าง Trigger สำหรับ auto-update
CREATE TRIGGER update_personnel_updated_at 
    BEFORE UPDATE ON personnel 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- View สำหรับสถิติ
CREATE OR REPLACE VIEW personnel_stats AS
SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'คนครอง') as occupied,
    COUNT(*) FILTER (WHERE status = 'ตำแหน่งว่าง') as vacant,
    COUNT(*) FILTER (WHERE gender = 'ชาย') as male,
    COUNT(*) FILTER (WHERE gender = 'หญิง') as female
FROM personnel;

-- View สำหรับสถิติตามสังกัด
CREATE OR REPLACE VIEW department_stats AS
SELECT 
    department,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'คนครอง') as occupied,
    COUNT(*) FILTER (WHERE status = 'ตำแหน่งว่าง') as vacant
FROM personnel
WHERE department IS NOT NULL
GROUP BY department
ORDER BY total DESC;

COMMENT ON TABLE users IS 'ตารางข้อมูลผู้ใช้งานระบบ';
COMMENT ON TABLE personnel IS 'ตารางข้อมูลกำลังพล';
COMMENT ON TABLE activity_logs IS 'ตาราง Log การใช้งานระบบ';
