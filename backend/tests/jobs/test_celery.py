"""Celery wiring tests (eager mode, no broker required)."""

from __future__ import annotations

from app.jobs.celery_app import celery_app
from app.jobs.tasks import health_ping


def test_tasks_registered() -> None:
    assert "app.jobs.health_ping" in celery_app.tasks
    assert "app.jobs.scan_watchlist" in celery_app.tasks
    assert "app.jobs.monitor_risk" in celery_app.tasks


def test_beat_schedule_configured() -> None:
    schedule = celery_app.conf.beat_schedule
    assert "morning-scan" in schedule
    assert "evening-scan" in schedule
    assert "risk-monitor" in schedule
    assert schedule["morning-scan"]["task"] == "app.jobs.scan_watchlist"
    assert schedule["risk-monitor"]["task"] == "app.jobs.monitor_risk"


def test_health_ping_runs_eagerly() -> None:
    celery_app.conf.task_always_eager = True
    celery_app.conf.task_eager_propagates = True
    try:
        result = health_ping.delay()
        assert result.get() == "pong"
    finally:
        celery_app.conf.task_always_eager = False
