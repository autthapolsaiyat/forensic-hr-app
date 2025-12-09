#!/bin/bash

echo "🚀 Deploying Updated Summary Page - v2.5.0"
echo "============================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
RESOURCE_GROUP="forensic-hr-rg"
APP_NAME="forensic-hr-app"
CONTAINER_NAME="forensic-hr-app"

echo -e "${BLUE}📝 Changes in v2.5.0:${NC}"
echo "  1️⃣ คนครอง/ว่าง: แสดงตัวเลข + เปอร์เซ็นต์"
echo "  2️⃣ เพศ: แสดงตัวเลข + เปอร์เซ็นต์"
echo "  3️⃣ สัญญาบัตร/ประทวน: เปลี่ยนเป็น doughnut + แสดงตัวเลข + เปอร์เซ็นต์"
echo ""

# Step 1: Build new image
echo -e "${YELLOW}Step 1: Building Docker image...${NC}"
docker build -t $APP_NAME:v2.5.0 .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi

echo -e "${GREEN}✅ Docker image built successfully${NC}"
echo ""

# Step 2: Tag for Azure Container Registry
echo -e "${YELLOW}Step 2: Tagging image...${NC}"
ACR_NAME="${APP_NAME}.azurecr.io"
docker tag $APP_NAME:v2.5.0 $ACR_NAME/$APP_NAME:v2.5.0
docker tag $APP_NAME:v2.5.0 $ACR_NAME/$APP_NAME:latest

echo -e "${GREEN}✅ Image tagged${NC}"
echo ""

# Step 3: Login to ACR
echo -e "${YELLOW}Step 3: Logging in to Azure Container Registry...${NC}"
az acr login --name $APP_NAME

if [ $? -ne 0 ]; then
    echo "❌ ACR login failed!"
    exit 1
fi

echo -e "${GREEN}✅ Logged in to ACR${NC}"
echo ""

# Step 4: Push to ACR
echo -e "${YELLOW}Step 4: Pushing image to ACR...${NC}"
docker push $ACR_NAME/$APP_NAME:v2.5.0
docker push $ACR_NAME/$APP_NAME:latest

if [ $? -ne 0 ]; then
    echo "❌ Docker push failed!"
    exit 1
fi

echo -e "${GREEN}✅ Image pushed to ACR${NC}"
echo ""

# Step 5: Update Container App
echo -e "${YELLOW}Step 5: Updating Container App...${NC}"
az containerapp update \
  --name $CONTAINER_NAME \
  --resource-group $RESOURCE_GROUP \
  --image $ACR_NAME/$APP_NAME:v2.5.0

if [ $? -ne 0 ]; then
    echo "❌ Container App update failed!"
    exit 1
fi

echo -e "${GREEN}✅ Container App updated${NC}"
echo ""

# Step 6: Verify deployment
echo -e "${YELLOW}Step 6: Verifying deployment...${NC}"
FQDN=$(az containerapp show \
  --name $CONTAINER_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  -o tsv)

echo ""
echo -e "${GREEN}🎉 Deployment Complete! - v2.5.0${NC}"
echo "============================================"
echo -e "${BLUE}📊 Summary Page URL:${NC}"
echo "https://$FQDN/summary.html"
echo ""
echo -e "${BLUE}🔍 Check these features:${NC}"
echo "  ✅ คนครอง/ว่าง chart shows numbers + %"
echo "  ✅ เพศ chart shows numbers + %"
echo "  ✅ สัญญาบัตร/ประทวน is now doughnut with numbers + %"
echo ""
echo -e "${YELLOW}⏰ Please wait 1-2 minutes for changes to propagate${NC}"
