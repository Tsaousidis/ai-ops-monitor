"""create alert rules table

Revision ID: d9f1b6a1e2c4
Revises: b3a58fde2b2b
Create Date: 2026-05-08 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d9f1b6a1e2c4"
down_revision: Union[str, Sequence[str], None] = "b3a58fde2b2b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "alert_rules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("service_id", sa.Integer(), nullable=False),
        sa.Column(
            "warning_response_time_ms",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "critical_response_time_ms",
            sa.Float(),
            nullable=False,
        ),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("service_id"),
    )
    op.create_index(
        op.f("ix_alert_rules_service_id"),
        "alert_rules",
        ["service_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_alert_rules_service_id"),
        table_name="alert_rules",
    )
    op.drop_table("alert_rules")
