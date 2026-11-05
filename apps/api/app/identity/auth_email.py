"""Delivery adapters for authentication links; never log message bodies or tokens."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol
from urllib.parse import urlsplit

import httpx


class AuthMailer(Protocol):
    def send_link(self, *, recipient: str, purpose: str, token: str) -> None: ...


def link_for(frontend_url: str, purpose: str, token: str) -> str:
    if purpose not in {"verify-email", "reset-password"}:
        raise ValueError("Unsupported authentication email purpose")
    parsed = urlsplit(frontend_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Invalid frontend origin")
    if parsed.path not in {"", "/"} or parsed.query or parsed.fragment:
        raise ValueError("Frontend URL must be an origin")
    return f"{frontend_url.rstrip('/')}/{purpose}#{token}"


@dataclass
class ResendMailer:
    api_key: str
    sender: str
    frontend_url: str

    def __post_init__(self) -> None:
        if not self.api_key.strip() or not self.sender.strip():
            raise ValueError("Email API key and sender are required")
        if urlsplit(self.frontend_url).scheme != "https":
            raise ValueError("Production frontend origin must use HTTPS")
        link_for(self.frontend_url, "verify-email", "placeholder")

    def send_link(self, *, recipient: str, purpose: str, token: str) -> None:
        link = link_for(self.frontend_url, purpose, token)
        subject = "Verify your ExperienceBridge email" if purpose == "verify-email" else "Reset your ExperienceBridge password"
        # No retries: duplicate delivery or unbounded latency is not assumed safe.
        # Provider-side click tracking must be disabled in the sending domain settings.
        with httpx.Client(timeout=5.0, follow_redirects=False) as client:
            response = client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"from": self.sender, "to": [recipient], "subject": subject, "text": f"Open this link to continue: {link}"},
            )
            response.raise_for_status()


@dataclass
class DevelopmentMailer:
    """Explicitly injected capture sink; never select this for production."""

    messages: list[tuple[str, str, str]] = field(default_factory=list)

    def send_link(self, *, recipient: str, purpose: str, token: str) -> None:
        self.messages.append((recipient, purpose, token))
