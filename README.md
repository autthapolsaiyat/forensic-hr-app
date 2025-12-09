# 🚀 ระบบจัดการกำลังพล - สำนักงานนิติวิทยาศาสตร์
## Forensic HR Management System (Full Stack)

ระบบจัดการกำลังพลแบบครบวงจร พร้อม Authentication, Database และ Import Excel

---

## 🎯 Features

### ✅ ระบบ Authentication
- Login / Register
- JWT Token Authentication
- Session Management
- Role-based Access Control (Admin/User)

### ✅ ระบบ Dashboard
- แสดงสถิติแบบ Real-time
- กรองข้อมูลตามสังกัด
- ค้นหาข้อมูล
- แสดงข้อมูล 2,000+ รายการ

### ✅ ระบบ Import Excel
- อัปโหลดไฟล์ Excel
- Python Parser แปลงข้อมูล
- บันทึกลง PostgreSQL
- Progress Bar แสดงสถานะ

### ✅ Activity Logging
- บันทึกการ Login/Logout
- บันทึกการดูข้อมูล
- บันทึกการ Import
- Admin สามารถดู Logs ทั้งหมด

### ✅ Database (PostgreSQL)
- ตาราง users (ผู้ใช้งาน)
- ตาราง personnel (ข้อมูลกำลังพล)
- ตาราง activity_logs (Log การใช้งาน)

### ✅ Docker Ready
- Docker Compose สำหรับ Development
- พร้อม Deploy บน Azure Container

---

## 📁 โครงสร้างโปรเจค

```
forensic-hr-full-stack/
│
├── backend/                    # Backend (Node.js + Express)
│   ├── server.js              # Main Server
│   ├── routes/                # API Routes
│   │   ├── auth.js           # Authentication
│   │   ├── personnel.js      # Personnel Data
│   │   └── logs.js           # Activity Logs
│   ├── middleware/            # Middleware
│   │   ├── auth.js           # JWT Auth
│   │   └── logger.js         # Activity Logger
│   ├── db/                    # Database
│   │   ├── connection.js     # PostgreSQL Connection
│   │   └── schema.sql        # Database Schema
│   └── package.json
│
├── frontend/                   # Frontend (HTML/CSS/JS)
│   ├── login.html             # หน้า Login
│   ├── register.html          # หน้า Register
│   ├── dashboard.html         # หน้า Dashboard
│   └── import.html            # หน้า Import Excel
│
├── python/                     # Python Scripts
│   ├── excel_parser.py        # Excel to PostgreSQL Parser
│   └── requirements.txt       # Python Dependencies
│
├── config/                     # Configuration
│   └── jwt.js                 # JWT Config
│
├── docker-compose.yml          # Docker Compose
├── Dockerfile                  # Docker Image
├── .env.example                # Environment Variables
└── README.md                   # คู่มือนี้
```

---

## 🚀 การติดตั้งและรัน

### วิธีที่ 1: Docker (แนะนำ)

#### 1. Clone โปรเจค
```bash
# แตกไฟล์ zip แล้วเข้าไปในโฟลเดอร์
cd forensic-hr-full-stack
```

#### 2. สร้างไฟล์ .env
```bash
cp .env.example .env
# แก้ไขค่าต่างๆ ใน .env ตามต้องการ
```

#### 3. รัน Docker Compose
```bash
docker-compose up -d
```

#### 4. เข้าใช้งานระบบ
```
http://localhost:3000/login.html
```

#### 5. สร้าง Admin User
```bash
# เข้าไปใน Container
docker exec -it forensic-hr-db psql -U postgres -d forensic_hr

# Run SQL
INSERT INTO users (username, password_hash, email, full_name, role) 
VALUES (
    'admin',
    '$2b$10$YQYf5x.5YhZq5Z5YQYF5YeYQYF5YeYQYF5YeYQYF5YeYQYF5Ye',
    'admin@forensic.go.th',
    'ผู้ดูแลระบบ',
    'admin'
);
```

**หมายเหตุ**: Password hash ตัวอย่างข้างบนต้องสร้างด้วย bcrypt จริง

---

### วิธีที่ 2: รันแบบ Manual (Development)

#### 1. ติดตั้ง PostgreSQL
```bash
# macOS
brew install postgresql

# Ubuntu
sudo apt-get install postgresql

# Windows
# ดาวน์โหลดจาก https://www.postgresql.org/download/
```

#### 2. สร้าง Database
```bash
createdb forensic_hr
psql forensic_hr < backend/db/schema.sql
```

#### 3. ติดตั้ง Node.js Dependencies
```bash
cd backend
npm install
```

#### 4. ติดตั้ง Python Dependencies
```bash
cd python
pip install -r requirements.txt
```

#### 5. สร้างไฟล์ .env
```bash
cp .env.example .env
# แก้ไขค่าต่างๆ
```

#### 6. รัน Server
```bash
cd backend
npm start
```

#### 7. เข้าใช้งาน
```
http://localhost:3000/login.html
```

---

## 🔐 การใช้งานครั้งแรก

### 1. สมัครสมาชิก
1. ไปที่ `http://localhost:3000/register.html`
2. กรอกข้อมูล: ชื่อ-นามสกุล, ชื่อผู้ใช้, อีเมล, รหัสผ่าน
3. คลิก "สมัครสมาชิก"

### 2. เข้าสู่ระบบ
1. ไปที่ `http://localhost:3000/login.html`
2. กรอกชื่อผู้ใช้และรหัสผ่าน
3. คลิก "เข้าสู่ระบบ"

### 3. Import Excel
1. คลิกปุ่ม "📥 Import Excel" ที่มุมขวาบน
2. เลือกไฟล์ Excel (.xlsx, .xls)
3. คลิก "อัปโหลดและนำเข้าข้อมูล"
4. รอจนกว่าจะเสร็จ

