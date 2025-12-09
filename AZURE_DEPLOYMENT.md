# 🌐 Azure Deployment Guide
## การ Deploy ระบบจัดการกำลังพลบน Azure

---

## 📋 Prerequisites

1. **Azure Account** - มี Azure Subscription
2. **Azure CLI** - ติดตั้ง Azure CLI
3. **Docker** - สำหรับ build image
4. **Git** - สำหรับ clone code

---

## 🚀 ขั้นตอนการ Deploy

### Step 1: เตรียม Azure Resources

#### 1.1 Login to Azure
```bash
az login
```

#### 1.2 สร้าง Resource Group
```bash
az group create \
  --name forensic-hr-rg \
  --location southeastasia
```

---

### Step 2: สร้าง Azure Container Registry (ACR)

#### 2.1 สร้าง ACR
```bash
az acr create \
  --resource-group forensic-hr-rg \
  --name forensichracr \
  --sku Basic \
  --admin-enabled true
```

#### 2.2 Login to ACR
```bash
az acr login --name forensichracr
```

#### 2.3 Build และ Push Docker Image
```bash
# Build image
docker build -t forensichracr.azurecr.io/forensic-hr:latest .

# Push image
docker push forensichracr.azurecr.io/forensic-hr:latest
```

**หรือใช้ Azure ACR Build (แนะนำ)**
```bash
az acr build \
  --registry forensichracr \
  --image forensic-hr:latest \
  --file Dockerfile .
```

---

### Step 3: สร้าง Azure Database for PostgreSQL

#### 3.1 สร้าง PostgreSQL Server
```bash
az postgres flexible-server create \
  --resource-group forensic-hr-rg \
  --name forensic-hr-db \
  --location southeastasia \
  --admin-user dbadmin \
  --admin-password "YourStrongPassword123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 15 \
  --storage-size 32 \
  --public-access 0.0.0.0
```

#### 3.2 สร้าง Database
```bash
az postgres flexible-server db create \
  --resource-group forensic-hr-rg \
  --server-name forensic-hr-db \
  --database-name forensic_hr
```

#### 3.3 เพิ่ม Firewall Rule (อนุญาต Azure Services)
```bash
az postgres flexible-server firewall-rule create \
  --resource-group forensic-hr-rg \
  --name forensic-hr-db \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

#### 3.4 Import Schema
```bash
# ดึง Connection String
az postgres flexible-server show-connection-string \
  --server-name forensic-hr-db \
  --database-name forensic_hr \
  --admin-user dbadmin \
  --admin-password "YourStrongPassword123!"

# Connect และ Import
psql "host=forensic-hr-db.postgres.database.azure.com port=5432 dbname=forensic_hr user=dbadmin password=YourStrongPassword123! sslmode=require" < backend/db/schema.sql
```

---

### Step 4: Deploy Container Instance

#### 4.1 ดึง ACR Credentials
```bash
az acr credential show --name forensichracr
```

#### 4.2 สร้าง Container Instance
```bash
az container create \
  --resource-group forensic-hr-rg \
  --name forensic-hr-app \
  --image forensichracr.azurecr.io/forensic-hr:latest \
  --registry-login-server forensichracr.azurecr.io \
  --registry-username forensichracr \
  --registry-password <ACR_PASSWORD> \
  --dns-name-label forensic-hr-system \
  --ports 3000 \
  --cpu 1 \
  --memory 1.5 \
  --environment-variables \
    NODE_ENV=production \
    PORT=3000 \
    DB_HOST=forensic-hr-db.postgres.database.azure.com \
    DB_PORT=5432 \
    DB_NAME=forensic_hr \
    DB_USER=dbadmin \
    DB_PASSWORD="YourStrongPassword123!" \
    JWT_SECRET=your-super-secret-jwt-key-production \
    JWT_EXPIRE=24h \
    CORS_ORIGIN=http://forensic-hr-system.southeastasia.azurecontainer.io
```

---

### Step 5: ตรวจสอบ Deployment

#### 5.1 ตรวจสอบสถานะ Container
```bash
az container show \
  --resource-group forensic-hr-rg \
  --name forensic-hr-app \
  --query "{FQDN:ipAddress.fqdn,ProvisioningState:provisioningState}" \
  --out table
```

#### 5.2 ดู Logs
```bash
az container logs \
  --resource-group forensic-hr-rg \
  --name forensic-hr-app
```

#### 5.3 เข้าใช้งานระบบ
```
http://forensic-hr-system.southeastasia.azurecontainer.io:3000/login.html
```

---

## 🔒 Security Configuration

### 1. HTTPS Configuration (แนะนำสำหรับ Production)

#### ใช้ Azure Application Gateway
```bash
# สร้าง Application Gateway พร้อม SSL Certificate
az network application-gateway create \
  --name forensic-hr-gateway \
  --resource-group forensic-hr-rg \
  --location southeastasia \
  --capacity 2 \
  --sku Standard_v2 \
  --http-settings-cookie-based-affinity Disabled \
  --public-ip-address forensic-hr-pip \
  --vnet-name forensic-hr-vnet \
  --subnet gateway-subnet \
  --servers forensic-hr-system.southeastasia.azurecontainer.io
