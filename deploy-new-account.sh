#!/bin/bash

# ==========================================
# Azure Deployment Script - New Account
# Forensic HR Management System
# ==========================================

set -e

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  🚀 Azure Deployment - New Account                     ║"
echo "║     Forensic HR Management System                     ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# ==========================================
# Configuration
# แก้ไขค่าเหล่านี้ได้ตามต้องการ
# ==========================================

PROJECT_NAME="forensic-hr"
RESOURCE_GROUP="rg-forensic-hr"
LOCATION="southeastasia"
ACR_NAME="forensichracr"
DB_SERVER="forensic-hr-db"
DB_NAME="forensic_hr"
DB_USER="forensicadmin"
DB_PASSWORD='ForensicHR2025!Strong'
APP_NAME="forensic-hr-app"
ENV_NAME="forensic-hr-env"
IMAGE_NAME="forensic-hr"
IMAGE_TAG="latest"

# ==========================================
# Colors
# ==========================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ==========================================
# Functions
# ==========================================

print_step() {
    echo -e "${GREEN}==>${NC} $1"
}

print_error() {
    echo -e "${RED}ERROR:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}WARNING:${NC} $1"
}

print_info() {
    echo -e "${BLUE}INFO:${NC} $1"
}

# ==========================================
# Check Prerequisites
# ==========================================

print_step "Checking prerequisites..."

# Check Azure CLI
if ! command -v az &> /dev/null; then
    print_error "Azure CLI not found. Please install it first."
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker not found. Please install Docker Desktop first."
    exit 1
fi

# Check if logged in
if ! az account show &> /dev/null; then
    print_error "Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

# Check if in correct directory
if [ ! -f "Dockerfile" ]; then
    print_error "Dockerfile not found! Please run this script from the project root directory."
    exit 1
fi

print_info "All prerequisites met!"

# ==========================================
# Display Configuration
# ==========================================

echo ""
echo "📋 Configuration Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Subscription:    $(az account show --query name -o tsv)"
echo "Resource Group:  $RESOURCE_GROUP"
echo "Location:        $LOCATION"
echo "ACR Name:        $ACR_NAME"
echo "DB Server:       $DB_SERVER"
echo "DB Name:         $DB_NAME"
echo "App Name:        $APP_NAME"
echo "Environment:     $ENV_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Continue with this configuration? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

# ==========================================
# Step 1: Create Resource Group
# ==========================================

print_step "Step 1/9: Creating Resource Group..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output table

echo ""

# ==========================================
# Step 2: Create Container Registry
# ==========================================

print_step "Step 2/9: Creating Container Registry..."
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --admin-enabled true \
  --output table

echo ""

# ==========================================
# Step 3: Create PostgreSQL Server
# ==========================================

print_step "Step 3/9: Creating PostgreSQL Server..."
print_info "This will take about 3-4 minutes..."

az postgres flexible-server create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DB_SERVER" \
  --location "$LOCATION" \
  --admin-user "$DB_USER" \
  --admin-password "$DB_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 15 \
  --public-access 0.0.0.0-255.255.255.255 \
  --yes \
  --output table

print_info "Waiting 30 seconds for PostgreSQL to be ready..."
sleep 30

echo ""

# ==========================================
# Step 4: Create Database
# ==========================================

print_step "Step 4/9: Creating Database..."
az postgres flexible-server db create \
  --resource-group "$RESOURCE_GROUP" \
  --server-name "$DB_SERVER" \
  --database-name "$DB_NAME" \
  --output table

echo ""

# ==========================================
# Step 5: Login to ACR
# ==========================================

print_step "Step 5/9: Login to Azure Container Registry..."
az acr login --name "$ACR_NAME"

echo ""

# ==========================================
# Step 6: Build and Push Docker Image
# ==========================================

print_step "Step 6/9: Building and Pushing Docker Image..."
print_info "This will take about 2-3 minutes..."

# Check if we have the old image to tag
OLD_IMAGE="forensichrautthapolacr.azurecr.io/forensic-hr:latest"
NEW_IMAGE="${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}"

