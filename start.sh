#!/bin/bash

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🚀 ระบบจัดการกำลังพล - สำนักงานนิติวิทยาศาสตร์              ║"
echo "║     Forensic HR Management System                           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker ยังไม่ได้เปิด กรุณาเปิด Docker Desktop ก่อน"
    exit 1
fi

echo "✅ Docker กำลังรันอยู่"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 สร้างไฟล์ .env จาก .env.example"
    cp .env.example .env
    echo "⚠️  กรุณาแก้ไขไฟล์ .env ก่อนใช้งานจริง!"
    echo ""
fi

echo "🐳 กำลังเริ่มต้น Docker Containers..."
echo ""

# Start Docker Compose
docker-compose up -d

# Wait for services to be ready
echo ""
echo "⏳ รอให้ Services พร้อมใช้งาน..."
sleep 5

# Check if containers are running
if docker ps | grep -q "forensic-hr"; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  ✅ ระบบพร้อมใช้งานแล้ว!                                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "🌐 เปิดเบราว์เซอร์และไปที่:"
    echo "   👉 http://localhost:3000/login.html"
    echo ""
    echo "📊 ตรวจสอบสถานะ:"
    echo "   docker ps"
    echo ""
    echo "📝 ดู Logs:"
    echo "   docker logs forensic-hr-app"
    echo "   docker logs forensic-hr-db"
    echo ""
    echo "🛑 หยุดระบบ:"
    echo "   docker-compose down"
    echo ""
else
    echo "❌ เกิดข้อผิดพลาดในการเริ่มต้น Containers"
    echo "กรุณาตรวจสอบ logs: docker-compose logs"
fi
