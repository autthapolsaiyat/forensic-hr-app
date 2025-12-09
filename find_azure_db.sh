#!/bin/bash

# 🔍 Find Azure PostgreSQL Connection Info
# หา connection string ของ Azure PostgreSQL

echo "=============================================="
echo "🔍 ค้นหา Azure PostgreSQL Connection Info"
echo "=============================================="
echo ""

echo "📋 กำลังค้นหา PostgreSQL servers..."
echo ""

# ค้นหา PostgreSQL Flexible Server
echo "1️⃣ Azure Database for PostgreSQL - Flexible Server:"
az postgres flexible-server list \
  --resource-group rg-forensic-hr \
  --query "[].{Name:name, Host:fullyQualifiedDomainName, User:administratorLogin, Version:version}" \
  --output table 2>/dev/null

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ พบ Flexible Server"
    
    # ดึงข้อมูลเพิ่มเติม
    SERVER_NAME=$(az postgres flexible-server list \
      --resource-group rg-forensic-hr \
      --query "[0].name" \
      --output tsv 2>/dev/null)
    
    if [ ! -z "$SERVER_NAME" ]; then
        echo ""
        echo "📊 รายละเอียด Server: $SERVER_NAME"
        
        HOST=$(az postgres flexible-server show \
          --resource-group rg-forensic-hr \
          --name $SERVER_NAME \
          --query "fullyQualifiedDomainName" \
          --output tsv)
        
        USER=$(az postgres flexible-server show \
          --resource-group rg-forensic-hr \
          --name $SERVER_NAME \
          --query "administratorLogin" \
          --output tsv)
        
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✅ Connection String:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Host:     $HOST"
        echo "User:     $USER"
        echo "Database: forensic_hr (หรือชื่ออื่นที่ใช้)"
        echo "Port:     5432"
        echo "SSL Mode: require"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "🔐 Connection String Format:"
        echo ""
        echo "psql \"host=$HOST port=5432 dbname=forensic_hr user=$USER password=YOUR_PASSWORD sslmode=require\""
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "💾 สำหรับ Python Script (import_vehicles.py):"
        echo ""
        echo "export DB_HOST=\"$HOST\""
        echo "export DB_USER=\"$USER\""
        echo "export DB_NAME=\"forensic_hr\""
        echo "export DB_PASSWORD=\"YOUR_PASSWORD\""
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        # ดู databases ที่มีอยู่
        echo ""
        echo "📂 Databases ที่มีอยู่:"
        echo ""
        read -p "ต้องการดู databases หรือไม่? (y/n): " SHOW_DBS
        
        if [ "$SHOW_DBS" = "y" ]; then
            read -sp "กรุณาใส่ Password: " DB_PASSWORD
            echo ""
            
            PGPASSWORD=$DB_PASSWORD psql \
              "host=$HOST port=5432 dbname=postgres user=$USER sslmode=require" \
              -c "\l" 2>/dev/null
            
            if [ $? -eq 0 ]; then
                echo ""
                echo "✅ เชื่อมต่อสำเร็จ!"
            else
                echo ""
                echo "❌ ไม่สามารถเชื่อมต่อได้ - ตรวจสอบ password"
            fi
        fi
    fi
else
    echo "⚠️  ไม่พบ Flexible Server"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ค้นหา PostgreSQL Single Server (รุ่นเก่า)
echo "2️⃣ Azure Database for PostgreSQL - Single Server:"
az postgres server list \
  --resource-group rg-forensic-hr \
  --query "[].{Name:name, Host:fullyQualifiedDomainName, User:administratorLogin, Version:version}" \
  --output table 2>/dev/null

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ พบ Single Server"
else
    echo "⚠️  ไม่พบ Single Server"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ดูข้อมูล Container App environment variables
echo "3️⃣ ตรวจสอบ Environment Variables ของ Container App:"
echo ""

az containerapp show \
  --name forensic-hr-app \
  --resource-group rg-forensic-hr \
  --query "properties.template.containers[0].env" \
  --output table 2>/dev/null

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 ขั้นตอนถัดไป:"
echo ""
echo "1. Copy Host, User, Password จากด้านบน"
echo "2. แก้ไขไฟล์ deploy_vehicles_azure.sh"
echo "3. รันคำสั่ง: ./deploy_vehicles_azure.sh"
echo ""
echo "=============================================="
