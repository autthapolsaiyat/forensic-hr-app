-- เพิ่มคอลัมน์ rank_type
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS rank_type VARCHAR(50);

-- อัปเดตข้อมูลเดิมตาม pattern ยศ (ชั่วคราว)
UPDATE personnel 
SET rank_type = 'สัญญาบัตร'
WHERE (rank LIKE '%ร.ต.%' OR rank LIKE '%ว่าที่%')
  AND rank_type IS NULL;

UPDATE personnel 
SET rank_type = 'ประทวน'
WHERE (rank LIKE '%พล.ต.%' OR rank LIKE '%พ.ต.%')
  AND rank_type IS NULL;

-- สร้าง index เพื่อความเร็ว
CREATE INDEX IF NOT EXISTS idx_rank_type ON personnel(rank_type);

SELECT 
  rank_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE vacancy_status = 'คนครอง') as occupied,
  COUNT(*) FILTER (WHERE vacancy_status = 'ตำแหน่งว่าง') as vacant
FROM personnel
GROUP BY rank_type;
