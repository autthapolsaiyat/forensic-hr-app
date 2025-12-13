#!/bin/bash

BASE_URL="https://kind-plant-0ebbec400.3.azurestaticapps.net"

echo "🧪 Testing Forensic HR Static Web App"
echo "======================================"
echo ""

# Test pages
pages=(
  "login.html:🔐 Login"
  "register.html:📝 Register"
  "super-admin.html:👑 Super Admin"
  "dashboard.html:👤 Dashboard"
  "dashboard-base.html:👤 Dashboard Base"
  "search.html:🔍 Search"
  "import.html:📥 Import"
  "organization.html:🏛️ Organization"
  "department.html:🏢 Department"
  "map.html:🗺️ Map"
  "summary.html:📊 Summary"
  "vehicles-dashboard.html:🚗 Vehicles Dashboard"
  "vehicles.html:🚗 Vehicles List"
  "vehicles-search.html:🚗 Vehicles Search"
  "equipment.html:🖥️ Equipment List"
  "equipment-search.html:🖥️ Equipment Search"
  "housing.html:🏠 Housing List"
  "housing-search.html:🏠 Housing Search"
  "budget.html:💰 Budget List"
  "budget-search.html:💰 Budget Search"
  "building.html:🏢 Building List"
  "building-search.html:🏢 Building Search"
  "weapons.html:🔫 Weapons List"
  "weapons-search.html:🔫 Weapons Search"
)

pass=0
fail=0

for item in "${pages[@]}"; do
  page="${item%%:*}"
  name="${item##*:}"
  
  status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/$page" --max-time 10)
  
  if [ "$status" == "200" ]; then
    echo "✅ $name ($page) - OK"
    ((pass++))
  else
    echo "❌ $name ($page) - HTTP $status"
    ((fail++))
  fi
done

echo ""
echo "======================================"
echo "📊 Results: $pass passed, $fail failed"
echo ""

# Test API
echo "🔌 Testing Backend API"
echo "======================================"
api_status=$(curl -s -o /dev/null -w "%{http_code}" "https://forensic-hr-backend.azurewebsites.net/api/statistics/summary" --max-time 10)
if [ "$api_status" == "200" ]; then
  echo "✅ API Statistics - OK"
else
  echo "❌ API Statistics - HTTP $api_status"
fi

