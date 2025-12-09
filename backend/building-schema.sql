-- =====================================================
-- Building Schema - ระบบอาคารที่ทำการ สพฐ.ตร.
-- Phase 6: Building Management System
-- =====================================================

-- Drop existing tables
DROP TABLE IF EXISTS building_maintenance CASCADE;
DROP TABLE IF EXISTS building CASCADE;

-- =====================================================
-- Main Table: building - อาคารที่ทำการ
-- =====================================================
CREATE TABLE building (
    id SERIAL PRIMARY KEY,
    
    -- ข้อมูลหน่วยงาน
    bureau VARCHAR(50),                 -- บช.: สพฐ.ตร.
    division VARCHAR(100),              -- บก.: ศพฐ.1-10, บก.อก., พฐก., ทว., สฝจ.
    subdivision VARCHAR(100),           -- พฐ.จว.: จังหวัดต่างๆ
    
    -- ข้อมูลอาคาร
    building_name VARCHAR(255),         -- ชื่ออาคาร
    building_count INTEGER DEFAULT 1,   -- จำนวนอาคาร
    building_size VARCHAR(50),          -- ขนาด: เล็ก, กลาง, ใหญ่
    building_type VARCHAR(255),         -- ประเภทอาคาร: อาคาร คสล. 2 ชั้น, etc.
    
    -- ปีและอายุ
    budget_year VARCHAR(50),            -- ปี พ.ศ.ที่ได้รับงบ
    operation_year VARCHAR(50),         -- ปี พ.ศ.ที่ใช้งาน
    building_age INTEGER,               -- อายุอาคาร (ปี)
    
    -- สถานะ
    status VARCHAR(100),                -- สถานภาพ: ใช้การได้, ใช้งานได้
    ownership_status VARCHAR(100),      -- สถานะกรรมสิทธิ์: มีที่ทำการ, ใช้หน่วยอื่น, รองบประมาณ, จัดหาที่ดิน
    
    -- ที่ดิน
    land_type VARCHAR(255),             -- ประเภทที่ดิน: ที่ราชพัสดุ, ที่ทรัพย์สิน
    land_doc_number VARCHAR(100),       -- เลขที่เอกสารสิทธิ์
    land_area VARCHAR(100),             -- เนื้อที่ (ไร่-งาน-วา)
    
    -- ที่ตั้ง
    subdistrict VARCHAR(100),           -- ตำบล
    district VARCHAR(100),              -- อำเภอ
    province VARCHAR(100),              -- จังหวัด
    location_lat DECIMAL(10, 7),        -- พิกัด Latitude
    location_lng DECIMAL(10, 7),        -- พิกัด Longitude
    
    -- อื่นๆ
    master_plan_url TEXT,               -- Link Master Plan
    remarks TEXT,                       -- หมายเหตุ
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- =====================================================
-- Optional: building_maintenance - ประวัติการซ่อมบำรุง
-- =====================================================
CREATE TABLE building_maintenance (
    id SERIAL PRIMARY KEY,
    building_id INTEGER REFERENCES building(id) ON DELETE CASCADE,
    maintenance_date DATE,
    maintenance_type VARCHAR(100),
    description TEXT,
    cost DECIMAL(15,2),
    contractor VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX idx_building_bureau ON building(bureau);
CREATE INDEX idx_building_division ON building(division);
CREATE INDEX idx_building_subdivision ON building(subdivision);
CREATE INDEX idx_building_status ON building(status);
CREATE INDEX idx_building_ownership ON building(ownership_status);
CREATE INDEX idx_building_province ON building(province);
CREATE INDEX idx_building_budget_year ON building(budget_year);

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE building IS 'อาคารที่ทำการ สพฐ.ตร.';
COMMENT ON COLUMN building.bureau IS 'บช.: สพฐ.ตร.';
COMMENT ON COLUMN building.division IS 'บก.: ศพฐ.1-10, บก.อก., พฐก., ทว., สฝจ.';
COMMENT ON COLUMN building.subdivision IS 'พฐ.จว.: จังหวัดต่างๆ';
COMMENT ON COLUMN building.building_name IS 'ชื่ออาคาร';
COMMENT ON COLUMN building.building_size IS 'ขนาด: เล็ก, กลาง, ใหญ่';
COMMENT ON COLUMN building.building_type IS 'ประเภทอาคาร';
COMMENT ON COLUMN building.status IS 'สถานภาพ: ใช้การได้, ใช้งานได้';
COMMENT ON COLUMN building.ownership_status IS 'สถานะ: has_building=มีที่ทำการ, use_other=ใช้หน่วยอื่น, wait_budget=รองบประมาณ, finding_land=จัดหาที่ดิน';
COMMENT ON COLUMN building.land_type IS 'ประเภทที่ดิน';
COMMENT ON COLUMN building.land_area IS 'เนื้อที่ (ไร่-งาน-วา)';
