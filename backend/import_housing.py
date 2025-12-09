#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Housing Data Import Script
นำเข้าข้อมูลที่พักอาศัยจาก Excel เข้าสู่ฐานข้อมูล PostgreSQL
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import sys
import os
import re

# Database connection
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'localhost'),
    'port': os.environ.get('DB_PORT', '5432'),
    'database': os.environ.get('DB_NAME', 'forensic_hr'),
    'user': os.environ.get('DB_USER', 'postgres'),
    'password': os.environ.get('DB_PASSWORD', '')
}

def clean_value(val):
    """Clean and convert value"""
    if pd.isna(val) or val == '' or val == '-':
        return None
    if isinstance(val, str):
        val = val.strip()
        if val == '':
            return None
    return val

def clean_int(val):
    """Convert to integer or None"""
    if pd.isna(val) or val == '' or val == '-':
        return 0
    try:
        # Handle string with special characters
        if isinstance(val, str):
            val = val.replace(',', '').strip()
            if val == '' or val == 'อยู่ระหว่างก่อสร้าง':
                return 0
        return int(float(val))
    except:
        return 0

def extract_housing_type_category(housing_type):
    """Extract category from housing type"""
    if not housing_type:
        return None
    
    housing_type = str(housing_type).strip()
    
    if 'แฟลต 5 ชั้น' in housing_type:
        return 'แฟลต 5 ชั้น'
    elif 'แฟลต 4 ชั้น' in housing_type:
        return 'แฟลต 4 ชั้น'
    elif 'เรือนแถว' in housing_type:
        return 'เรือนแถว'
    elif 'บ้านพัก' in housing_type:
        return 'บ้านพัก'
    else:
        return housing_type

def parse_excel(filepath):
    """Parse Excel file and return cleaned data"""
    print(f"Reading Excel file: {filepath}")
    
    # Read Excel
    df = pd.read_excel(filepath)
    
    # Skip header row (row 0 contains column names in Thai)
    # The actual data starts from row 1
    
    # Define column mapping based on the structure
    # Column indexes: 0=ลำดับ, 1=บช., 2=บก., 3=พฐ.จว., 4=อัตราอนุญาต, 5=อัตราคนครอง,
    # 6=ที่พักทั้งหมด, 7=ชำรุด, 8=ประเภทที่พัก, 9=ปีงบ, 10=ปีใช้งาน,
    # 11=ได้รับสิทธิ, 12=บ้านส่วนตัว, 13=เบิกค่าเช่า, 14=ชื่อหน่วยงาน, 15=จำนวน, 16=ขาดแคลน, 17=หมายเหตุ
    
    records = []
    
    for idx, row in df.iterrows():
        # Skip header rows
        if idx == 0:
            continue
            
        # Get values by position
        values = row.values
        
        # Skip empty rows
        if len(values) < 10:
            continue
            
        seq = clean_value(values[0])
        if seq is None or not str(seq).isdigit():
            continue
            
        bureau = clean_value(values[1]) if len(values) > 1 else None
        division = clean_value(values[2]) if len(values) > 2 else None
        subdivision = clean_value(values[3]) if len(values) > 3 else None
        authorized_quota = clean_int(values[4]) if len(values) > 4 else 0
        current_occupants = clean_int(values[5]) if len(values) > 5 else 0
        total_rooms = clean_int(values[6]) if len(values) > 6 else 0
        damaged_rooms = clean_int(values[7]) if len(values) > 7 else 0
        housing_type = clean_value(values[8]) if len(values) > 8 else None
        budget_year = clean_int(values[9]) if len(values) > 9 else None
        operation_year = clean_int(values[10]) if len(values) > 10 else None
        entitled_stay = clean_int(values[11]) if len(values) > 11 else 0
        private_housing = clean_int(values[12]) if len(values) > 12 else 0
        rent_allowance = clean_int(values[13]) if len(values) > 13 else 0
        housing_name = clean_value(values[14]) if len(values) > 14 else None
        other_count = clean_int(values[15]) if len(values) > 15 else 0
        shortage = clean_int(values[16]) if len(values) > 16 else 0
        remarks = clean_value(values[17]) if len(values) > 17 else None
        
        # Check for under construction
        under_construction = 0
        if values[6] == 'อยู่ระหว่างก่อสร้าง' if len(values) > 6 else False:
            under_construction = 1
            total_rooms = 0
        
        # Calculate vacant rooms
        vacant_rooms = max(0, total_rooms - entitled_stay) if total_rooms > 0 else 0
        
        # Determine status
        status = 'ใช้งานได้'
        if under_construction > 0:
            status = 'อยู่ระหว่างก่อสร้าง'
        elif damaged_rooms > 0 and damaged_rooms >= total_rooms:
            status = 'ชำรุด'
        
        record = {
            'bureau': bureau or 'สพฐ.ตร.',
            'division': division,
            'subdivision': subdivision,
            'housing_type': housing_type,
            'housing_type_category': extract_housing_type_category(housing_type),
            'housing_name': housing_name,
            'total_rooms': total_rooms,
            'occupied_rooms': entitled_stay,
            'vacant_rooms': vacant_rooms,
            'damaged_rooms': damaged_rooms,
            'under_construction': under_construction,
            'authorized_quota': authorized_quota,
            'current_occupants': current_occupants,
            'entitled_stay': entitled_stay,
            'private_housing': private_housing,
            'rent_allowance': rent_allowance,
            'other_agency': other_count,
            'shortage': shortage,
            'budget_year': budget_year if budget_year and budget_year > 2000 else None,
            'operation_year': operation_year if operation_year and operation_year > 2000 else None,
            'status': status,
            'remarks': remarks
        }
        
        records.append(record)
    
    print(f"Parsed {len(records)} records")
    return records

