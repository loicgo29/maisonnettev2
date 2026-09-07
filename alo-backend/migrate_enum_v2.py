#!/usr/bin/env python3
"""Migrate expense_category enum to include 'trop_plein' and 'regule_periode'."""

from app.database import SessionLocal
from sqlalchemy import text

def migrate():
    db = SessionLocal()
    try:
        print("Starting migration: adding 'trop_plein' and 'regule_periode' to expense_category enum...")

        # Check current schema
        result = db.execute(text("PRAGMA table_info(expenses)"))
        columns = result.fetchall()
        print(f"Current schema: {columns}")

        # Rename old table
        print("Renaming old expenses table...")
        db.execute(text("ALTER TABLE expenses RENAME TO expenses_old"))
        db.commit()

        # Create new table with updated enum
        print("Creating new expenses table with 'trop_plein' and 'regule_periode' categories...")
        db.execute(text("""
            CREATE TABLE expenses (
                id INTEGER NOT NULL,
                date DATE NOT NULL,
                amount NUMERIC(10, 2) NOT NULL,
                label VARCHAR(255) NOT NULL,
                category VARCHAR(255) NOT NULL CHECK (category IN ('quotepart', '50/50', 'dette', 'brico', 'virement', 'trop_plein', 'regule_periode', 'divers')),
                source VARCHAR(255) NOT NULL DEFAULT 'manuel',
                status VARCHAR(255) NOT NULL DEFAULT 'draft',
                comment TEXT,
                sharing_mode VARCHAR(20),
                account_id INTEGER,
                period_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                FOREIGN KEY(account_id) REFERENCES accounts (id),
                FOREIGN KEY(period_id) REFERENCES periods (id)
            )
        """))
        db.commit()

        # Copy data
        print("Copying data from old table...")
        db.execute(text("INSERT INTO expenses SELECT * FROM expenses_old"))
        db.commit()

        # Drop old table
        print("Dropping old table...")
        db.execute(text("DROP TABLE expenses_old"))
        db.commit()

        print("✅ Migration completed successfully!")

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
