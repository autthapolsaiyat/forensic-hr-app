-- สร้างตาราง secondment (ไปช่วยราชการ)
CREATE TABLE IF NOT EXISTS secondment (
    id SERIAL PRIMARY KEY,
    rank VARCHAR(50),
    gender VARCHAR(10),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(200),
    position VARCHAR(200),
    origin_unit VARCHAR(100),
    destination_unit VARCHAR(200),
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    period VARCHAR(100),
    note VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index สำหรับการค้นหา
CREATE INDEX IF NOT EXISTS idx_secondment_origin ON secondment(origin_unit);
CREATE INDEX IF NOT EXISTS idx_secondment_destination ON secondment(destination_unit);
