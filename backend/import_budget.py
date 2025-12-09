#!/usr/bin/env python3
"""
Budget Import Script - นำเข้าข้อมูลงบลงทุนจาก Excel
Phase 5: Budget/Investment Management System
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import sys
import os
import re
from datetime import datetime

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

def clean_amount(val):
    """Clean and convert amount to float"""
    if pd.isna(val) or val == '' or val == '-':
        return None
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        # Remove commas, newlines, spaces
        cleaned = re.sub(r'[,\s\n]', '', val)
        try:
            return float(cleaned)
        except:
            return None
    return None

def clean_int(val):
    """Clean and convert to integer"""
    if pd.isna(val) or val == '' or val == '-':
        return None
    try:
        return int(float(val))
    except:
        return None

def parse_date(val):
    """Parse date from various formats"""
    if pd.isna(val) or val == '' or val == '-':
        return None
    
    if isinstance(val, datetime):
        return val.date()
    
    if isinstance(val, pd.Timestamp):
        return val.date()
    
    if isinstance(val, str):
        val = val.strip().replace('\n', '')
        # Try various formats
        formats = [
            '%Y-%m-%d',
            '%d/%m/%Y',
            '%d/%m/%y',
            '%Y-%m-%d %H:%M:%S'
        ]
        for fmt in formats:
            try:
                return datetime.strptime(val, fmt).date()
            except:
                continue
    return None

def parse_fiscal_year(val):
    """Parse fiscal year and return (fiscal_year, start, end)"""
    if pd.isna(val) or val == '':
        return None, None, None
    
    val = str(val).strip()
    
    # Check for range: "2569 - 2570"
    match = re.match(r'(\d{4})\s*-\s*(\d{4})', val)
    if match:
        start = int(match.group(1))
        end = int(match.group(2))
        return val, start, end
    
    # Single year
    match = re.match(r'(\d{4})', val)
    if match:
        year = int(match.group(1))
        return val, year, year
    
    return val, None, None

def determine_status_group(status):
    """Determine status group from status text"""
    if not status:
        return 'pending'
    
    status_lower = status.lower()
    
    if 'ลงนาม' in status:
        return 'signed'
    elif 'ผู้ชนะ' in status:
        return 'winner_announced'
    elif 'อุทธรณ์' in status:
        return 'appeal_period'
    elif 'เชิญชวน' in status or 'ประกาศ' in status:
        return 'announcement'
    elif 'tor' in status_lower or 'ราคากลาง' in status:
        return 'tor_approval'
    elif 'เผยแพร่' in status or 'ร่าง' in status:
        return 'draft'
    else:
        return 'in_progress'

def read_excel(filepath):
    """Read and parse Excel file"""
    print(f"Reading Excel file: {filepath}")
    
    # Read with header
    df = pd.read_excel(filepath, header=0)
    
    print(f"Columns found: {df.columns.tolist()}")
    print(f"Total rows: {len(df)}")
    
    records = []
    
    for idx, row in df.iterrows():
        # Skip header or note rows
        first_col = row.iloc[0]
        if pd.isna(first_col) or str(first_col).startswith('หมายเหตุ'):
            continue
        
        try:
            seq = clean_int(row.iloc[0])
            if not seq:
                continue
        except:
            continue
        
        # Determine column positions based on file structure
        # File has 15 columns with category in column 2
        if len(df.columns) >= 15:
            division = clean_value(row.iloc[1])
            category = clean_value(row.iloc[2])
            project_name = clean_value(row.iloc[3])
            project_type = clean_value(row.iloc[4])
            status = clean_value(row.iloc[5])
            contract_amount = clean_amount(row.iloc[6])
            fiscal_year_raw = clean_value(row.iloc[7])
            budget_type = clean_value(row.iloc[8])
            contract_date = parse_date(row.iloc[9])
            end_date = parse_date(row.iloc[10])
            installments = clean_int(row.iloc[11])
            contractor = clean_value(row.iloc[12])
            progress = clean_amount(row.iloc[13])
            remarks = clean_value(row.iloc[14]) if len(row) > 14 else None
        else:
            # 14 column format without category
            division = clean_value(row.iloc[1])
            category = None
            project_name = clean_value(row.iloc[2])
            project_type = clean_value(row.iloc[3])
            status = clean_value(row.iloc[4])
            contract_amount = clean_amount(row.iloc[5])
            fiscal_year_raw = clean_value(row.iloc[6])
            budget_type = clean_value(row.iloc[7])
            contract_date = parse_date(row.iloc[8])
            end_date = parse_date(row.iloc[9])
            installments = clean_int(row.iloc[10])
            contractor = clean_value(row.iloc[11])
            progress = clean_amount(row.iloc[12])
            remarks = clean_value(row.iloc[13]) if len(row) > 13 else None
        
        # Parse fiscal year
        fiscal_year, fiscal_year_start, fiscal_year_end = parse_fiscal_year(fiscal_year_raw)
        
        # Determine status group
        status_group = determine_status_group(status)
        
        # Clean contractor name
        if contractor:
            contractor = contractor.replace('\n', ' ').strip()
        
        # Clean status
        if status:
            status = status.replace('\n', ' ').strip()
        
        record = {
            'division': division,
            'category': category,
            'project_name': project_name,
            'project_type': project_type,
            'status': status,
            'status_group': status_group,
            'contract_amount': contract_amount,
            'fiscal_year': fiscal_year,
            'fiscal_year_start': fiscal_year_start,
            'fiscal_year_end': fiscal_year_end,
            'budget_type': budget_type,
            'contract_date': contract_date,
            'end_date': end_date,
            'installments': installments,
            'contractor': contractor,
            'progress': progress,
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
        'division', 'category', 'project_name', 'project_type',
        'status', 'status_group', 'contract_amount',
        'fiscal_year', 'fiscal_year_start', 'fiscal_year_end', 'budget_type',
        'contract_date', 'end_date', 'installments', 'contractor',
        'progress', 'remarks'
    ]
    
    values = []
    for r in records:
        values.append((
            r['division'], r['category'], r['project_name'], r['project_type'],
            r['status'], r['status_group'], r['contract_amount'],
            r['fiscal_year'], r['fiscal_year_start'], r['fiscal_year_end'], r['budget_type'],
            r['contract_date'], r['end_date'], r['installments'], r['contractor'],
            r['progress'], r['remarks']
        ))
    
    # Clear existing data
    cur.execute("DELETE FROM budget")
    
    # Bulk insert
    insert_query = f"""
        INSERT INTO budget ({', '.join(columns)})
        VALUES %s
    """
    
    execute_values(cur, insert_query, values)
    
    conn.commit()
    cur.close()
    conn.close()
    
    print(f"Successfully imported {len(records)} records")

def main():
    if len(sys.argv) < 2:
        print("Usage: python import_budget.py <excel_file>")
        sys.exit(1)
    
    filepath = sys.argv[1]
    
    if not os.path.exists(filepath):
        print(f"Error: File not found: {filepath}")
        sys.exit(1)
    
    # Read Excel
    records = read_excel(filepath)
    print(f"\nParsed {len(records)} records")
    
    # Preview
    print("\nPreview of first 3 records:")
    for i, r in enumerate(records[:3]):
        print(f"\n--- Record {i+1} ---")
        print(f"  Division: {r['division']}")
        print(f"  Category: {r['category']}")
        print(f"  Project: {r['project_name'][:60]}..." if r['project_name'] and len(r['project_name']) > 60 else f"  Project: {r['project_name']}")
        print(f"  Type: {r['project_type']}")
        print(f"  Status: {r['status_group']} ({r['status'][:30]}...)" if r['status'] and len(r['status']) > 30 else f"  Status: {r['status_group']} ({r['status']})")
        print(f"  Amount: {r['contract_amount']:,.2f}" if r['contract_amount'] else "  Amount: -")
        print(f"  Year: {r['fiscal_year']} ({r['fiscal_year_start']}-{r['fiscal_year_end']})")
        print(f"  Budget Type: {r['budget_type']}")
    
    print(f"\nTotal records to import: {len(records)}")
    
    # Import
    import_to_db(records)
    
    print("\nImport completed!")

if __name__ == "__main__":
    main()
