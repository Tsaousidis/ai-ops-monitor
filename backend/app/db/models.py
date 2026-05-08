from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)

from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.db.base import TimestampMixin


class Service(Base, TimestampMixin):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String,
        nullable=False,
        unique=True,
    )

    base_url: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String,
        default="healthy",
    )

    metrics = relationship("Metric", back_populates="service")

    incidents = relationship("Incident", back_populates="service")

    logs = relationship("Log", back_populates="service")

    health_checks = relationship(
        "HealthCheck",
        back_populates="service",
    )

    alert_rule = relationship(
        "AlertRule",
        back_populates="service",
        uselist=False,
    )


class Metric(Base):
    __tablename__ = "metrics"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id"),
        index=True,
    )

    metric_type: Mapped[str] = mapped_column(
        String,
        index=True,
    )

    value: Mapped[float] = mapped_column(
        Float,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        index=True,
    )

    service = relationship(
        "Service",
        back_populates="metrics",
    )


class Incident(Base, TimestampMixin):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id"),
        index=True,
    )

    severity: Mapped[str] = mapped_column(
        String,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String,
    )

    description: Mapped[str] = mapped_column(
        Text,
    )

    status: Mapped[str] = mapped_column(
        String,
        default="open",
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )

    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    service = relationship(
        "Service",
        back_populates="incidents",
    )

    ai_insights = relationship(
        "AIInsight",
        back_populates="incident",
    )


class Log(Base):
    __tablename__ = "logs"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id"),
        index=True,
    )

    level: Mapped[str] = mapped_column(
        String,
        index=True,
    )

    message: Mapped[str] = mapped_column(
        Text,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        index=True,
    )

    service = relationship(
        "Service",
        back_populates="logs",
    )


class AIInsight(Base):
    __tablename__ = "ai_insights"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    incident_id: Mapped[int] = mapped_column(
        ForeignKey("incidents.id"),
        index=True,
    )

    summary: Mapped[str] = mapped_column(
        Text,
    )

    root_cause: Mapped[str] = mapped_column(
        Text,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )

    incident = relationship(
        "Incident",
        back_populates="ai_insights",
    )


class HealthCheck(Base):
    __tablename__ = "health_checks"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id"),
        index=True,
    )

    status_code: Mapped[int] = mapped_column(
        Integer,
    )

    response_time: Mapped[float] = mapped_column(
        Float,
    )

    success: Mapped[bool] = mapped_column(
        Boolean,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        index=True,
    )

    service = relationship(
        "Service",
        back_populates="health_checks",
    )


class AlertRule(Base, TimestampMixin):
    __tablename__ = "alert_rules"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id"),
        unique=True,
        index=True,
    )

    warning_response_time_ms: Mapped[float] = mapped_column(
        Float,
        default=500.0,
    )

    critical_response_time_ms: Mapped[float] = mapped_column(
        Float,
        default=1000.0,
    )

    enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
    )

    service = relationship(
        "Service",
        back_populates="alert_rule",
    )