if docker image inspect "$OLD_IMAGE" &> /dev/null; then
    print_info "Tagging existing image..."
    docker tag "$OLD_IMAGE" "$NEW_IMAGE"
else
    print_info "Building image from scratch..."
    docker build -t "$NEW_IMAGE" -f Dockerfile .
fi

print_info "Pushing image to ACR..."
docker push "$NEW_IMAGE"

echo ""

# ==========================================
# Step 7: Create Container App Environment
# ==========================================

print_step "Step 7/9: Creating Container App Environment..."
print_info "This will take about 2 minutes..."

az containerapp env create \
  --name "$ENV_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output table

echo ""

# ==========================================
# Step 8: Deploy Container App
# ==========================================

print_step "Step 8/9: Deploying Container App..."
print_info "This will take about 3-4 minutes..."

# Get ACR credentials
ACR_USERNAME=$(az acr credential show \
  --name "$ACR_NAME" \
  --query username \
  --output tsv)

ACR_PASSWORD=$(az acr credential show \
  --name "$ACR_NAME" \
  --query passwords[0].value \
  --output tsv)

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# Create database connection string
DB_CONNECTION="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_SERVER}.postgres.database.azure.com:5432/${DB_NAME}?sslmode=require"

# Deploy Container App
az containerapp create \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENV_NAME" \
  --image "${ACR_NAME}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}" \
  --registry-server "${ACR_NAME}.azurecr.io" \
  --registry-username "$ACR_USERNAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 2 \
  --cpu 1.0 \
  --memory 2.0Gi \
  --env-vars \
    "NODE_ENV=production" \
    "PORT=3000" \
    "DATABASE_URL=$DB_CONNECTION" \
    "JWT_SECRET=$JWT_SECRET" \
    "DB_HOST=${DB_SERVER}.postgres.database.azure.com" \
    "DB_PORT=5432" \
    "DB_NAME=$DB_NAME" \
    "DB_USER=$DB_USER" \
    "DB_PASSWORD=$DB_PASSWORD" \
  --output table

echo ""

# ==========================================
# Step 9: Get Application URL
# ==========================================

print_step "Step 9/9: Getting Application URL..."

APP_URL=$(az containerapp show \
  --name "$APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn \
  --output tsv)

# ==========================================
# Success Message
# ==========================================

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  🎉 Deployment Successful!                             ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Application URL:"
echo "   https://$APP_URL"
echo ""
echo "📝 Login Page:"
echo "   https://$APP_URL/login.html"
echo ""
echo "📋 Deployment Details:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Subscription:        $(az account show --query name -o tsv)"
echo "Resource Group:      $RESOURCE_GROUP"
echo "Location:            $LOCATION"
echo ""
echo "Container Registry:  $ACR_NAME.azurecr.io"
echo "Database Server:     $DB_SERVER.postgres.database.azure.com"
echo "Database Name:       $DB_NAME"
echo ""
echo "Container App:       $APP_NAME"
echo "Environment:         $ENV_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💰 Billing Information:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Free Credit:         \$200 (valid for 30 days)"
echo "Estimated Cost:      ~\$60-75 per month"
echo "Free Usage Period:   ~3 months"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔐 Database Credentials:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Server:   ${DB_SERVER}.postgres.database.azure.com"
echo "Database: $DB_NAME"
echo "Username: $DB_USER"
echo "Password: $DB_PASSWORD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next Steps:"
echo "1. Open your browser and go to the URL above"
echo "2. Register a new account"
echo "3. Login and start using the system"
echo "4. Import Excel data if needed"
echo ""
echo "🔍 Useful Commands:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "View logs:"
echo "  az containerapp logs show \\"
echo "    --name $APP_NAME \\"
echo "    --resource-group $RESOURCE_GROUP \\"
echo "    --follow"
echo ""
echo "Delete everything:"
echo "  az group delete \\"
echo "    --name $RESOURCE_GROUP \\"
echo "    --yes --no-wait"
echo ""
echo "View resources:"
echo "  az resource list \\"
echo "    --resource-group $RESOURCE_GROUP \\"
echo "    --output table"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Deployment completed successfully!"
echo ""
