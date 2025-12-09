"""
Column mapping สำหรับ Excel to Database
"""

# Mapping จาก Excel columns -> Database columns
COLUMN_MAPPING = {
    'ยศ': 'rank',
    'เพศ': 'gender',
    'ชื่อ-นามสกุล': 'full_name',
    'ชื่อ': 'first_name',
    'นามสกุล': 'last_name',
    'ชื่อตำแหน่ง': 'position',
    'สังกัด': 'department',
    'ว่าง': 'status'
}

# Columns ที่ database รองรับ
ALLOWED_COLUMNS = list(COLUMN_MAPPING.values())
