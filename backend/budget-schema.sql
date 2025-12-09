-- =====================================================
-- Budget Investment Schema - ระบบงบลงทุน สพฐ.ตร.
-- Phase 5: Budget/Investment Management System
-- =====================================================

-- Drop existing tables
DROP TABLE IF EXISTS budget_progress CASCADE;
DROP TABLE IF EXISTS budget CASCADE;

-- =====================================================
-- Main Table: budget - รายการงบลงทุน
-- =====================================================
CREATE TABLE budget (
    id SERIAL PRIMARY KEY,
    
    -- ข้อมูลหน่วยงาน
    division VARCHAR(100),              -- หน่วยที่จัดหา: บก.อก., พฐก., ศพฐ.1-10
    category VARCHAR(50),               -- หมวดงาน: กสก, กคพ, กอส, กชว, ก่อสร้าง, จัดซื้อรถ
    
    -- ข้อมูลโครงการ
    project_name TEXT,                  -- รายการ/ชื่อโครงการ
    project_type VARCHAR(50),           -- ลักษณะ: โครงการ, รายการ
    
    -- สถานะและงบประมาณ
    status VARCHAR(200),                -- สถานะ: ลงนามในสัญญา, ประกาศผู้ชนะ, อยู่ระหว่างดำเนินการ
    status_group VARCHAR(50),           -- กลุ่มสถานะ: signed, pending, in_progress
    contract_amount DECIMAL(18,2),      -- วงเงินสัญญา
    fiscal_year VARCHAR(20),            -- ปีงบประมาณ: 2569, 2569 - 2570
    fiscal_year_start INTEGER,          -- ปีเริ่มต้น: 2569
    fiscal_year_end INTEGER,            -- ปีสิ้นสุด: 2569 หรือ 2570
    budget_type VARCHAR(50),            -- ประเภท: งบปีเดียว, งบผูกพัน
    
    -- ข้อมูลสัญญา
    contract_date DATE,                 -- วันที่ลงนามสัญญา
    end_date DATE,                      -- วันที่สิ้นสุดสัญญา
    installments INTEGER,               -- งวดเงิน
    contractor VARCHAR(200),            -- คู่สัญญา
    
    -- ความคืบหน้า
    progress DECIMAL(5,2),              -- ความคืบหน้า (%)
    
    -- หมายเหตุ
    remarks TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- =====================================================
-- Optional: budget_progress - ประวัติความคืบหน้า
-- =====================================================
CREATE TABLE budget_progress (
    id SERIAL PRIMARY KEY,
    budget_id INTEGER REFERENCES budget(id) ON DELETE CASCADE,
    progress_date DATE,
    progress_percent DECIMAL(5,2),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX idx_budget_division ON budget(division);
CREATE INDEX idx_budget_category ON budget(category);
CREATE INDEX idx_budget_project_type ON budget(project_type);
CREATE INDEX idx_budget_status_group ON budget(status_group);
CREATE INDEX idx_budget_fiscal_year_start ON budget(fiscal_year_start);
CREATE INDEX idx_budget_fiscal_year_end ON budget(fiscal_year_end);
CREATE INDEX idx_budget_budget_type ON budget(budget_type);
CREATE INDEX idx_budget_contractor ON budget(contractor);

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON TABLE budget IS 'รายการงบลงทุน สพฐ.ตร.';
COMMENT ON COLUMN budget.division IS 'หน่วยที่จัดหา: บก.อก., พฐก., ศพฐ.1-10';
COMMENT ON COLUMN budget.category IS 'หมวดงาน: กสก, กคพ, กอส, กชว, ก่อสร้าง, จัดซื้อรถ';
COMMENT ON COLUMN budget.project_name IS 'ชื่อรายการ/โครงการ';
COMMENT ON COLUMN budget.project_type IS 'ลักษณะ: โครงการ หรือ รายการ';
COMMENT ON COLUMN budget.status IS 'สถานะการดำเนินการ';
COMMENT ON COLUMN budget.status_group IS 'กลุ่มสถานะ: signed=ลงนามแล้ว, pending=รอดำเนินการ, in_progress=อยู่ระหว่างดำเนินการ';
COMMENT ON COLUMN budget.contract_amount IS 'วงเงินสัญญา (บาท)';
COMMENT ON COLUMN budget.fiscal_year IS 'ปีงบประมาณ';
COMMENT ON COLUMN budget.budget_type IS 'ประเภทงบ: งบปีเดียว หรือ งบผูกพัน';
COMMENT ON COLUMN budget.contract_date IS 'วันที่ลงนามสัญญา';
COMMENT ON COLUMN budget.end_date IS 'วันที่สิ้นสุดสัญญา';
COMMENT ON COLUMN budget.installments IS 'จำนวนงวดเงิน';
COMMENT ON COLUMN budget.contractor IS 'ชื่อคู่สัญญา';
COMMENT ON COLUMN budget.progress IS 'ความคืบหน้า (%)';
