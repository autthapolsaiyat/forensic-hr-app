#!/usr/bin/env python3
"""
Excel to PostgreSQL Importer
แปลงข้อมูล Excel เข้าสู่ PostgreSQL Database
"""

import sys
import pandas as pd
import psycopg2
from datetime import datetime
import os

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'forensic_hr'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres')
}

# Column mapping - ใช้ทุก columns ที่ database มี
COLUMN_MAPPING = {
    'ยศ': 'rank',
    'เพศ': 'gender',
    'ชื่อ-นามสกุล': 'full_name',
    'ชื่อ': 'first_name',
    'นามสกุล': 'last_name',
    'ชื่อตำแหน่ง': 'position',
    'สังกัด': 'department',
    'ว่าง': 'vacancy_status',  # แก้จาก status -> vacancy_status
    'วันแต่งตั้งครั้งสุดท้าย': 'appointed_date',
    'ระดับนี้เมื่อ': 'level_date',
    'วันบรรจุ': 'hire_date',
    'วันบรรจุสัญญาบัตร': 'hire_date',
    'วดป.เกิด': 'birth_date',
    'คุณวุฒิ': 'education',
    'ภูมิลำเนา': 'hometown',
    'กลุ่มสายงาน': 'new_department_group',
    'กลุ่มสายงานใหม่': 'new_department_group',
    'สายงาน': 'new_work_line',
    'สายงานใหม่': 'new_work_line',
    'ทำหน้าที่': 'new_duty',
    'ทำหน้าที่ใหม่': 'new_duty',
    'คำสั่งแต่งตั้ง': 'appointment_order',
    'เกษียณ': 'retirement_date',
    'บก.': 'headquarters',
    'ระดับตำแหน่ง': 'position_level',
    'หน้าที่': 'duty',
    'หน้าที่เดิม': 'duty',
    'ลำดับ': 'sequence_number',
    'คุณวุฒิเลื่อนระดับ': 'promotion_education',
    'หลักสูตรเป็นตำรวจ': 'police_course'
}

def clean_data(value):
    """ทำความสะอาดข้อมูล"""
    if pd.isna(value) or value == '' or str(value).lower() in ['nan', 'nat', 'none']:
        return None
    return str(value).strip()

def parse_date(date_str):
    """แปลงวันที่"""
    if pd.isna(date_str) or date_str == '' or str(date_str) == 'NaT':
        return None
    
    try:
        if isinstance(date_str, datetime):
            return date_str.strftime('%Y-%m-%d')
        
        date_str = str(date_str)
        formats = ['%Y-%m-%d', '%d/%m/%Y', '%Y-%m-%d %H:%M:%S']
        for fmt in formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.strftime('%Y-%m-%d')
            except:
                continue
        
        return None
    except:
        return None

def import_excel_to_db(excel_file):
    """นำเข้าข้อมูลจาก Excel เข้า PostgreSQL"""
    
    try:
        print(f"📂 Reading Excel file: {excel_file}")
        df = pd.read_excel(excel_file)
        print(f"✅ Loaded {len(df)} rows from Excel")
        print(f"📋 Columns: {list(df.columns)}")
        
        print(f"🔌 Connecting to database...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print(f"✅ Database connected")
        
        insert_count = 0
        error_count = 0
        
        # เริ่ม transaction
        conn.autocommit = False
        
        for index, row in df.iterrows():
            try:
                data = {}
                for excel_col, db_col in COLUMN_MAPPING.items():
                    if excel_col in df.columns:
                        value = row[excel_col]
                        
                        if db_col in ['appointed_date', 'hire_date', 'birth_date', 'retirement_date']:
                            data[db_col] = parse_date(value)
                        elif db_col == 'level_date':
                            date_val = parse_date(value)
                            data[db_col] = date_val if date_val else None
                        else:
                            data[db_col] = clean_data(value)
                
                # เพิ่ม created_by
                data['created_by'] = 1
                
                columns = list(data.keys())
                values = list(data.values())
                placeholders = ', '.join(['%s'] * len(values))
                columns_str = ', '.join(columns)
                
                sql = f"INSERT INTO personnel ({columns_str}) VALUES ({placeholders})"
                cursor.execute(sql, values)
                
                insert_count += 1
                
                if (insert_count % 100 == 0):
                    conn.commit()
                    print(f"⏳ Imported {insert_count} rows...")
                    
            except Exception as e:
                error_count += 1
                print(f"⚠️  Error at row {index + 1}: {str(e)}")
                conn.rollback()
                continue
        
        conn.commit()
        
        print(f"""
╔══════════════════════════════════════════════════════════════╗
║  📊 Import Summary                                           ║
╚══════════════════════════════════════════════════════════════╝

✅ Successfully imported: {insert_count} rows
⚠️  Errors: {error_count} rows
📈 Total rows processed: {len(df)} rows
        """)
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python excel_parser.py <excel_file>")
        sys.exit(1)
    
    excel_file = sys.argv[1]
    
    if not os.path.exists(excel_file):
        print(f"❌ File not found: {excel_file}")
        sys.exit(1)
    
    success = import_excel_to_db(excel_file)
    sys.exit(0 if success else 1)
