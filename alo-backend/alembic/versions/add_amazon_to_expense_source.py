"""Add amazon to expense_source enum

Revision ID: add_amazon_expense_source
Revises:
Create Date: 2026-09-27 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_amazon_expense_source'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostgreSQL: add new enum value
    op.execute("""
        ALTER TYPE expense_source ADD VALUE 'amazon' BEFORE 'brico';
    """)


def downgrade() -> None:
    # PostgreSQL: remove enum value (requires recreating enum)
    op.execute("""
        -- Note: Can't remove enum values easily in PostgreSQL
        -- This downgrade is not reversible without manual intervention
        -- Keeping enum value 'amazon' in place
    """)
