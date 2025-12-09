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
    
    updated = 0
    
    for idx, row in df.iterrows():
        full_name = row.get('ชื่อ-นามสกุล')
        rank = row.get('ยศ')
        department = row.get('สังกัด')
        headquarters = row.get('บก.')
        vacancy_col = row.get('ว่าง')  # ใช้ column นี้!
        
        # กำหนด vacancy_status จาก column 'ว่าง'
        if pd.notna(vacancy_col) and str(vacancy_col).strip() == 'ว่าง':
            vacancy_status = 'ตำแหน่งว่าง'
        elif pd.notna(vacancy_col) and str(vacancy_col).strip() == 'คนครอง':
            vacancy_status = 'คนครอง'
        else:
            vacancy_status = None
        
        # Update ถ้ามีชื่อ + ยศ
        if pd.notna(full_name) and pd.notna(rank) and 'ตำแหน่งว่าง' not in str(full_name):
            try:
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
                    updated += 1
                        
            except Exception as e:
                print(f"Error at row {idx}: {e}")
                continue
        
        if (idx + 1) % 100 == 0:
            print(f"Processed {idx + 1} rows...")
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"✅ Updated: {updated} records")

if __name__ == '__main__':
    print("=== Updating from สัญญาบัตร.xlsx ===")
    update_from_excel('สัญญาบัตร.xlsx')
    
    print("\n=== Updating from ประทวน.xlsx ===")
    update_from_excel('ประทวน.xlsx')
    
    print("\n🎉 All done!")
