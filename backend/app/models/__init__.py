"""ORM models. Importing this package registers every table on ``Base.metadata``."""

from app.models.base import Base
from app.models.memory import EMBEDDING_DIM, MemoryEmbedding
from app.models.order import Order
from app.models.outcome import RecommendationOutcome
from app.models.position import Position
from app.models.recommendation import (
    AgentScore,
    ConvictionBreakdown,
    PolicyEvaluation,
    Recommendation,
    TradeGuardResult,
)
from app.models.report import Report
from app.models.security import Security
from app.models.user import User, UserPolicyModel
from app.models.watchlist import WatchlistItem

__all__ = [
    "Base",
    "EMBEDDING_DIM",
    "MemoryEmbedding",
    "Order",
    "RecommendationOutcome",
    "Position",
    "AgentScore",
    "ConvictionBreakdown",
    "PolicyEvaluation",
    "Recommendation",
    "TradeGuardResult",
    "Report",
    "Security",
    "User",
    "UserPolicyModel",
    "WatchlistItem",
]
