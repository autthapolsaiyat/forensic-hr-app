#!/usr/bin/env python3
"""
Building Import Script - นำเข้าข้อมูลอาคารที่ทำการจาก Excel
Phase 6: Building Management System
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import sys
import os
import re

# Database configuration
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'forensic-hr-db.postgres.database.azure.com'),
    'port': os.environ.get('DB_PORT', '5432'),
    'database': os.environ.get('DB_NAME', 'forensic_hr'),
    'user': os.environ.get('DB_USER', 'forensicadmin'),
    'password': os.environ.get('DB_PASSWORD', '2009@ThekilL'),
    'sslmode': 'require'
}

def clean_value(val):
    """Clean and normalize value"""
    if pd.isna(val) or val == '' or val == '-':
        return None
    if isinstance(val, str):
        return val.strip()
    return val

def clean_int(val):
    """Clean and convert to integer"""
    if pd.isna(val) or val == '' or val == '-':
        return None
    try:
        return int(float(val))
    except:
        return None

def determine_ownership_status(building_type, land_type, remarks):
    """Determine ownership status from building data"""
    building_type_str = str(building_type) if building_type else ''
    land_type_str = str(land_type) if land_type else ''
    remarks_str = str(remarks) if remarks else ''
    
    combined = (building_type_str + land_type_str + remarks_str).lower()
    
    # ใช้ที่ทำการของหน่วยอื่น
    if 'ใช้ที่ทำการของหน่วย' in building_type_str or 'ใช้พื้นที่' in building_type_str:
        return 'use_other'
    
    # รองบประมาณ
    if 'รองบประมาณ' in combined or 'ที่ดินพร้อมรองบ' in combined:
        return 'wait_budget'
    
    # จัดหาที่ดิน
    if 'จัดหาที่' in combined or 'ระหว่างจัดหา' in combined:
        return 'finding_land'
    
    # มีที่ทำการ (default if has building info)
    if building_type_str and 'อาคาร' in building_type_str:
        return 'has_building'
    
    # Default
    return 'has_building'

def normalize_division(division):
    """Normalize division name"""
    if not division:
        return None
    
    division = str(division).strip()
    
    # Mapping for consistent names
    mappings = {
        'ศพฐ.1(ปทุมธานี)': 'ศพฐ.1',
        'ศพฐ.2 (ชลบุรี)': 'ศพฐ.2',
        'ศพฐ.3(นครราชสีมา)': 'ศพฐ.3',
        'ศพฐ.4 (ขอนแก่น)': 'ศพฐ.4',
        'ศพฐ.5(ลำปาง)': 'ศพฐ.5',
        'ศพฐ.6(พิษณุโลก)': 'ศพฐ.6',
        'ศพฐ.7(นครปฐม)': 'ศพฐ.7',
        'ศพฐ.8(สุราษฎร์ธานี)': 'ศพฐ.8',
        'ศพฐ.9(สงขลา)': 'ศพฐ.9',
        'ศพฐ.10(ยะลา)': 'ศพฐ.10',
    }
    
    return mappings.get(division, division)

def read_excel(filepath):
    """Read and parse Excel file"""
    print(f"Reading Excel file: {filepath}")
    
    # Read with header at row 1
    df = pd.read_excel(filepath, header=1)
    
    print(f"Columns found: {df.columns.tolist()}")
    print(f"Total rows: {len(df)}")
    
    records = []
    
    for idx, row in df.iterrows():
        # Skip empty rows
        seq = row.iloc[0]
        if pd.isna(seq):
            continue
        
        try:
            seq_int = int(float(seq))
        except:
            continue
        
        bureau = clean_value(row.get('บช.'))
        division_raw = clean_value(row.get('บก.'))
        subdivision = clean_value(row.get('พฐ.จว.'))
        building_name = clean_value(row.get('ชื่อ'))
        building_count = clean_int(row.get('จำนวน'))
        building_size = clean_value(row.get('ขนาด'))
        budget_year = clean_value(row.get('ปี พ.ศ.ที่ได้รับงบ'))
        operation_year = clean_value(row.get('ปี พ.ศ.ที่ใช้งาน'))
        building_age = clean_int(row.get('อายุอาคาร'))
        status = clean_value(row.get('สถานภาพ'))
        building_type = clean_value(row.get('ประเภทอาคาร'))
        land_type = clean_value(row.get('ประเภทที่ดินที่ก่อสร้าง'))
        land_area = clean_value(row.get('จำนวนเนื้อที่ทั้งหมด (ไร่-งาน-วา)'))
        subdistrict = clean_value(row.get('สถานที่ก่อสร้าง (ตำบล)'))
        district = clean_value(row.get('สถานที่ก่อสร้าง (อำเภอ)'))
        province = clean_value(row.get('สถานที่ก่อสร้าง (จังหวัด)'))
        coordinates = clean_value(row.get('พิกัด'))
        remarks = clean_value(row.get('หมายเหตุ'))
        
        # Normalize division
        division = normalize_division(division_raw)
        
        # If division is empty, try to get from previous row or bureau
        if not division and bureau:
            division = bureau
        
        # Extract land doc number from land_type
        land_doc_number = None
        if land_type and 'เลขที่' in land_type:
            match = re.search(r'เลขที่\s*([^\s]+)', land_type)
            if match:
                land_doc_number = match.group(1)
        
        # Determine ownership status
        ownership_status = determine_ownership_status(building_type, land_type, remarks)
        
        # Normalize status
        if status:
            status = status.strip()
        
        # Parse coordinates if available
        location_lat = None
        location_lng = None
        if coordinates:
            # Try to parse coordinates
            parts = str(coordinates).split(',')
            if len(parts) == 2:
                try:
                    location_lat = float(parts[0].strip())
                    location_lng = float(parts[1].strip())
                except:
                    pass
        
        record = {
            'bureau': bureau or 'สพฐ.ตร.',
            'division': division,
            'subdivision': subdivision,
            'building_name': building_name,
            'building_count': building_count or 1,
            'building_size': building_size,
            'building_type': building_type,
            'budget_year': str(budget_year) if budget_year else None,
            'operation_year': str(operation_year) if operation_year else None,
            'building_age': building_age,
            'status': status,
            'ownership_status': ownership_status,
            'land_type': land_type,
            'land_doc_number': land_doc_number,
            'land_area': land_area,
            'subdistrict': subdistrict,
            'district': district,
            'province': province,
            'location_lat': location_lat,
            'location_lng': location_lng,
            'master_plan_url': None,
            'remarks': remarks
        }
        
        records.append(record)
    
    return records

def import_to_db(records):
    """Import records to database"""
    print(f"\nConnecting to database...")
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # Prepare data for bulk insert
    columns = [
        'bureau', 'division', 'subdivision',
        'building_name', 'building_count', 'building_size', 'building_type',
        'budget_year', 'operation_year', 'building_age',
        'status', 'ownership_status',
        'land_type', 'land_doc_number', 'land_area',
        'subdistrict', 'district', 'province',
        'location_lat', 'location_lng',
        'master_plan_url', 'remarks'
    ]
    
    values = []
    for r in records:
        values.append((
            r['bureau'], r['division'], r['subdivision'],
            r['building_name'], r['building_count'], r['building_size'], r['building_type'],
            r['budget_year'], r['operation_year'], r['building_age'],
            r['status'], r['ownership_status'],
            r['land_type'], r['land_doc_number'], r['land_area'],
            r['subdistrict'], r['district'], r['province'],
            r['location_lat'], r['location_lng'],
            r['master_plan_url'], r['remarks']
        ))
    
    # Clear existing data
    cur.execute("DELETE FROM building")
    
    # Bulk insert
    insert_query = f"""
        INSERT INTO building ({', '.join(columns)})
        VALUES %s
    """
    
    execute_values(cur, insert_query, values)
    
    conn.commit()
    cur.close()
    conn.close()
    
    print(f"Successfully imported {len(records)} records")

def main():
    if len(sys.argv) < 2:
        print("Usage: python import_building.py <excel_file>")
        sys.exit(1)
    
    filepath = sys.argv[1]
    
    if not os.path.exists(filepath):
        print(f"Error: File not found: {filepath}")
        sys.exit(1)
    
    # Read Excel
    records = read_excel(filepath)
    print(f"\nParsed {len(records)} records")
    
    # Preview
    print("\nPreview of first 5 records:")
    for i, r in enumerate(records[:5]):
        print(f"\n--- Record {i+1} ---")
        print(f"  Division: {r['division']}")
        print(f"  Subdivision: {r['subdivision']}")
        print(f"  Building: {r['building_name']}")
        print(f"  Type: {r['building_type'][:50] if r['building_type'] else '-'}...")
        print(f"  Status: {r['status']}")
        print(f"  Ownership: {r['ownership_status']}")
        print(f"  Province: {r['province']}")
    
    # Stats
    print("\n=== Statistics ===")
    ownership_counts = {}
    division_counts = {}
    for r in records:
        os = r['ownership_status']
        ownership_counts[os] = ownership_counts.get(os, 0) + 1
        div = r['division']
        division_counts[div] = division_counts.get(div, 0) + 1
    
    print("\nBy Ownership Status:")
    for k, v in sorted(ownership_counts.items()):
        print(f"  {k}: {v}")
    
    print("\nBy Division:")
    for k, v in sorted(division_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {k}: {v}")
    
    print(f"\nTotal records to import: {len(records)}")
    
    # Import
    import_to_db(records)
    
    print("\nImport completed!")

if __name__ == "__main__":
    main()
