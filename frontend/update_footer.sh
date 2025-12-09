#!/bin/bash

# Footer ใหม่
NEW_FOOTER='<footer class="site-footer">
            <div>Developed by "QXV0dGhhcG9sIFNhaXlhdA=="(AS)</div>
            <div>Copyright © 2025 All rights reserved.</div>
        </footer>'

# ไฟล์ทั้งหมดที่ต้องแก้
FILES=(
    "summary.html"
    "organization.html"
    "search.html"
    "map.html"
    "department.html"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "🔧 Updating $file..."
        
        # ใช้ perl แทน sed เพราะรองรับ multiline ดีกว่า
        perl -i -pe 'BEGIN{undef $/;} s|<footer class="site-footer">.*?</footer>|<footer class="site-footer">\n            <div>Developed by "QXV0dGhhcG9sIFNhaXlhdA=="(AS)</div>\n            <div>Copyright © 2025 All rights reserved.</div>\n        </footer>|sg' "$file"
        
        echo "✅ Updated $file"
    else
        echo "⚠️  $file not found"
    fi
done

echo ""
echo "🎉 All footers updated!"