### 4. ดูข้อมูล
1. เลือกสังกัดจาก Dropdown
2. Dashboard จะแสดงสถิติ
3. ตารางด้านล่างแสดงข้อมูลทั้งหมด
4. สามารถค้นหาได้

---

## 📊 API Endpoints

### Authentication
```
POST /api/auth/register      # สมัครสมาชิก
POST /api/auth/login         # เข้าสู่ระบบ
POST /api/auth/logout        # ออกจากระบบ
GET  /api/auth/me            # ข้อมูลผู้ใช้ปัจจุบัน
```

### Personnel
```
GET  /api/personnel                  # ดึงข้อมูลทั้งหมด
GET  /api/personnel/:id              # ดึงข้อมูลรายบุคคล
GET  /api/personnel/stats/summary    # สถิติ Dashboard
GET  /api/personnel/departments/list # รายการสังกัด
```

### Import
```
POST /api/import                     # Import Excel
```

### Logs (Admin only)
```
GET  /api/logs                       # ดึง Activity Logs
GET  /api/logs/stats                 # สถิติ Logs
```

---

## 🐳 การ Deploy บน Azure

### 1. สร้าง Azure Container Registry
```bash
az acr create --resource-group myResourceGroup \
  --name forensichracr --sku Basic
```

### 2. Build และ Push Image
```bash
az acr build --registry forensichracr \
  --image forensic-hr:latest .
```

### 3. สร้าง Azure Database for PostgreSQL
```bash
az postgres server create \
  --resource-group myResourceGroup \
  --name forensic-hr-db \
  --location southeastasia \
  --admin-user dbadmin \
  --admin-password YourPassword123! \
  --sku-name B_Gen5_1
```

### 4. สร้าง Container Instance
```bash
az container create \
  --resource-group myResourceGroup \
  --name forensic-hr-app \
  --image forensichracr.azurecr.io/forensic-hr:latest \
  --dns-name-label forensic-hr \
  --ports 3000 \
  --environment-variables \
    DB_HOST=forensic-hr-db.postgres.database.azure.com \
    DB_PORT=5432 \
    DB_NAME=forensic_hr \
    DB_USER=dbadmin@forensic-hr-db \
    DB_PASSWORD=YourPassword123! \
    JWT_SECRET=your-production-secret
```

### 5. เข้าใช้งาน
```
http://forensic-hr.southeastasia.azurecontainer.io:3000
```

---

## 🔧 Configuration

### Environment Variables (.env)

```env
# Database
DB_HOST=postgres              # Database host
DB_PORT=5432                  # Database port
DB_NAME=forensic_hr           # Database name
DB_USER=postgres              # Database user
DB_PASSWORD=postgres123       # Database password

# Application
NODE_ENV=production           # Environment
PORT=3000                     # Application port

# JWT
JWT_SECRET=your-secret-key    # JWT Secret (เปลี่ยนใน Production!)
JWT_EXPIRE=24h                # Token expiration

# CORS
CORS_ORIGIN=http://localhost:3000  # Allowed origin
```

---

## 🛠️ Tech Stack

### Backend
- **Node.js** v18+
- **Express.js** 4.x
- **PostgreSQL** 15
- **JWT** (Authentication)
- **bcrypt** (Password Hashing)

### Frontend
- **HTML5 / CSS3 / JavaScript**
- **Tailwind CSS**

### Python
- **pandas** (Excel Processing)
- **psycopg2** (PostgreSQL Driver)
- **openpyxl** (Excel Library)

### DevOps
- **Docker** & **Docker Compose**
- **Azure Container Instances**

---

## 📝 หมายเหตุ

### Password Hashing
ในการใช้งานจริง ต้องสร้าง Password Hash ด้วย bcrypt:

```javascript
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('password', 10);
console.log(hash);
```

### Admin User
สร้าง Admin User แรกผ่าน SQL:

```sql
INSERT INTO users (username, password_hash, email, full_name, role) 
VALUES (
    'admin',
    -- Hash จาก bcrypt.hash('admin123', 10)
    '$2b$10$...',
    'admin@forensic.go.th',
    'ผู้ดูแลระบบ',
    'admin'
);
```

---

## ⚠️ Security Best Practices

1. **เปลี่ยน JWT_SECRET** ใน Production
2. **ใช้ HTTPS** ในการ Deploy จริง
3. **ตั้งรหัสผ่าน Database** ที่แข็งแรง
4. **Backup Database** เป็นประจำ
5. **Update Dependencies** เป็นประจำ

---

## 🐛 Troubleshooting

### ปัญหา: ไม่สามารถเชื่อมต่อ Database
**แก้ไข**: ตรวจสอบว่า PostgreSQL กำลังรันอยู่
```bash
docker ps  # ตรวจสอบ container
docker logs forensic-hr-db  # ดู logs
```

### ปัญหา: Authentication Failed
**แก้ไข**: ลบ Cookie และ localStorage
```javascript
localStorage.clear();
// และ Refresh หน้า
```

### ปัญหา: Import Excel ไม่สำเร็จ
**แก้ไข**: 
1. ตรวจสอบรูปแบบ Excel
2. ดู logs ของ Python script
3. ตรวจสอบ Column names

---

## 📞 Support

หากมีปัญหาหรือข้อสงสัย:
1. ตรวจสอบ logs: `docker logs forensic-hr-app`
2. ตรวจสอบ Database connection
3. ติดต่อผู้พัฒนาระบบ

---

## 📄 License

MIT License

---

**พัฒนาโดย**: ทีมพัฒนาระบบ สำนักงานนิติวิทยาศาสตร์

🎉 **ขอให้ใช้งานระบบอย่างมีความสุข!** 🎉
