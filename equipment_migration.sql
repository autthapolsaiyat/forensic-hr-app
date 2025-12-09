-- Migration: Create equipment table
-- Created: 2024-11-26
-- Phase 3: ระบบจัดการครุภัณฑ์/สินทรัพย์

CREATE TABLE IF NOT EXISTS equipment (
    id SERIAL PRIMARY KEY,
    sequence_no INTEGER,                    -- ลำดับ
    bureau VARCHAR(100),                    -- บช. (บัญชี)
    division VARCHAR(100),                  -- บก. (กอง)
    unit VARCHAR(255),                      -- กก./พฐ.จว. (หน่วยงานย่อย)
    item_name TEXT,                         -- รายการ (ชื่อครุภัณฑ์)
    equipment_code VARCHAR(100),            -- เลขครุภัณฑ์
    acquired_year INTEGER,                  -- ปี พ.ศ.ที่ได้รับ
    quantity INTEGER DEFAULT 1,             -- จำนวน
    photo_url TEXT,                         -- ภาพถ่าย (URL)
    remarks TEXT,                           -- หมายเหตุ
    status VARCHAR(50) DEFAULT 'ใช้งานได้', -- สถานะ (ใช้งานได้, ชำรุด, รอจำหน่าย, จำหน่าย)
    category VARCHAR(100),                  -- หมวดหมู่ (คำนวณจากชื่อรายการ)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_equipment_bureau ON equipment(bureau);
CREATE INDEX idx_equipment_division ON equipment(division);
CREATE INDEX idx_equipment_unit ON equipment(unit);
CREATE INDEX idx_equipment_code ON equipment(equipment_code);
CREATE INDEX idx_equipment_year ON equipment(acquired_year);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_category ON equipment(category);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_equipment_updated_at 
    BEFORE UPDATE ON equipment 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments to table
COMMENT ON TABLE equipment IS 'ตารางข้อมูลครุภัณฑ์ทั้งหมด - สพฐ.ตร.';
COMMENT ON COLUMN equipment.sequence_no IS 'ลำดับ';
COMMENT ON COLUMN equipment.bureau IS 'บช. (บัญชี)';
COMMENT ON COLUMN equipment.division IS 'บก. (กอง)';
COMMENT ON COLUMN equipment.unit IS 'กก./พฐ.จว. (หน่วยงานย่อย)';
COMMENT ON COLUMN equipment.item_name IS 'รายการ (ชื่อครุภัณฑ์)';
COMMENT ON COLUMN equipment.equipment_code IS 'เลขครุภัณฑ์';
COMMENT ON COLUMN equipment.acquired_year IS 'ปี พ.ศ.ที่ได้รับ';
COMMENT ON COLUMN equipment.quantity IS 'จำนวน';
COMMENT ON COLUMN equipment.photo_url IS 'URL ภาพถ่าย';
COMMENT ON COLUMN equipment.remarks IS 'หมายเหตุ';
COMMENT ON COLUMN equipment.status IS 'สถานะ (ใช้งานได้, ชำรุด, รอจำหน่าย, จำหน่าย)';
COMMENT ON COLUMN equipment.category IS 'หมวดหมู่ครุภัณฑ์';
