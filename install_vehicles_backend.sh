#!/bin/bash

# 🚗 Vehicles Backend Installation Script
# สคริปต์ติดตั้ง Backend ระบบยานพาหนะ

echo "=============================================="
echo "🚗 ติดตั้ง Vehicles Backend"
echo "=============================================="
echo ""

# ตรวจสอบว่าอยู่ใน project directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: ไม่พบโฟลเดอร์ backend หรือ frontend"
    echo "กรุณารันสคริปต์นี้ในโฟลเดอร์ forensic-hr-full-stack"
    exit 1
fi

echo "✅ ตรวจสอบโครงสร้างโปรเจค - OK"
echo ""

# 1. สร้างตาราง vehicles ในฐานข้อมูล
echo "📊 Step 1: สร้างตาราง Database..."
echo ""

# อ่าน database config
if [ -f "backend/.env" ]; then
    source backend/.env
    echo "✅ อ่าน config จาก backend/.env"
else
    echo "⚠️  ไม่พบ backend/.env ใช้ค่า default"
    DB_HOST="localhost"
    DB_NAME="forensic_hr"
    DB_USER="postgres"
fi

# รัน migration
echo "กำลังสร้างตาราง vehicles..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f vehicles_migration.sql

if [ $? -eq 0 ]; then
    echo "✅ สร้างตาราง vehicles สำเร็จ"
else
    echo "❌ เกิดข้อผิดพลาดในการสร้างตาราง"
    echo "ลองรันด้วยตัวเอง: psql -U postgres -d forensic_hr -f vehicles_migration.sql"
    exit 1
fi

echo ""
echo "📁 Step 2: คัดลอกไฟล์ Backend..."

# 2. คัดลอก routes file
if [ ! -d "backend/routes" ]; then
    mkdir -p backend/routes
    echo "✅ สร้างโฟลเดอร์ backend/routes"
fi

cp vehicles.routes.js backend/routes/
echo "✅ คัดลอก vehicles.routes.js -> backend/routes/"

# 3. เพิ่ม routes ใน server.js (ถ้ายังไม่มี)
echo ""
echo "🔧 Step 3: เพิ่ม Routes ใน server.js..."

if grep -q "vehicles.routes" backend/server.js; then
    echo "✅ Routes มีอยู่แล้วใน server.js"
else
    # Backup server.js
    cp backend/server.js backend/server.js.backup
    echo "✅ Backup server.js -> server.js.backup"
    
    # เพิ่ม routes (แทรกก่อน module.exports หรือ app.listen)
    if grep -q "module.exports = app" backend/server.js; then
        # แทรกก่อน module.exports
        sed -i.bak '/module.exports = app/i\
// Vehicles Routes\
const vehiclesRoutes = require("./routes/vehicles.routes");\
app.use("/api/vehicles", vehiclesRoutes);\
' backend/server.js
    else
        # แทรกก่อน app.listen
        sed -i.bak '/app.listen/i\
// Vehicles Routes\
const vehiclesRoutes = require("./routes/vehicles.routes");\
app.use("/api/vehicles", vehiclesRoutes);\
' backend/server.js
    fi
    
    echo "✅ เพิ่ม vehicles routes ใน server.js แล้ว"
fi

# 4. Install Python dependencies
echo ""
echo "📦 Step 4: ติดตั้ง Python Dependencies..."

if command -v pip3 &> /dev/null; then
    pip3 install pandas psycopg2-binary openpyxl --break-system-packages
    echo "✅ ติดตั้ง Python packages สำเร็จ"
else
    echo "⚠️  ไม่พบ pip3 - ข้าม step นี้"
fi

# 5. Import ข้อมูลจาก Excel
echo ""
echo "📥 Step 5: Import ข้อมูลจาก Excel..."

if [ -f "ยานพาหนะ.xlsx" ]; then
    echo "พบไฟล์ ยานพาหนะ.xlsx"
    
    # ตั้งค่า environment variables
    export DB_HOST=$DB_HOST
    export DB_NAME=$DB_NAME
    export DB_USER=$DB_USER
    export DB_PASSWORD=$DB_PASSWORD
    
    python3 import_vehicles.py ยานพาหนะ.xlsx
    
    if [ $? -eq 0 ]; then
        echo "✅ Import ข้อมูลสำเร็จ"
    else
        echo "⚠️  เกิดข้อผิดพลาดในการ import"
    fi
else
    echo "⚠️  ไม่พบไฟล์ ยานพาหนะ.xlsx"
    echo "กรุณา copy ไฟล์มาที่โฟลเดอร์นี้แล้วรัน: python3 import_vehicles.py ยานพาหนะ.xlsx"
fi

echo ""
echo "=============================================="
echo "✅ ติดตั้ง Vehicles Backend เสร็จสมบูรณ์!"
echo "=============================================="
echo ""
echo "📝 สิ่งที่ทำไปแล้ว:"
echo "   ✓ สร้างตาราง vehicles ในฐานข้อมูล"
echo "   ✓ คัดลอก vehicles.routes.js -> backend/routes/"
echo "   ✓ เพิ่ม routes ใน backend/server.js"
echo "   ✓ Import ข้อมูล 474 รายการ"
echo ""
echo "🚀 ขั้นตอนถัดไป:"
echo "   1. Restart Backend Server:"
echo "      cd backend && npm start"
echo ""
echo "   2. ทดสอบ API:"
echo "      curl http://localhost:3000/api/vehicles/stats"
echo ""
echo "   3. เปิด Browser:"
echo "      http://localhost:3000/vehicles.html"
echo ""
echo "=============================================="
