from datetime import datetime
from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StrictBool, model_validator


class Evidence(BaseModel):
    model_config = ConfigDict(extra="forbid")
    price: StrictBool
    flow: StrictBool
    gamma: StrictBool
    liquidity: StrictBool
    no_chop: StrictBool
    event_clear: StrictBool


class Candidate(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    symbol: Literal["SPY", "QQQ"]
    strategy_version: str = Field(min_length=1, max_length=80, pattern=r"^[A-Za-z0-9._-]+$")
    direction: Literal["bullish", "bearish"]
    observed_at: AwareDatetime
    mode: Literal["live", "delayed", "replay", "paper", "mock"]
    entry: float = Field(gt=0)
    invalidation: float = Field(gt=0)
    target: float = Field(gt=0)
    evidence: Evidence
    source_ids: list[str] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def coherent_levels(self):
        if self.direction == "bullish" and not self.invalidation < self.entry < self.target:
            raise ValueError("Bullish levels require invalidation < entry < target")
        if self.direction == "bearish" and not self.target < self.entry < self.invalidation:
            raise ValueError("Bearish levels require target < entry < invalidation")
        if any(not item.strip() or len(item) > 160 for item in self.source_ids):
            raise ValueError("Source IDs must be nonempty and at most 160 characters")
        return self


def rejection_reasons(candidate: Candidate, approved: bool, now: datetime) -> list[str]:
    reasons = []
    if not approved:
        reasons.append("strategy_pending_review")
    if candidate.mode != "live":
        reasons.append("non_live_source")
    age = (now - candidate.observed_at).total_seconds()
    if age > 60:
        reasons.append("stale_data")
    if age < -5:
        reasons.append("future_timestamp")
    reasons.extend(f"missing_{name}" for name, passed in candidate.evidence.model_dump().items() if not passed)
    return reasons