def import_to_database(records):
    """Import records to PostgreSQL database"""
    print("Connecting to database...")
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    try:
        # Clear existing data (optional)
        # cur.execute("TRUNCATE TABLE housing RESTART IDENTITY CASCADE")
        
        # Insert records
        insert_query = """
            INSERT INTO housing (
                bureau, division, subdivision,
                housing_type, housing_name,
                total_rooms, occupied_rooms, vacant_rooms, damaged_rooms, under_construction,
                authorized_quota, current_occupants,
                entitled_stay, private_housing, rent_allowance, other_agency, shortage,
                budget_year, operation_year, status, remarks
            ) VALUES %s
        """
        
        values = [
            (
                r['bureau'], r['division'], r['subdivision'],
                r['housing_type'], r['housing_name'],
                r['total_rooms'], r['occupied_rooms'], r['vacant_rooms'], 
                r['damaged_rooms'], r['under_construction'],
                r['authorized_quota'], r['current_occupants'],
                r['entitled_stay'], r['private_housing'], r['rent_allowance'],
                r['other_agency'], r['shortage'],
                r['budget_year'], r['operation_year'], r['status'], r['remarks']
            )
            for r in records
        ]
        
        execute_values(cur, insert_query, values)
        
        conn.commit()
        print(f"Successfully imported {len(records)} records")
        
    except Exception as e:
        conn.rollback()
        print(f"Error importing data: {e}")
        raise
    finally:
        cur.close()
        conn.close()

def main():
    if len(sys.argv) < 2:
        print("Usage: python import_housing.py <excel_file>")
        print("Example: python import_housing.py housing_data.xlsx")
        sys.exit(1)
    
    filepath = sys.argv[1]
    
    if not os.path.exists(filepath):
        print(f"Error: File not found: {filepath}")
        sys.exit(1)
    
    # Parse Excel
    records = parse_excel(filepath)
    
    if not records:
        print("No records to import")
        sys.exit(1)
    
    # Preview first 3 records
    print("\nPreview of first 3 records:")
    for i, r in enumerate(records[:3]):
        print(f"\n--- Record {i+1} ---")
        print(f"  Division: {r['division']}")
        print(f"  Subdivision: {r['subdivision']}")
        print(f"  Type: {r['housing_type']}")
        print(f"  Rooms: {r['total_rooms']} (Damaged: {r['damaged_rooms']})")
        print(f"  Quota: {r['authorized_quota']} / Occupants: {r['current_occupants']}")
        print(f"  Shortage: {r['shortage']}")
    
    # Confirm import
    print(f"\nTotal records to import: {len(records)}")
    
    # Import to database
    import_to_database(records)
    
    print("\nImport completed!")

if __name__ == '__main__':
    main()
