"""Add webhook_logs table for FeelFreePay audit + replay

Revision ID: a4e1c9b7d201
Revises: 2332c9f9e574
Create Date: 2026-05-16 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


revision: str = "a4e1c9b7d201"
down_revision: Union[str, None] = "2332c9f9e574"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "webhook_logs",
        sa.Column("id", sqlmodel.sql.sqltypes.AutoString(length=64), nullable=False),
        sa.Column("source", sqlmodel.sql.sqltypes.AutoString(length=32), nullable=False, server_default="feelfreepay"),
        sa.Column("reference_no", sqlmodel.sql.sqltypes.AutoString(length=64), nullable=True),
        sa.Column("raw_payload", sqlmodel.sql.sqltypes.AutoString(length=8192), nullable=False, server_default=""),
        sa.Column("outcome", sqlmodel.sql.sqltypes.AutoString(length=32), nullable=False, server_default=""),
        sa.Column("reason", sqlmodel.sql.sqltypes.AutoString(length=256), nullable=False, server_default=""),
        sa.Column("http_status", sa.Integer(), nullable=False, server_default="200"),
        sa.Column("client_ip", sqlmodel.sql.sqltypes.AutoString(length=64), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_webhook_logs_source", "webhook_logs", ["source"])
    op.create_index("ix_webhook_logs_reference_no", "webhook_logs", ["reference_no"])
    op.create_index("ix_webhook_logs_outcome", "webhook_logs", ["outcome"])
    op.create_index("ix_webhook_logs_created_at", "webhook_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_webhook_logs_created_at", table_name="webhook_logs")
    op.drop_index("ix_webhook_logs_outcome", table_name="webhook_logs")
    op.drop_index("ix_webhook_logs_reference_no", table_name="webhook_logs")
    op.drop_index("ix_webhook_logs_source", table_name="webhook_logs")
    op.drop_table("webhook_logs")
