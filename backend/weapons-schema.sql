-- =====================================================
-- Weapons Schema - ระบบยุทธภัณฑ์และอุปกรณ์ สพฐ.ตร.
-- Phase 7: Weapons & Equipment Management System
-- =====================================================

-- Drop existing tables
DROP TABLE IF EXISTS weapons CASCADE;

-- =====================================================
-- Main Table: weapons - ยุทธภัณฑ์และอุปกรณ์
-- =====================================================
CREATE TABLE weapons (
    id SERIAL PRIMARY KEY,
    
    -- ประเภท
    category VARCHAR(100),              -- ประเภทหลัก: อาวุธปืน, เสื้อเกราะ, เครื่องมือEOD, etc.
    subcategory VARCHAR(100),           -- ประเภทย่อย: ปืนพก, ปืนเล็กสั้น, ปืนเล็กยาว
    
    -- ข้อมูลรายการ
    item_name VARCHAR(500),             -- ชื่อรายการ
    brand VARCHAR(100),                 -- ยี่ห้อ
    model VARCHAR(100),                 -- รุ่น
    caliber VARCHAR(50),                -- ขนาด (9 มม., 5.56 มม., etc.)
    unit VARCHAR(50),                   -- หน่วยนับ: กระบอก, ตัว, เครื่อง
    
    -- จำนวน
    total_quantity INTEGER DEFAULT 0,   -- จำนวนทั้งหมด
    usable_quantity INTEGER DEFAULT 0,  -- ใช้งานได้
    damaged_quantity INTEGER DEFAULT 0, -- ชำรุด
    lost_quantity INTEGER DEFAULT 0,    -- สูญหาย (ระหว่างดำเนินการ)
    disposed_quantity INTEGER DEFAULT 0,-- จำหน่าย
    
    -- สถานะ
    priority VARCHAR(50),               -- ลำดับความสำคัญ: 1-4
    priority_text VARCHAR(100),         -- ข้อความลำดับความสำคัญ
    service_life INTEGER,               -- อายุการใช้งาน (ปี)
    additional_need INTEGER DEFAULT 0,  -- ความต้องการเพิ่มเติม
    
    -- หน่วยงาน (สำหรับเก็บข้อมูลแยกหน่วย)
    division VARCHAR(50),               -- หน่วยงาน: ศพฐ.1-10, etc.
    
    -- หมายเหตุ
    remarks TEXT,                       -- หมายเหตุ
    source VARCHAR(100),                -- แหล่งที่มา (เบิกจาก, ได้รับจาก)
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX idx_weapons_category ON weapons(category);
CREATE INDEX idx_weapons_subcategory ON weapons(subcategory);
CREATE INDEX idx_weapons_division ON weapons(division);
CREATE INDEX idx_weapons_caliber ON weapons(caliber);
CREATE INDEX idx_weapons_brand ON weapons(brand);

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE weapons IS 'ยุทธภัณฑ์และอุปกรณ์ สพฐ.ตร.';
COMMENT ON COLUMN weapons.category IS 'ประเภทหลัก';
COMMENT ON COLUMN weapons.subcategory IS 'ประเภทย่อย';
COMMENT ON COLUMN weapons.total_quantity IS 'จำนวนทั้งหมด';
COMMENT ON COLUMN weapons.usable_quantity IS 'ใช้งานได้';
COMMENT ON COLUMN weapons.damaged_quantity IS 'ชำรุด';
COMMENT ON COLUMN weapons.disposed_quantity IS 'จำหน่าย';
COMMENT ON COLUMN weapons.priority IS 'ลำดับความสำคัญ 1-4';
