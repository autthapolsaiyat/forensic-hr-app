import pandas as pd
import psycopg2

DB_CONFIG = {
    'host': 'forensic-hr-db.postgres.database.azure.com',
    'database': 'forensic_hr',
    'user': 'forensicadmin',
    'password': 'ForensicHR2025!Strong',
    'port': 5432,
    'sslmode': 'require'
}

def update_from_excel(file_path):
    print(f"\n📂 Reading {file_path}...")
    df = pd.read_excel(file_path)
    
    print(f"Total rows: {len(df)}")
    
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    updated_krong = 0
    updated_wang = 0
    not_found = 0
    
    for idx, row in df.iterrows():
        full_name = row.get('ชื่อ-นามสกุล')
        rank = row.get('ยศ')
        position = row.get('ชื่อตำแหน่ง')
        department = row.get('สังกัด')
        headquarters = row.get('บก.')
        vacancy_col = row.get('ว่าง')
        gender = row.get('เพศ')
        order_num = row.get('ลำดับ')
        
        # กำหนด vacancy_status
        if pd.notna(vacancy_col):
            if str(vacancy_col).strip() == 'ว่าง':
                vacancy_status = 'ตำแหน่งว่าง'
            elif str(vacancy_col).strip() == 'คนครอง':
                vacancy_status = 'คนครอง'
            else:
                vacancy_status = None
        else:
            vacancy_status = None
        
        if vacancy_status is None:
            continue
        
        try:
            # กรณี 1: มีชื่อเต็ม + ยศ (คนครอง)
            if pd.notna(full_name) and pd.notna(rank) and 'ตำแหน่งว่าง' not in str(full_name):
                cursor.execute("""
                    UPDATE personnel 
                    SET vacancy_status = %s,
                        department = COALESCE(%s, department),
                        headquarters = COALESCE(%s, headquarters)
                    WHERE full_name = %s AND rank = %s
                """, (vacancy_status, 
                      str(department) if pd.notna(department) else None,
                      str(headquarters) if pd.notna(headquarters) else None,
                      str(full_name), 
                      str(rank)))
                
                if cursor.rowcount > 0:
                    updated_krong += 1
                else:
                    not_found += 1
            
            # กรณี 2: ตำแหน่งว่าง (match โดย position + department + headquarters)
            elif vacancy_status == 'ตำแหน่งว่าง' and pd.notna(position):
                # ลอง match หลายเงื่อนไข
                where_conditions = ["position = %s"]
                params = [str(position)]
                
                if pd.notna(department):
                    where_conditions.append("department = %s")
                    params.append(str(department))
                
                if pd.notna(headquarters):
                    where_conditions.append("headquarters = %s")
                    params.append(str(headquarters))
                
                if pd.notna(gender):
                    where_conditions.append("gender = %s")
                    params.append(str(gender))
                
                # ลองหา record ที่ vacancy_status ยัง NULL หรือเป็น 'คนครอง' แต่ไม่มีชื่อ
                where_conditions.append("(vacancy_status IS NULL OR (full_name IS NULL OR full_name = '' OR full_name = 'ตำแหน่งว่าง'))")
                
                query = f"""
                    UPDATE personnel 
                    SET vacancy_status = %s,
                        department = COALESCE(%s, department),
                        headquarters = COALESCE(%s, headquarters)
                    WHERE {' AND '.join(where_conditions)}
                    AND id IN (
                        SELECT id FROM personnel 
                        WHERE {' AND '.join(where_conditions)}
                        LIMIT 1
                    )
                """
                
                params_full = [vacancy_status,
                              str(department) if pd.notna(department) else None,
                              str(headquarters) if pd.notna(headquarters) else None] + params + params
                
                cursor.execute(query, params_full)
                
                if cursor.rowcount > 0:
                    updated_wang += 1
                else:
                    not_found += 1
                    
        except Exception as e:
            print(f"Error at row {idx}: {e}")
            continue
        
        if (idx + 1) % 100 == 0:
            print(f"Processed {idx + 1} rows...")
            conn.commit()  # Commit ทุก 100 rows
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"✅ Updated คนครอง: {updated_krong}")
    print(f"✅ Updated ตำแหน่งว่าง: {updated_wang}")
    print(f"⚠️  Not found: {not_found}")

if __name__ == '__main__':
    print("=== Updating from สัญญาบัตร.xlsx ===")
    update_from_excel('สัญญาบัตร.xlsx')
    
    print("\n=== Updating from ประทวน.xlsx ===")
    update_from_excel('ประทวน.xlsx')
    
    print("\n🎉 All done!")
