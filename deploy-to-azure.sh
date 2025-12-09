#!/bin/bash

# ========================================
# Deploy to Azure Script
# Management 4M - intro.html Update
# Version: 2.1.1
# ========================================

set -e

echo "=========================================="
echo "🚀 Deploying to Azure Container Apps"
echo "Version: 2.1.1-intro-upgrade"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
VERSION="v2.1.1"
REGISTRY="forensichracr.azurecr.io"
IMAGE_NAME="forensic-hr"
RESOURCE_GROUP="rg-forensic-hr"
CONTAINER_APP="forensic-hr-app"

echo -e "${BLUE}📦 Configuration:${NC}"
echo "  Registry: $REGISTRY"
echo "  Image: $IMAGE_NAME:$VERSION"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Container App: $CONTAINER_APP"
echo ""

# Step 1: Check if we're in the right directory
echo -e "${YELLOW}Step 1: Checking directory...${NC}"
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo -e "${RED}❌ Error: Please run this script from forensic-hr-full-stack directory${NC}"
    echo "   cd /Users/aforce/Downloads/forensic-hr-full-stack"
    exit 1
fi
echo -e "${GREEN}✅ Directory check passed${NC}"
echo ""

# Step 2: Login to Azure (if needed)
echo -e "${YELLOW}Step 2: Checking Azure login...${NC}"
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Azure${NC}"
    echo "   Please login:"
    az login
else
    ACCOUNT=$(az account show --query name -o tsv)
    echo -e "${GREEN}✅ Already logged in to: $ACCOUNT${NC}"
fi
echo ""

# Step 3: Login to ACR
echo -e "${YELLOW}Step 3: Logging in to Azure Container Registry...${NC}"
az acr login --name forensichracr
echo -e "${GREEN}✅ ACR login successful${NC}"
echo ""

# Step 4: Build Docker Image
echo -e "${YELLOW}Step 4: Building Docker image...${NC}"
echo "   Platform: linux/amd64"
echo "   Tags: $VERSION, latest"
echo ""

docker buildx build --platform linux/amd64 \
  -t $REGISTRY/$IMAGE_NAME:$VERSION \
  -t $REGISTRY/$IMAGE_NAME:latest \
  --push \
  .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker image built and pushed successfully${NC}"
else
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi
echo ""

# Step 5: Deploy to Azure Container Apps
echo -e "${YELLOW}Step 5: Deploying to Azure Container Apps...${NC}"
echo "   This may take 2-3 minutes..."
echo ""

az containerapp update \
  --name $CONTAINER_APP \
  --resource-group $RESOURCE_GROUP \
  --image $REGISTRY/$IMAGE_NAME:$VERSION

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Container app updated successfully${NC}"
else
    echo -e "${RED}❌ Container app update failed${NC}"
    exit 1
fi
echo ""

# Step 6: Wait for deployment
echo -e "${YELLOW}Step 6: Waiting for deployment to complete...${NC}"
echo "   Waiting 60 seconds for new revision to be healthy..."
sleep 60
echo -e "${GREEN}✅ Wait completed${NC}"
echo ""

# Step 7: Get latest healthy revision
echo -e "${YELLOW}Step 7: Getting latest healthy revision...${NC}"

LATEST_REV=$(az containerapp revision list \
  --name $CONTAINER_APP \
  --resource-group $RESOURCE_GROUP \
  --query "[?properties.healthState=='Healthy'] | sort_by(@, &properties.createdTime) | [-1].name" \
  -o tsv)

if [ -z "$LATEST_REV" ]; then
    echo -e "${RED}❌ No healthy revision found${NC}"
    echo "   Check Azure Portal for details"
    exit 1
fi

echo -e "${GREEN}✅ Latest healthy revision: $LATEST_REV${NC}"
echo ""

# Step 8: Switch traffic to new revision
echo -e "${YELLOW}Step 8: Switching traffic to new revision...${NC}"

az containerapp ingress traffic set \
  --name $CONTAINER_APP \
  --resource-group $RESOURCE_GROUP \
  --revision-weight $LATEST_REV=100

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Traffic switched successfully (100% to new revision)${NC}"
else
    echo -e "${RED}❌ Traffic switch failed${NC}"
    exit 1
fi
echo ""

# Step 9: Get application URL
echo -e "${YELLOW}Step 9: Getting application URL...${NC}"

APP_URL=$(az containerapp show \
  --name $CONTAINER_APP \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  -o tsv)

if [ -z "$APP_URL" ]; then
    echo -e "${RED}❌ Could not get application URL${NC}"
else
    echo -e "${GREEN}✅ Application URL: https://$APP_URL${NC}"
fi
echo ""

# Step 10: Verify deployment
echo -e "${YELLOW}Step 10: Verifying deployment...${NC}"

# Get revision details
REVISION_INFO=$(az containerapp revision show \
  --revision $LATEST_REV \
  --resource-group $RESOURCE_GROUP \
  --query "{name:name,active:properties.active,replicas:properties.replicas,trafficWeight:properties.trafficWeight}" \
  -o json 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "Revision Details:"
    echo "$REVISION_INFO" | jq . 2>/dev/null || echo "$REVISION_INFO"
else
    echo -e "${YELLOW}⚠️  Could not get detailed revision info (non-critical)${NC}"
    echo "   Revision: $LATEST_REV is active and receiving traffic"
fi
echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}🎉 Deployment Summary${NC}"
echo "=========================================="
echo ""
echo -e "${GREEN}✅ Version:${NC} $VERSION"
echo -e "${GREEN}✅ Image:${NC} $REGISTRY/$IMAGE_NAME:$VERSION"
echo -e "${GREEN}✅ Revision:${NC} $LATEST_REV"
echo -e "${GREEN}✅ URL:${NC} https://$APP_URL"
echo ""
echo "=========================================="
echo "📝 Next Steps:"
echo "=========================================="
echo ""
echo "1. Test intro.html:"
echo "   https://$APP_URL/intro.html"
echo ""
echo "2. Verify features:"
echo "   - Click Man card → Goes to summary.html"
echo "   - Material icon = 🔬 (microscope)"
echo "   - Theme toggle works (🌙/☀️)"
echo ""
echo "3. Test on devices:"
echo "   - Desktop browser"
echo "   - iPad"
echo "   - iPhone"
echo ""
echo "4. Monitor logs (if needed):"
echo "   az containerapp logs show \\"
echo "     --name $CONTAINER_APP \\"
echo "     --resource-group $RESOURCE_GROUP \\"
echo "     --follow"
echo ""
echo "=========================================="
echo -e "${GREEN}🚀 Deployment Complete!${NC}"
echo "=========================================="
echo ""

# Open URL in browser (optional)
read -p "Open URL in browser? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "https://$APP_URL/intro.html"
fi
