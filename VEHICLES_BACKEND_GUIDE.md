# 🚗 Vehicles System - Backend Integration Guide

## 📁 ไฟล์ที่สร้างแล้ว

1. **vehicles_migration.sql** - Database Schema
2. **vehicles.routes.js** - API Routes
3. **import_vehicles.py** - Import Script

---

## 🔧 การติดตั้งและใช้งาน

### Step 1: สร้างตาราง Database

```bash
# เข้าสู่ PostgreSQL
psql -U postgres -d forensic_hr

# รัน migration
\i /path/to/vehicles_migration.sql
```

หรือใช้ผ่าน command line:

```bash
psql -U postgres -d forensic_hr -f vehicles_migration.sql
```

---

### Step 2: เพิ่ม Routes เข้า Backend

แก้ไขไฟล์ **backend/server.js** หรือ **backend/app.js**:

```javascript
// เพิ่ม import
const vehiclesRoutes = require('./routes/vehicles.routes');

// เพิ่ม route
app.use('/api/vehicles', vehiclesRoutes);
```

**วาง vehicles.routes.js ไปที่:**
```
backend/
  └── routes/
      └── vehicles.routes.js  <-- วางไฟล์ตรงนี้
```

---

### Step 3: Import ข้อมูลจาก Excel

```bash
# ติดตั้ง dependencies
pip install pandas psycopg2-binary openpyxl --break-system-packages

# ตั้งค่า Database Connection
export DB_HOST=your_db_host
export DB_NAME=forensic_hr
export DB_USER=postgres
export DB_PASSWORD=your_password

# รัน import script
python3 import_vehicles.py ยานพาหนะ.xlsx
```

---

## 🌐 API Endpoints

### 1. Get Dashboard Statistics
```http
GET /api/vehicles/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 474,
    "byType": [...],
    "byDepartment": [...],
    "byStatus": [...],
    "byBrand": [...],
    "categorized": [
      { "category": "รถเก๋งเล็ก", "count": 18 },
      { "category": "กระบะ 4 ประตู ขับเคลื่อน 2 ล้อ", "count": 232 },
      ...
    ]
  }
}
```

### 2. Get Stats by Department
```http
GET /api/vehicles/stats/บก.อก.สพฐ.ตร.
```

### 3. Get All Vehicles (with filters)
```http
GET /api/vehicles?department=บก.อก.สพฐ.ตร.&status=ใช้งานได้&page=1&limit=50
```

**Query Parameters:**
- `unit` - หน่วยงาน
- `department` - รหัสกอง
- `bureau` - รหัสบัญชี
- `type` - ประเภทรถ
- `status` - สถานะ (ใช้งานได้, ชำรุด, รอจำหน่าย)
- `brand` - ยี่ห้อ
- `search` - ค้นหาทั่วไป
- `page` - หน้า (default: 1)
- `limit` - จำนวนต่อหน้า (default: 50)

### 4. Get Single Vehicle
```http
GET /api/vehicles/:id
```

### 5. Create New Vehicle
```http
POST /api/vehicles
Content-Type: application/json

{
  "unit": "สง.ผบช.สพฐ.ตร.",
  "department_code": "บก.อก.สพฐ.ตร.",
  "bureau_code": "สพฐ.ตร.",
  "vehicle_type": "รถยนต์นั่ง 1400-1599 (เก๋งเล็ก)",
  "mission": "งานธุรการและงานอำนวยการ",
  "engine_capacity": 1598,
  "brand": "TOYOTA",
  "license_plate": "โล่ 12345",
  "acquired_date": "2024-01-15",
  "vehicle_age": "1",
  "status": "ใช้งานได้",
  "remarks": "หมายเหตุ"
}
```

### 6. Update Vehicle
```http
PUT /api/vehicles/:id
Content-Type: application/json

{
  "status": "ชำรุด",
  "remarks": "ต้องซ่อม"
}
```

### 7. Delete Vehicle
```http
DELETE /api/vehicles/:id
```

---

## 🧪 ทดสอบ API

### ใช้ curl:

```bash
# ดึงสถิติ
curl http://localhost:3000/api/vehicles/stats

# ดึงข้อมูลทั้งหมด
curl http://localhost:3000/api/vehicles

# ดึงตาม department
curl http://localhost:3000/api/vehicles?department=บก.อก.สพฐ.ตร.

# ค้นหา
curl "http://localhost:3000/api/vehicles?search=TOYOTA"
```