```

### 2. Environment Secrets

แทนที่จะใส่ password ตรงๆ ให้ใช้ Azure Key Vault:

```bash
# สร้าง Key Vault
az keyvault create \
  --name forensic-hr-vault \
  --resource-group forensic-hr-rg \
  --location southeastasia

# เพิ่ม Secrets
az keyvault secret set \
  --vault-name forensic-hr-vault \
  --name db-password \
  --value "YourStrongPassword123!"

az keyvault secret set \
  --vault-name forensic-hr-vault \
  --name jwt-secret \
  --value "your-super-secret-jwt-key"
```

### 3. Network Security

```bash
# สร้าง Virtual Network
az network vnet create \
  --resource-group forensic-hr-rg \
  --name forensic-hr-vnet \
  --address-prefix 10.0.0.0/16 \
  --subnet-name app-subnet \
  --subnet-prefix 10.0.1.0/24

# สร้าง Network Security Group
az network nsg create \
  --resource-group forensic-hr-rg \
  --name forensic-hr-nsg

# เพิ่ม Rules
az network nsg rule create \
  --resource-group forensic-hr-rg \
  --nsg-name forensic-hr-nsg \
  --name allow-https \
  --priority 100 \
  --destination-port-ranges 443 \
  --protocol Tcp
```

---

## 🔄 การ Update และ Redeploy

### Update Code และ Redeploy

```bash
# 1. Build image ใหม่
az acr build \
  --registry forensichracr \
  --image forensic-hr:latest \
  --file Dockerfile .

# 2. Restart Container
az container restart \
  --resource-group forensic-hr-rg \
  --name forensic-hr-app
```

---

## 📊 Monitoring และ Logging

### 1. ตั้งค่า Application Insights

```bash
# สร้าง Application Insights
az monitor app-insights component create \
  --app forensic-hr-insights \
  --location southeastasia \
  --resource-group forensic-hr-rg \
  --application-type web

# ดึง Instrumentation Key
az monitor app-insights component show \
  --app forensic-hr-insights \
  --resource-group forensic-hr-rg \
  --query instrumentationKey
```

### 2. ดู Metrics

```bash
# CPU Usage
az monitor metrics list \
  --resource /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/forensic-hr-rg/providers/Microsoft.ContainerInstance/containerGroups/forensic-hr-app \
  --metric CPUUsage

# Memory Usage
az monitor metrics list \
  --resource /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/forensic-hr-rg/providers/Microsoft.ContainerInstance/containerGroups/forensic-hr-app \
  --metric MemoryUsage
```

---

## 💰 Cost Optimization

### 1. Container Instance
- **ขนาด**: B1 (1 vCPU, 1.5 GB RAM)
- **ราคา**: ~$30-40/month

### 2. PostgreSQL
- **Tier**: Burstable (Standard_B1ms)
- **Storage**: 32 GB
- **ราคา**: ~$15-25/month

### 3. Container Registry
- **SKU**: Basic
- **ราคา**: ~$5/month

**รวม**: ~$50-70/month

### Tips ประหยัดค่าใช้จ่าย:
- ใช้ Free Tier สำหรับ Dev/Test
- Stop containers เมื่อไม่ใช้
- ใช้ Reserved Instances สำหรับ Production

---

## 🛠️ Troubleshooting

### ปัญหา: Container ไม่ start
```bash
# ดู logs
az container logs --resource-group forensic-hr-rg --name forensic-hr-app

# ดู events
az container show --resource-group forensic-hr-rg --name forensic-hr-app
```

### ปัญหา: Database connection failed
```bash
# ทดสอบ connection
psql "host=forensic-hr-db.postgres.database.azure.com port=5432 dbname=forensic_hr user=dbadmin password=YourPassword sslmode=require"

# ตรวจสอบ firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group forensic-hr-rg \
  --name forensic-hr-db
```

### ปัญหา: Out of memory
```bash
# เพิ่ม memory
az container create \
  --memory 2 \
  # ... other parameters
```

---

## 📝 Checklist สำหรับ Production

- [ ] เปลี่ยน JWT_SECRET
- [ ] ใช้ Strong Password สำหรับ Database
- [ ] เปิด HTTPS (SSL/TLS)
- [ ] ตั้งค่า Firewall Rules
- [ ] เปิด Application Insights
- [ ] ตั้งค่า Backup Database
- [ ] ทดสอบ Disaster Recovery
- [ ] ตั้งค่า Auto-scaling (ถ้าจำเป็น)
- [ ] Review Security Best Practices

---

## 📧 Support

หากมีปัญหาในการ Deploy:
1. ตรวจสอบ Azure Portal
2. ดู Container Logs
3. ตรวจสอบ Database Connection
4. ติดต่อ Azure Support

---

**เอกสารนี้อัพเดท**: พฤศจิกายน 2025

🎉 **ขอให้ Deploy สำเร็จ!** 🎉
