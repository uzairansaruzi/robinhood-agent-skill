import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    api_token: str = ""
    strategy_approved: bool = False
    notifications_enabled: bool = False
    pushover_token: str = ""
    pushover_user: str = ""
    database_path: str = "./var/spybot-dev.sqlite3"

    @classmethod
    def from_environment(cls):
        return cls(
            api_token=os.getenv("DASHBOARD_API_TOKEN", ""),
            strategy_approved=os.getenv("STRATEGY_APPROVED", "false").lower() == "true",
            notifications_enabled=os.getenv("NOTIFICATIONS_ENABLED", "false").lower() == "true",
            pushover_token=os.getenv("PUSHOVER_APP_TOKEN", ""),
            pushover_user=os.getenv("PUSHOVER_USER_KEY", ""),
            database_path=os.getenv("SPYBOT_DATABASE_PATH", "./var/spybot-dev.sqlite3"),
        )

    @property
    def can_send(self):
        return all((self.strategy_approved, self.notifications_enabled, self.pushover_token, self.pushover_user))
