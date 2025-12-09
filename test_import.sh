#!/bin/bash
set -e

echo "🔧 Testing Import System"
echo "========================"

# 1. Add column
echo "1️⃣ Adding rank_type column..."
docker exec forensic-hr-db psql -U postgres -d forensic_hr -f /docker-entrypoint-initdb.d/add_rank_type.sql

# 2. Import Excel
echo "2️⃣ Importing Excel..."
cd backend
node import_excel.js /mnt/user-data/uploads/25681001-3.xlsx

# 3. Check results
echo "3️⃣ Checking results..."
docker exec forensic-hr-db psql -U postgres -d forensic_hr -c "
  SELECT 
    'Total' as label, COUNT(*) as count FROM personnel
  UNION ALL
  SELECT 'Occupied', COUNT(*) FROM personnel WHERE vacancy_status = 'คนครอง'
  UNION ALL
  SELECT 'Vacant', COUNT(*) FROM personnel WHERE vacancy_status = 'ตำแหน่งว่าง'
  UNION ALL
  SELECT 'Sanyabat', COUNT(*) FROM personnel WHERE rank_type = 'สัญญาบัตร'
  UNION ALL
  SELECT 'Pratawan', COUNT(*) FROM personnel WHERE rank_type = 'ประทวน'
  UNION ALL
  SELECT 'Male', COUNT(*) FROM personnel WHERE gender = 'ชาย' AND vacancy_status = 'คนครอง'
  UNION ALL
  SELECT 'Female', COUNT(*) FROM personnel WHERE gender = 'หญิง' AND vacancy_status = 'คนครอง';
"

echo "✅ Test completed!"
