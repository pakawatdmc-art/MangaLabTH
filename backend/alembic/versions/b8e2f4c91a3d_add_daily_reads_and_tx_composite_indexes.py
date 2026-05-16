"""Add daily_manga_reads + ensure daily_manga_views + composite indexes on transactions

Background:
- Migration `ed56348059c7_add_dailymangaview_table.py` had empty upgrade() body,
  so `daily_manga_views` was never created via Alembic. In dev it exists because
  `init_db()` runs `SQLModel.metadata.create_all`, but production may be missing it.
- `daily_manga_reads` model exists but had no migration at all.
- Transactions table is missing composite indexes for common query patterns:
  - List user transactions sorted by date: (user_id, created_at)
  - Filter transactions by type sorted by date: (type, created_at)

This migration is idempotent — uses inspector to check existence before creating.

Revision ID: b8e2f4c91a3d
Revises: a4e1c9b7d201
Create Date: 2026-05-16 16:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = "b8e2f4c91a3d"
down_revision: Union[str, None] = "a4e1c9b7d201"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(inspector, name: str) -> bool:
    return name in inspector.get_table_names()


def _index_exists(inspector, table: str, index_name: str) -> bool:
    if not _table_exists(inspector, table):
        return False
    return any(ix["name"] == index_name for ix in inspector.get_indexes(table))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # ── daily_manga_views (recover from empty migration ed56348059c7) ──
    if not _table_exists(inspector, "daily_manga_views"):
        op.create_table(
            "daily_manga_views",
            sa.Column("id", sqlmodel.sql.sqltypes.AutoString(length=64), nullable=False),
            sa.Column("manga_id", sqlmodel.sql.sqltypes.AutoString(length=64), nullable=False),
            sa.Column("view_date", sa.Date(), nullable=False),
            sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["manga_id"], ["mangas.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("manga_id", "view_date", name="uq_daily_view_manga_date"),
        )
        op.create_index("ix_daily_manga_views_manga_id", "daily_manga_views", ["manga_id"])
        op.create_index("ix_daily_manga_views_view_date", "daily_manga_views", ["view_date"])

    # ── daily_manga_reads (new table) ──
    if not _table_exists(inspector, "daily_manga_reads"):
        op.create_table(
            "daily_manga_reads",
            sa.Column("id", sqlmodel.sql.sqltypes.AutoString(length=64), nullable=False),
            sa.Column("manga_id", sqlmodel.sql.sqltypes.AutoString(length=64), nullable=False),
            sa.Column("read_date", sa.Date(), nullable=False),
            sa.Column("read_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["manga_id"], ["mangas.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("manga_id", "read_date", name="uq_daily_read_manga_date"),
        )
        op.create_index("ix_daily_manga_reads_manga_id", "daily_manga_reads", ["manga_id"])
        op.create_index("ix_daily_manga_reads_read_date", "daily_manga_reads", ["read_date"])

    # ── Composite indexes on transactions (performance) ──
    # Re-inspect after potential table creation
    inspector = sa.inspect(bind)

    if _table_exists(inspector, "transactions"):
        if not _index_exists(inspector, "transactions", "ix_tx_user_created"):
            op.create_index(
                "ix_tx_user_created",
                "transactions",
                ["user_id", "created_at"],
            )
        if not _index_exists(inspector, "transactions", "ix_tx_type_created"):
            op.create_index(
                "ix_tx_type_created",
                "transactions",
                ["type", "created_at"],
            )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _index_exists(inspector, "transactions", "ix_tx_type_created"):
        op.drop_index("ix_tx_type_created", table_name="transactions")
    if _index_exists(inspector, "transactions", "ix_tx_user_created"):
        op.drop_index("ix_tx_user_created", table_name="transactions")

    if _table_exists(inspector, "daily_manga_reads"):
        op.drop_index("ix_daily_manga_reads_read_date", table_name="daily_manga_reads")
        op.drop_index("ix_daily_manga_reads_manga_id", table_name="daily_manga_reads")
        op.drop_table("daily_manga_reads")

    # NOTE: We do NOT drop daily_manga_views in downgrade because the original
    # migration (ed56348059c7) was supposed to own it. Dropping here would
    # break the migration history symmetry.
