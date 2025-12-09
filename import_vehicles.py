#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
import os
import sys

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'forensic_hr'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', '')
}

def clean_data(value):
    if pd.isna(value) or value == '' or value == 'nan':
        return None
    return str(value).strip()

def parse_date(date_value):
    if pd.isna(date_value):
        return None
    try:
        if isinstance(date_value, str):
            return pd.to_datetime(date_value).date()
        elif isinstance(date_value, datetime):
            return date_value.date()
        else:
            return pd.to_datetime(date_value).date()
    except:
        return None

def import_vehicles(excel_file):
    print("🚀 เริ่มต้นนำเข้าข้อมูลยานพาหนะ...")
    print(f"📁 ไฟล์: {excel_file}")
    
    try:
        df = pd.read_excel(excel_file, sheet_name=0, skiprows=1)
        print(f"✅ อ่านไฟล์สำเร็จ: {len(df)} รายการ")
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาดในการอ่านไฟล์: {e}")
        return False
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        print(f"✅ เชื่อมต่อฐานข้อมูลสำเร็จ")
    except Exception as e:
        print(f"❌ ไม่สามารถเชื่อมต่อฐานข้อมูล: {e}")
        return False
    
    try:
        cur.execute("TRUNCATE TABLE vehicles RESTART IDENTITY CASCADE")
        conn.commit()
        print("🗑️  ลบข้อมูลเก่าออกแล้ว")
    except Exception as e:
        print(f"⚠️  เตือน: {e}")
        conn.rollback()
    
    vehicles_data = []
    success_count = 0
    error_count = 0
    
    for idx, row in df.iterrows():
        try:
            unit = clean_data(row['หน่วยงาน'])
            department_code = clean_data(row['บก.'])
            bureau_code = clean_data(row['บช.'])
            vehicle_type = clean_data(row['ประเภทรถ'])
            mission = clean_data(row['ภารกิจ'])
            
            try:
                engine_capacity = float(row['ปริมาตรกระบอกสูบ']) if pd.notna(row['ปริมาตรกระบอกสูบ']) else None
            except:
                engine_capacity = None
            
            brand = clean_data(row['ยี่ห้อ'])
            license_plate = clean_data(row['ทะเบียน'])
            acquired_date = parse_date(row['วันที่รับมา'])
            vehicle_age = clean_data(row['อายุรถ ใส่เฉพาะตัวเลข  ปี เดือน'])
            status = clean_data(row['สถานภาพ']) or 'ใช้งานได้'
            remarks = clean_data(row['หมายเหตุ'])
            
            vehicles_data.append((
                unit, department_code, bureau_code, vehicle_type, mission,
                engine_capacity, brand, license_plate, acquired_date,
                vehicle_age, status, remarks
            ))
            
            success_count += 1
            
        except Exception as e:
            error_count += 1
            print(f"⚠️  แถวที่ {idx + 2}: {e}")
            continue
    
    if vehicles_data:
        try:
            insert_query = """
                INSERT INTO vehicles (
                    unit, department_code, bureau_code, vehicle_type, mission,
                    engine_capacity, brand, license_plate, acquired_date,
                    vehicle_age, status, remarks
                ) VALUES %s
            """
            
            execute_values(cur, insert_query, vehicles_data)
            conn.commit()
            
            print(f"\n✅ นำเข้าข้อมูลสำเร็จ!")
            print(f"   📊 สำเร็จ: {success_count} รายการ")
            print(f"   ❌ ผิดพลาด: {error_count} รายการ")
            
            cur.execute("SELECT COUNT(*) FROM vehicles")
            total = cur.fetchone()[0]
            print(f"   💾 ข้อมูลทั้งหมดในฐานข้อมูล: {total} รายการ")
            
            cur.close()
            conn.close()
            return True
            
        except Exception as e:
            print(f"❌ เกิดข้อผิดพลาดในการนำเข้าข้อมูล: {e}")
            conn.rollback()
            cur.close()
            conn.close()
            return False
    else:
        print("❌ ไม่มีข้อมูลสำหรับนำเข้า")
        cur.close()
        conn.close()
        return False

def main():
    if len(sys.argv) < 2:
        print("❌ กรุณาระบุไฟล์ Excel")
        print(f"📖 วิธีใช้: python3 {sys.argv[0]} <excel_file>")
        sys.exit(1)
    
    excel_file = sys.argv[1]
    
    if not os.path.exists(excel_file):
        print(f"❌ ไม่พบไฟล์: {excel_file}")
        sys.exit(1)
    
    print("="*60)
    print("🚗 โปรแกรมนำเข้าข้อมูลยานพาหนะ")
    print("="*60)
    print()
    
    success = import_vehicles(excel_file)
    
    if success:
        print("\n✅ เสร็จสิ้นกระบวนการนำเข้าข้อมูล")
        sys.exit(0)
    else:
        print("\n❌ เกิดข้อผิดพลาดในการนำเข้าข้อมูล")
        sys.exit(1)

if __name__ == "__main__":
    main()
