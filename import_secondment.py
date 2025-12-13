import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

# Database connection
conn = psycopg2.connect(
    host="forensic-hr-db.postgres.database.azure.com",
    database="forensic_hr",
    user="forensicadmin",
    password="2009@ThekilL",
    sslmode="require"
)
cur = conn.cursor()

# Read Excel
df = pd.read_excel('ไปช่วย.xlsx', header=1)

# Rename columns
df.columns = ['no', 'rank', 'gender', 'first_name', 'last_name', 'position', 'origin_unit', 'destination_unit', 'period', 'note']

# Clean data
df['gender'] = df['gender'].fillna('ชาย')  # Default male if not specified
df['first_name'] = df['first_name'].fillna('')
df['last_name'] = df['last_name'].fillna('')
df['full_name'] = df['rank'].astype(str) + ' ' + df['first_name'].astype(str) + ' ' + df['last_name'].astype(str)

print(f"Total records: {len(df)}")
print(df[['rank', 'full_name', 'origin_unit', 'destination_unit']].head())

# Clear existing data
cur.execute("DELETE FROM secondment")
print("Cleared existing data")

# Insert data
data = []
for _, row in df.iterrows():
    data.append((
        str(row['rank']).strip() if pd.notna(row['rank']) else '',
        str(row['gender']).strip() if pd.notna(row['gender']) else 'ชาย',
        str(row['first_name']).strip() if pd.notna(row['first_name']) else '',
        str(row['last_name']).strip() if pd.notna(row['last_name']) else '',
        str(row['full_name']).strip(),
        str(row['position']).strip() if pd.notna(row['position']) else '',
        str(row['origin_unit']).strip() if pd.notna(row['origin_unit']) else '',
        str(row['destination_unit']).strip() if pd.notna(row['destination_unit']) else '',
        str(row['period']).strip() if pd.notna(row['period']) else '',
        str(row['note']).strip() if pd.notna(row['note']) else ''
    ))

insert_sql = """
    INSERT INTO secondment (rank, gender, first_name, last_name, full_name, position, origin_unit, destination_unit, period, note)
    VALUES %s
"""
execute_values(cur, insert_sql, data)
conn.commit()

print(f"✅ Imported {len(data)} records successfully!")

# Verify
cur.execute("SELECT COUNT(*) FROM secondment")
count = cur.fetchone()[0]
print(f"Total in database: {count}")

# Show summary by origin unit
cur.execute("""
    SELECT origin_unit, COUNT(*) as count 
    FROM secondment 
    GROUP BY origin_unit 
    ORDER BY count DESC
""")
print("\n📊 Summary by Origin Unit:")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]} คน")

cur.close()
conn.close()
