-- =====================================================
-- Housing Management System - Database Schema
-- ระบบจัดการที่พักอาศัย สพฐ.ตร.
-- =====================================================

-- Drop existing tables if exists
DROP TABLE IF EXISTS housing_occupants CASCADE;
DROP TABLE IF EXISTS housing_maintenance CASCADE;
DROP TABLE IF EXISTS housing CASCADE;

-- =====================================================
-- Main Housing Table - ตารางที่พักอาศัยหลัก
-- =====================================================
CREATE TABLE housing (
    id SERIAL PRIMARY KEY,
    
    -- ข้อมูลหน่วยงาน
    bureau VARCHAR(100),                    -- บช. (กองบัญชาการ) เช่น สพฐ.ตร.
    division VARCHAR(200),                  -- บก. (กองบังคับการ) เช่น ศพฐ.1-10
    subdivision VARCHAR(200),               -- พฐ.จว. (พิสูจน์หลักฐานจังหวัด)
    
    -- ข้อมูลที่พัก
    housing_type VARCHAR(100),              -- ประเภทที่พัก: แฟลต 5 ชั้น, แฟลต 4 ชั้น, เรือนแถว, บ้านพัก
    housing_name VARCHAR(255),              -- ชื่อที่พัก/อาคาร
    housing_code VARCHAR(50),               -- รหัสที่พัก
    
    -- จำนวนห้อง/หน่วย
    total_rooms INTEGER DEFAULT 0,          -- จำนวนห้องทั้งหมด
    occupied_rooms INTEGER DEFAULT 0,       -- จำนวนห้องที่มีคนพัก
    vacant_rooms INTEGER DEFAULT 0,         -- จำนวนห้องว่าง
    damaged_rooms INTEGER DEFAULT 0,        -- จำนวนห้องชำรุด
    under_construction INTEGER DEFAULT 0,   -- จำนวนห้องอยู่ระหว่างก่อสร้าง
    
    -- อัตรากำลัง
    authorized_quota INTEGER DEFAULT 0,     -- อัตราอนุญาต (จำนวนคนที่อนุญาตให้พัก)
    current_occupants INTEGER DEFAULT 0,    -- อัตราคนครอง (จำนวนคนที่พักอยู่จริง)
    
    -- สถิติการพักอาศัย
    entitled_stay INTEGER DEFAULT 0,        -- ได้รับสิทธิเข้าพัก
    private_housing INTEGER DEFAULT 0,      -- พักบ้านส่วนตัว
    rent_allowance INTEGER DEFAULT 0,       -- เบิกค่าเช่าบ้าน
    other_agency INTEGER DEFAULT 0,         -- อาศัยหน่วยอื่น
    shortage INTEGER DEFAULT 0,             -- ขาดแคลน
    
    -- ข้อมูลปี
    budget_year INTEGER,                    -- ปี พ.ศ.ที่ได้รับงบประมาณ
    operation_year INTEGER,                 -- ปี พ.ศ.ที่เริ่มใช้งาน
    
    -- สถานะ
    status VARCHAR(50) DEFAULT 'ใช้งานได้',  -- สถานะ: ใช้งานได้, ชำรุด, อยู่ระหว่างก่อสร้าง, รื้อถอน
    
    -- ที่อยู่
    address TEXT,                           -- ที่อยู่
    location_lat DECIMAL(10, 8),            -- พิกัด Latitude
    location_lng DECIMAL(11, 8),            -- พิกัด Longitude
    
    -- หมายเหตุ
    remarks TEXT,                           -- หมายเหตุ
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- =====================================================
-- Housing Occupants Table - ตารางผู้พักอาศัย (Optional)
-- =====================================================
CREATE TABLE housing_occupants (
    id SERIAL PRIMARY KEY,
    housing_id INTEGER REFERENCES housing(id) ON DELETE CASCADE,
    
    -- ข้อมูลผู้พักอาศัย
    personnel_id INTEGER,                   -- รหัสบุคลากร (FK to personnel table)
    room_number VARCHAR(50),                -- หมายเลขห้อง
    
    -- วันที่เข้า-ออก
    move_in_date DATE,                      -- วันที่เข้าพัก
    move_out_date DATE,                     -- วันที่ย้ายออก
    
    -- สถานะ
    status VARCHAR(50) DEFAULT 'พักอาศัย',   -- สถานะ: พักอาศัย, ย้ายออก
    
    -- หมายเหตุ
    remarks TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Housing Maintenance Table - ตารางซ่อมบำรุง (Optional)
-- =====================================================
CREATE TABLE housing_maintenance (
    id SERIAL PRIMARY KEY,
    housing_id INTEGER REFERENCES housing(id) ON DELETE CASCADE,
    
    -- ข้อมูลการซ่อมบำรุง
    maintenance_type VARCHAR(100),          -- ประเภทการซ่อม
    description TEXT,                       -- รายละเอียด
    room_number VARCHAR(50),                -- หมายเลขห้อง (ถ้ามี)
    
    -- วันที่
    request_date DATE,                      -- วันที่แจ้งซ่อม
    start_date DATE,                        -- วันที่เริ่มซ่อม
    complete_date DATE,                     -- วันที่ซ่อมเสร็จ
    
    -- งบประมาณ
    estimated_cost DECIMAL(12, 2),          -- งบประมาณประเมิน
    actual_cost DECIMAL(12, 2),             -- งบประมาณจริง
    
    -- สถานะ
    status VARCHAR(50) DEFAULT 'รอดำเนินการ', -- รอดำเนินการ, กำลังดำเนินการ, เสร็จสิ้น
    
    -- หมายเหตุ
    remarks TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Indexes for better query performance
-- =====================================================
CREATE INDEX idx_housing_bureau ON housing(bureau);
CREATE INDEX idx_housing_division ON housing(division);
CREATE INDEX idx_housing_subdivision ON housing(subdivision);
CREATE INDEX idx_housing_type ON housing(housing_type);
CREATE INDEX idx_housing_status ON housing(status);
CREATE INDEX idx_housing_budget_year ON housing(budget_year);

CREATE INDEX idx_occupants_housing ON housing_occupants(housing_id);
CREATE INDEX idx_occupants_personnel ON housing_occupants(personnel_id);
CREATE INDEX idx_occupants_status ON housing_occupants(status);

CREATE INDEX idx_maintenance_housing ON housing_maintenance(housing_id);
CREATE INDEX idx_maintenance_status ON housing_maintenance(status);

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE housing IS 'ตารางข้อมูลที่พักอาศัยหลัก';
COMMENT ON TABLE housing_occupants IS 'ตารางผู้พักอาศัย';
COMMENT ON TABLE housing_maintenance IS 'ตารางซ่อมบำรุงที่พัก';

COMMENT ON COLUMN housing.bureau IS 'กองบัญชาการ เช่น สพฐ.ตร.';
COMMENT ON COLUMN housing.division IS 'กองบังคับการ เช่น ศพฐ.1-10';
COMMENT ON COLUMN housing.subdivision IS 'พิสูจน์หลักฐานจังหวัด';
COMMENT ON COLUMN housing.housing_type IS 'ประเภทที่พัก: แฟลต 5 ชั้น, แฟลต 4 ชั้น, เรือนแถว, บ้านพัก';
COMMENT ON COLUMN housing.authorized_quota IS 'อัตราอนุญาต - จำนวนคนที่อนุญาตให้พัก';
COMMENT ON COLUMN housing.current_occupants IS 'อัตราคนครอง - จำนวนคนที่พักอยู่จริง';
COMMENT ON COLUMN housing.entitled_stay IS 'จำนวนคนที่ได้รับสิทธิเข้าพัก';
COMMENT ON COLUMN housing.private_housing IS 'จำนวนคนที่พักบ้านส่วนตัว';
COMMENT ON COLUMN housing.rent_allowance IS 'จำนวนคนที่เบิกค่าเช่าบ้าน';
COMMENT ON COLUMN housing.shortage IS 'จำนวนที่ขาดแคลน';
