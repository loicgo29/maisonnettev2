"""Add 'divers' to expense_category enum.

This migration adds the 'divers' category to the expense_category enum
to support categorizing expenses that don't fit other categories.
"""

from sqlalchemy import text


def upgrade(db):
    """Add 'divers' to expense_category enum."""
    # For SQLite, we need to recreate the table with the new enum
    db.execute(text("""
        ALTER TABLE expenses RENAME TO expenses_old;
    """))

    db.execute(text("""
        CREATE TABLE expenses (
            id INTEGER NOT NULL,
            date DATE NOT NULL,
            amount NUMERIC(10, 2) NOT NULL,
            label VARCHAR(255) NOT NULL,
            category VARCHAR(255) NOT NULL CHECK (category IN ('quotepart', '50/50', 'dette', 'brico', 'virement', 'divers')),
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
        );
    """))

    db.execute(text("""
        INSERT INTO expenses
        SELECT * FROM expenses_old;
    """))

    db.execute(text("""
        DROP TABLE expenses_old;
    """))

    db.commit()


def downgrade(db):
    """Remove 'divers' from expense_category enum."""
    # For rollback, recreate table with original enum
    db.execute(text("""
        ALTER TABLE expenses RENAME TO expenses_old;
    """))

    db.execute(text("""
        CREATE TABLE expenses (
            id INTEGER NOT NULL,
            date DATE NOT NULL,
            amount NUMERIC(10, 2) NOT NULL,
            label VARCHAR(255) NOT NULL,
            category VARCHAR(255) NOT NULL CHECK (category IN ('quotepart', '50/50', 'dette', 'brico', 'virement')),
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
        );
    """))

    db.execute(text("""
        INSERT INTO expenses
        SELECT * FROM expenses_old WHERE category != 'divers';
    """))

    db.execute(text("""
        DROP TABLE expenses_old;
    """))

    db.commit()
