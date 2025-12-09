#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Import Equipment Data from Excel to PostgreSQL
Phase 3: ระบบจัดการครุภัณฑ์/สินทรัพย์
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import os
import re
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'forensic-hr-db.postgres.database.azure.com'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'forensic_hr'),
    'user': os.getenv('DB_USER', 'forensicadmin'),
    'password': os.getenv('DB_PASSWORD'),
    'sslmode': 'require'
}

def get_category(item_name):
    """Extract category from item name"""
    if not item_name or pd.isna(item_name):
        return 'อื่นๆ'
    
    item_name = str(item_name).strip()
    
    # Define category patterns
    categories = {
        'โต๊ะ': ['โต๊ะ'],
        'เก้าอี้': ['เก้าอี้'],
        'ตู้': ['ตู้'],
        'เครื่องคอมพิวเตอร์': ['เครื่องคอมพิวเตอร์', 'คอมพิวเตอร์', 'Computer', 'PC'],
        'เครื่องพิมพ์': ['เครื่องพิมพ์', 'Printer'],
        'เครื่องปรับอากาศ': ['เครื่องปรับอากาศ', 'แอร์'],
        'เครื่องสำรองไฟ': ['เครื่องสำรองไฟ', 'UPS'],
        'เครื่องฟอกอากาศ': ['เครื่องฟอกอากาศ'],
        'โทรทัศน์': ['โทรทัศน์', 'TV', 'ทีวี'],
        'กล้อง': ['กล้อง', 'Camera'],
        'โทรศัพท์': ['โทรศัพท์'],
        'เครื่องถ่ายเอกสาร': ['เครื่องถ่ายเอกสาร'],
        'เครื่องทำลายเอกสาร': ['เครื่องทำลายเอกสาร'],
        'พัดลม': ['พัดลม'],
        'ตู้เย็น': ['ตู้เย็น'],
        'เครื่องดูดฝุ่น': ['เครื่องดูดฝุ่น'],
    }
    
    for category, patterns in categories.items():
        for pattern in patterns:
            if pattern in item_name:
                return category
    
    # Default: use first word
    first_word = item_name.split()[0] if item_name.split() else 'อื่นๆ'
    return first_word

def clean_year(year_value):
    """Clean and validate year value"""
    if pd.isna(year_value) or year_value == '-':
        return None
    
    try:
        year = int(float(year_value))
        # Valid Buddhist Era year range
        if 2500 <= year <= 2600:
            return year
        return None
    except:
        return None

def clean_quantity(qty_value):
    """Clean quantity value"""
    if pd.isna(qty_value):
        return 1
    try:
        return int(float(qty_value))
    except:
        return 1

def import_equipment(excel_path):
    """Import equipment data from Excel file"""
    
    print(f"📂 Reading Excel file: {excel_path}")
    
    # Read Excel with header on row 1 (0-indexed)
    df = pd.read_excel(excel_path, header=1)
    
    print(f"📊 Found {len(df)} rows")
    
    # Rename columns for clarity
    column_mapping = {
        'ลำดับ': 'sequence_no',
        'บช.': 'bureau',
        'บก.': 'division',
        'กก./พฐ.จว.': 'unit',
        'รายการ': 'item_name',
        'เลขครุภัณฑ์': 'equipment_code',
        'ปี พ.ศ.ที่ได้รับ': 'acquired_year',
        'จำนวน': 'quantity',
        'ภาพถ่าย': 'photo_url',
        'หมายเหตุ': 'remarks'
    }
    
    df = df.rename(columns=column_mapping)
    
    # Clean data
    df['acquired_year'] = df['acquired_year'].apply(clean_year)
    df['quantity'] = df['quantity'].apply(clean_quantity)
    df['category'] = df['item_name'].apply(get_category)
    df['status'] = 'ใช้งานได้'  # Default status
    
    # Replace NaN with None
    df = df.where(pd.notnull(df), None)
    
    # Convert equipment_code to string
    df['equipment_code'] = df['equipment_code'].apply(lambda x: str(x) if x else None)
    
    print(f"✅ Data cleaned")
    print(f"   - Categories found: {df['category'].nunique()}")
    print(f"   - Units found: {df['unit'].nunique()}")
    
    # Connect to database
    print(f"\n🔗 Connecting to database...")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    try:
        # Clear existing data (optional)
        print("🗑️  Clearing existing equipment data...")
        cur.execute("DELETE FROM equipment")
        
        # Prepare data for insert
        columns = ['sequence_no', 'bureau', 'division', 'unit', 'item_name', 
                   'equipment_code', 'acquired_year', 'quantity', 'photo_url', 
                   'remarks', 'status', 'category']
        
        values = []
        for _, row in df.iterrows():
            values.append((
                row.get('sequence_no'),
                row.get('bureau'),
                row.get('division'),
                row.get('unit'),
                row.get('item_name'),
                row.get('equipment_code'),
                row.get('acquired_year'),
                row.get('quantity', 1),
                row.get('photo_url'),
                row.get('remarks'),
                row.get('status', 'ใช้งานได้'),
                row.get('category')
            ))
        
        # Insert data
        print(f"📥 Inserting {len(values)} records...")
        
        insert_query = """
            INSERT INTO equipment 
            (sequence_no, bureau, division, unit, item_name, equipment_code, 
             acquired_year, quantity, photo_url, remarks, status, category)
            VALUES %s
        """
        
        execute_values(cur, insert_query, values, page_size=100)
        
        conn.commit()
        print(f"✅ Successfully imported {len(values)} equipment records!")
        
        # Show summary
        cur.execute("SELECT COUNT(*) FROM equipment")
        total = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(DISTINCT unit) FROM equipment")
        units = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(DISTINCT category) FROM equipment")
        categories = cur.fetchone()[0]
        
        print(f"\n📊 Import Summary:")
        print(f"   - Total records: {total}")
        print(f"   - Units: {units}")
        print(f"   - Categories: {categories}")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        excel_path = sys.argv[1]
    else:
        excel_path = "รายการค_ร_ภ_ณฑ_.xlsx"
    
    import_equipment(excel_path)
