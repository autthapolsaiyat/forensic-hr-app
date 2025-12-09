-- Migration: Create vehicles table
-- Created: 2024-11-25

CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    unit VARCHAR(255),                      -- หน่วยงาน
    department_code VARCHAR(100),           -- บก.
    bureau_code VARCHAR(100),               -- บช.
    vehicle_type VARCHAR(255),              -- ประเภทรถ
    mission TEXT,                           -- ภารกิจ
    engine_capacity DECIMAL(10, 2),         -- ปริมาตรกระบอกสูบ (cc)
    brand VARCHAR(100),                     -- ยี่ห้อ
    license_plate VARCHAR(100),             -- ทะเบียน
    acquired_date DATE,                     -- วันที่รับมา
    vehicle_age VARCHAR(50),                -- อายุรถ (เช่น "8 ปี")
    status VARCHAR(100) DEFAULT 'ใช้งานได้', -- สถานภาพ (ใช้งานได้, ชำรุด, รอจำหน่าย)
    remarks TEXT,                           -- หมายเหตุ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_vehicles_unit ON vehicles(unit);
CREATE INDEX idx_vehicles_department ON vehicles(department_code);
CREATE INDEX idx_vehicles_bureau ON vehicles(bureau_code);
CREATE INDEX idx_vehicles_type ON vehicles(vehicle_type);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_brand ON vehicles(brand);

-- Create a function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_vehicles_updated_at 
    BEFORE UPDATE ON vehicles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments to table
COMMENT ON TABLE vehicles IS 'ตารางข้อมูลยานพาหนะทั้งหมด - สพฐ.ตร.';
COMMENT ON COLUMN vehicles.unit IS 'หน่วยงาน';
COMMENT ON COLUMN vehicles.department_code IS 'รหัสกอง';
COMMENT ON COLUMN vehicles.bureau_code IS 'รหัสบัญชี';
COMMENT ON COLUMN vehicles.vehicle_type IS 'ประเภทรถ (เก๋ง, รถตู้, กระบะ, ฯลฯ)';
COMMENT ON COLUMN vehicles.mission IS 'ภารกิจการใช้งาน';
COMMENT ON COLUMN vehicles.engine_capacity IS 'ปริมาตรกระบอกสูบ (cc)';
COMMENT ON COLUMN vehicles.brand IS 'ยี่ห้อรถ (Toyota, Honda, ฯลฯ)';
COMMENT ON COLUMN vehicles.license_plate IS 'ทะเบียนรถ';
COMMENT ON COLUMN vehicles.acquired_date IS 'วันที่รับรถมา';
COMMENT ON COLUMN vehicles.vehicle_age IS 'อายุรถ (ปี)';
COMMENT ON COLUMN vehicles.status IS 'สถานภาพรถ (ใช้งานได้, ชำรุด, รอจำหน่าย)';
COMMENT ON COLUMN vehicles.remarks IS 'หมายเหตุเพิ่มเติม';