### ใช้ Postman:
1. Import collection
2. Set base URL: `http://localhost:3000`
3. Test endpoints

---

## 📊 Database Schema

```sql
vehicles (
  id SERIAL PRIMARY KEY,
  unit VARCHAR(255),              -- หน่วยงาน
  department_code VARCHAR(100),   -- บก.
  bureau_code VARCHAR(100),       -- บช.
  vehicle_type VARCHAR(255),      -- ประเภทรถ
  mission TEXT,                   -- ภารกิจ
  engine_capacity DECIMAL(10,2),  -- ปริมาตรกระบอกสูบ (cc)
  brand VARCHAR(100),             -- ยี่ห้อ
  license_plate VARCHAR(100),     -- ทะเบียน
  acquired_date DATE,             -- วันที่รับมา
  vehicle_age VARCHAR(50),        -- อายุรถ
  status VARCHAR(100),            -- สถานภาพ
  remarks TEXT,                   -- หมายเหตุ
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

---

## 🎨 ประเภทรถที่รองรับ (ตามภาพ)

1. **รถเก๋งเล็ก** - รถยนต์นั่ง 1400-1599 (เก๋งเล็ก)
2. **รถเก๋งกลาง** - รถยนต์นั่ง 1600+ (เก๋งกลาง)
3. **กระบะ 4 ประตู ขับเคลื่อน 2 ล้อ** - จำนวนมาก 232 คัน
4. **กระบะ 4 ประตู ขับเคลื่อน 4 ล้อ** - 36 คัน
5. **กระบะ 2 ประตู ขับเคลื่อน 4 ล้อ** - 1 คัน
6. **กระบะ ไม่มี CAP ขับเคลื่อน 4 ล้อ** - 1 คัน
7. **รถจักรยานยนต์** - 120 คัน
8. **รถตู้** - รถยนต์โดยสาร 12-15 ที่นั่ง - 29 คัน
9. **รถบัสใหญ่** - 2 คัน
10. **รถตรวจการณ์** - MPV - 3 คัน
11. **รถพิเศษเกราะ** - 24 คัน

---

## 🏢 หน่วยงาน (Departments)

- **บก.อก.สพฐ.ตร.** - 10 คัน
- **ศพฐ.1** - 1 คัน
- **ศพฐ.2** - 1 คัน
- **ศพฐ.3** - 2 คัน
- **ศพฐ.4** - 1 คัน
- **ศพฐ.5** - 2 คัน
- **ศพฐ.6** - 1 คัน

---

## ✅ Next Steps

1. ✅ Database Schema - สร้างแล้ว
2. ✅ Backend API - สร้างแล้ว
3. ✅ Import Script - สร้างแล้ว
4. 🔄 รอ: Frontend UI Dashboard
5. 🔄 รอ: Integration & Testing

---

## 🐛 Troubleshooting

### ปัญหา: ไม่สามารถเชื่อมต่อ Database
```bash
# ตรวจสอบ PostgreSQL ทำงานอยู่หรือไม่
sudo systemctl status postgresql

# ตรวจสอบ connection string
psql -U postgres -d forensic_hr
```

### ปัญหา: Import ไม่สำเร็จ
```bash
# ตรวจสอบ Python dependencies
pip list | grep pandas
pip list | grep psycopg2

# ตรวจสอบไฟล์ Excel
python3 -c "import pandas as pd; print(pd.read_excel('ยานพาหนะ.xlsx', nrows=5))"
```

### ปัญหา: API ไม่ทำงาน
```bash
# ตรวจสอบ server.js มี routes หรือไม่
grep vehicles backend/server.js

# ตรวจสอบ logs
tail -f backend/logs/error.log
```

---

## 📞 Support

หากมีปัญหาหรือข้อสงสัย:
- Email: autthapol@saengvithscience.co.th
- Tel: 085-0709938

---

**สร้างโดย:** Autthapol - Senior Full-Stack Developer  
**วันที่:** 25 พฤศจิกายน 2568  
**Project:** Forensic HR Management System - สพฐ.ตร.
