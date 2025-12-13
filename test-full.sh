#!/bin/bash

API_URL="https://forensic-hr-backend.azurewebsites.net"
WEB_URL="https://kind-plant-0ebbec400.3.azurestaticapps.net"

echo "🧪 Full System Test - Forensic HR"
echo "=================================="
echo ""

pass=0
fail=0

# Function to test API endpoint
test_api() {
  local endpoint=$1
  local name=$2
  local check_field=$3
  
  response=$(curl -s "$API_URL$endpoint" --max-time 10)
  status=$(echo "$response" | grep -o '"success":true' | head -1)
  
  if [ -n "$status" ]; then
    # Check if data exists
    if [ -n "$check_field" ]; then
      has_data=$(echo "$response" | grep -o "\"$check_field\"" | head -1)
      if [ -n "$has_data" ]; then
        echo "✅ $name - Data OK"
        ((pass++))
      else
        echo "⚠️ $name - No data (field: $check_field)"
        ((fail++))
      fi
    else
      echo "✅ $name - OK"
      ((pass++))
    fi
  else
    echo "❌ $name - Failed"
    echo "   Response: ${response:0:100}..."
    ((fail++))
  fi
}

echo "📊 Testing Statistics API"
echo "--------------------------"
test_api "/api/statistics/summary" "Statistics Summary" "total"
test_api "/api/statistics/departments" "Departments Stats" "dept"

echo ""
echo "👤 Testing Personnel API"
echo "--------------------------"
test_api "/api/search?limit=5" "Personnel Search" "full_name"

echo ""
echo "🚗 Testing Vehicles API"
echo "--------------------------"
test_api "/api/vehicles?limit=5" "Vehicles List" "id"
test_api "/api/vehicles/stats" "Vehicles Stats" "total"

echo ""
echo "🖥️ Testing Equipment API"
echo "--------------------------"
test_api "/api/equipment?limit=5" "Equipment List" "id"

echo ""
echo "🏠 Testing Housing API"
echo "--------------------------"
test_api "/api/housing?limit=5" "Housing List" "id"

echo ""
echo "🔫 Testing Weapons API"
echo "--------------------------"
test_api "/api/weapons?limit=5" "Weapons List" "id"

echo ""
echo "🔐 Testing Auth API"
echo "--------------------------"
login_response=$(curl -s "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"admin123"}' \
  --max-time 10)
  
token=$(echo "$login_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$token" ]; then
  echo "✅ Login - Token received"
  ((pass++))
  
  # Test admin API with token
  admin_response=$(curl -s "$API_URL/api/admin/users" \
    -H "Authorization: Bearer $token" \
    --max-time 10)
  
  admin_success=$(echo "$admin_response" | grep -o '"success":true')
  if [ -n "$admin_success" ]; then
    user_count=$(echo "$admin_response" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    echo "✅ Admin Users - Found $user_count users"
    ((pass++))
  else
    echo "❌ Admin Users - Failed"
    ((fail++))
  fi
else
  echo "❌ Login - Failed"
  ((fail++))
fi

echo ""
echo "🌐 Testing Frontend Pages"
echo "--------------------------"
pages=("login.html" "summary.html" "dashboard.html" "vehicles.html" "super-admin.html")
for page in "${pages[@]}"; do
  # Check page loads and has API_BASE_URL
  content=$(curl -s "$WEB_URL/$page" --max-time 10)
  has_config=$(echo "$content" | grep -c "config.js")
  
  if [ "$has_config" -gt 0 ]; then
    echo "✅ $page - Has config.js"
    ((pass++))
  else
    echo "⚠️ $page - Missing config.js"
    ((fail++))
  fi
done

echo ""
echo "=================================="
echo "📊 Final Results: $pass passed, $fail failed"
echo ""

if [ $fail -eq 0 ]; then
  echo "🎉 All tests passed!"
else
  echo "⚠️ Some tests failed. Please review."
fi
