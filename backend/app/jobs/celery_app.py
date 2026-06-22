"""Celery application + beat schedule for continuous market scanning."""

from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from app.core.config import get_settings

_settings = get_settings()

celery_app = Celery(
    "aios",
    broker=_settings.celery_broker_url,
    backend=_settings.celery_result_backend,
    include=["app.jobs.tasks", "app.jobs.backtest_task"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
)

# Pre-open and post-close scans on weekdays (IST).
celery_app.conf.beat_schedule = {
    # Pre-market batch: 08:55 IST (before 09:15 market open) — warm up conviction scores
    "premarket-scan": {
        "task": "app.jobs.scan_watchlist",
        "schedule": crontab(hour=8, minute=55, day_of_week="mon-fri"),
    },
    # Mid-day refresh: 12:30 IST
    "midday-scan": {
        "task": "app.jobs.scan_watchlist",
        "schedule": crontab(hour=12, minute=30, day_of_week="mon-fri"),
    },
    # Post-close summary: 16:00 IST
    "evening-scan": {
        "task": "app.jobs.scan_watchlist",
        "schedule": crontab(hour=16, minute=0, day_of_week="mon-fri"),
    },
    # Position risk monitor: every 10 seconds during trading
    "risk-monitor": {
        "task": "app.jobs.monitor_risk",
        "schedule": 10.0,
    },
    # Drawdown circuit-breaker check: every 60 seconds
    "drawdown-monitor": {
        "task": "app.jobs.monitor_drawdown",
        "schedule": 60.0,
    },
}
