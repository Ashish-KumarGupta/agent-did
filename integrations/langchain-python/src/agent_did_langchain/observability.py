"""Observability primitives for the Agent-DID LangChain integration."""

from __future__ import annotations

import logging
from collections.abc import Callable, Mapping
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urlsplit, urlunsplit

REDACTED_VALUE = "<redacted>"
SENSITIVE_FIELD_NAMES = {
    "agent_private_key",
    "body",
    "payload",
    "signature",
}
SENSITIVE_HEADER_NAMES = {
    "authorization",
    "cookie",
    "proxy-authorization",
    "set-cookie",
    "signature",
    "signature-input",
    "x-api-key",
}


@dataclass(frozen=True, slots=True)
class AgentDidObservabilityEvent:
    """Structured event emitted by the integration and tools."""

    event_type: str
    attributes: dict[str, Any] = field(default_factory=dict)
    level: str = "info"


AgentDidEventHandler = Callable[[AgentDidObservabilityEvent], None]


def sanitize_observability_attributes(attributes: Mapping[str, Any]) -> dict[str, Any]:
    """Redact sensitive values before events leave the integration boundary."""

    return {str(key): _sanitize_value(str(key), value) for key, value in attributes.items()}


class AgentDidObserver:
    """No-op capable observer for callback and logger based instrumentation."""

    def __init__(
        self,
        *,
        event_handler: AgentDidEventHandler | None = None,
        logger: logging.Logger | None = None,
    ) -> None:
        self._event_handler = event_handler
        self._logger = logger

    def emit(self, event_type: str, *, attributes: Mapping[str, Any] | None = None, level: str = "info") -> None:
        sanitized_attributes = sanitize_observability_attributes(attributes or {})
        event = AgentDidObservabilityEvent(
            event_type=event_type,
            attributes=sanitized_attributes,
            level=level,
        )

        if self._event_handler is not None:
            try:
                self._event_handler(event)
            except Exception:
                pass

        if self._logger is not None:
            try:
                self._logger.log(
                    _to_logging_level(level),
                    "agent_did_langchain event=%s attributes=%s",
                    event.event_type,
                    event.attributes,
                )
            except Exception:
                pass


def _sanitize_value(field_name: str, value: Any) -> Any:
    normalized_field_name = field_name.lower()

    if normalized_field_name in SENSITIVE_FIELD_NAMES and isinstance(value, str):
        return {"redacted": True, "length": len(value)}

    if normalized_field_name == "url" and isinstance(value, str):
        return _sanitize_url(value)

    if isinstance(value, Mapping):
        if normalized_field_name == "headers":
            return _sanitize_headers(value)
        return {str(key): _sanitize_value(str(key), nested_value) for key, nested_value in value.items()}

    if isinstance(value, list):
        return [_sanitize_value(field_name, item) for item in value]

    if isinstance(value, tuple):
        return tuple(_sanitize_value(field_name, item) for item in value)

    return value


def _sanitize_headers(headers: Mapping[str, Any]) -> dict[str, Any]:
    sanitized_headers: dict[str, Any] = {}
    for header_name, header_value in headers.items():
        normalized_header_name = str(header_name).lower()
        if normalized_header_name in SENSITIVE_HEADER_NAMES:
            sanitized_headers[str(header_name)] = REDACTED_VALUE
        else:
            sanitized_headers[str(header_name)] = _sanitize_value(str(header_name), header_value)
    return sanitized_headers


def _sanitize_url(url: str) -> str:
    parsed = urlsplit(url)
    netloc = parsed.hostname or ""
    if parsed.port is not None:
        netloc = f"{netloc}:{parsed.port}"
    return urlunsplit((parsed.scheme, netloc, parsed.path, "", ""))


def _to_logging_level(level: str) -> int:
    normalized_level = level.lower()
    if normalized_level == "debug":
        return logging.DEBUG
    if normalized_level == "warning":
        return logging.WARNING
    if normalized_level == "error":
        return logging.ERROR
    return logging.INFO
