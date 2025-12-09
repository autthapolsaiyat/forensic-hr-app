@echo off
chcp 65001 >nul
title ระบบจัดการกำลังพล - Forensic HR System

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  🚀 ระบบจัดการกำลังพล - สำนักงานนิติวิทยาศาสตร์              ║
echo ║     Forensic HR Management System                           ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker ยังไม่ได้เปิด กรุณาเปิด Docker Desktop ก่อน
    pause
    exit /b 1
)

echo ✅ Docker กำลังรันอยู่
echo.

REM Check if .env exists
if not exist ".env" (
    echo 📝 สร้างไฟล์ .env จาก .env.example
    copy .env.example .env
    echo ⚠️  กรุณาแก้ไขไฟล์ .env ก่อนใช้งานจริง!
    echo.
)

echo 🐳 กำลังเริ่มต้น Docker Containers...
echo.

REM Start Docker Compose
docker-compose up -d

REM Wait for services
echo.
echo ⏳ รอให้ Services พร้อมใช้งาน...
timeout /t 5 /nobreak >nul

REM Check if containers are running
docker ps | findstr "forensic-hr" >nul 2>&1
if errorlevel 1 (
    echo ❌ เกิดข้อผิดพลาดในการเริ่มต้น Containers
    echo กรุณาตรวจสอบ logs: docker-compose logs
    pause
    exit /b 1
)

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  ✅ ระบบพร้อมใช้งานแล้ว!                                     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 🌐 เปิดเบราว์เซอร์และไปที่:
echo    👉 http://localhost:3000/login.html
echo.
echo 📊 ตรวจสอบสถานะ:
echo    docker ps
echo.
echo 📝 ดู Logs:
echo    docker logs forensic-hr-app
echo    docker logs forensic-hr-db
echo.
echo 🛑 หยุดระบบ:
echo    docker-compose down
echo.

pause
