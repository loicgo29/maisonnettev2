"""Create meal_presence table for tracking presence/absence at meals.

This migration adds a new table to track whether each family member
was present or absent at lunch (midi) and dinner (soir) for each day,
independent of the meal_records table.
"""

from sqlalchemy import text


def upgrade(db):
    """Create the meal_presence table."""
    db.execute(text("""
        CREATE TABLE meal_presence (
            id INTEGER NOT NULL,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            day INTEGER NOT NULL,
            account VARCHAR(255) NOT NULL,
            person VARCHAR(255) NOT NULL,
            midi BOOLEAN NOT NULL DEFAULT 1,
            soir BOOLEAN NOT NULL DEFAULT 1,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE (year, month, day, account, person)
        );
    """))

    db.commit()


def downgrade(db):
    """Drop the meal_presence table."""
    db.execute(text("""
        DROP TABLE IF EXISTS meal_presence;
    """))

    db.commit()
