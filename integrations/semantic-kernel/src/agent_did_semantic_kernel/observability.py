"""Structured observability primitives for the Semantic Kernel integration."""

from __future__ import annotations

import importlib
import json
import logging
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from .sanitization import sanitize_observability_attributes

AgentDidEventHandler = Callable[["AgentDidSemanticKernelObservabilityEvent"], None]


class AgentDidSemanticKernelObservabilityEvent(BaseModel):
    """Typed event emitted by tools, middleware and context helpers."""

    model_config = ConfigDict(extra="forbid")

    event_type: str
    level: str = "info"
    attributes: dict[str, Any] = Field(default_factory=dict)
    source: str = "agent_did_semantic_kernel"
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"))


@dataclass(slots=True)
class AgentDidObserver:
    event_handler: AgentDidEventHandler | None = None
    logger: logging.Logger | None = None

    def emit(self, event_type: str, *, attributes: dict[str, Any] | None = None, level: str = "info") -> None:
        event = AgentDidSemanticKernelObservabilityEvent(
            event_type=event_type,
            level=level,
            attributes=sanitize_observability_attributes(attributes or {}),
        )
        if self.event_handler is not None:
            self.event_handler(event)
        if self.logger is not None:
            log_method = getattr(self.logger, level.lower(), self.logger.info)
            log_method(json.dumps(serialize_observability_event(event), sort_keys=True))


def compose_event_handlers(*handlers: AgentDidEventHandler | None) -> AgentDidEventHandler:
    active_handlers = [handler for handler in handlers if handler is not None]

    def _composed(event: AgentDidSemanticKernelObservabilityEvent) -> None:
        for handler in active_handlers:
            try:
                handler(event)
            except Exception:
                continue

    return _composed


def serialize_observability_event(
    event: AgentDidSemanticKernelObservabilityEvent,
    *,
    include_timestamp: bool = True,
    extra_fields: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    payload = event.model_dump(exclude_none=True)
    payload["attributes"] = sanitize_observability_attributes(payload.get("attributes", {}))
    if not include_timestamp:
        payload.pop("timestamp", None)
    if extra_fields:
        payload.update(sanitize_observability_attributes(dict(extra_fields)))
    return payload


def create_json_logger_event_handler(
    logger: logging.Logger,
    *,
    include_timestamp: bool = True,
    extra_fields: Mapping[str, Any] | None = None,
) -> AgentDidEventHandler:
    sanitized_extra_fields = sanitize_observability_attributes(dict(extra_fields or {}))

    def _handler(event: AgentDidSemanticKernelObservabilityEvent) -> None:
        payload = serialize_observability_event(
            event,
            include_timestamp=include_timestamp,
            extra_fields=sanitized_extra_fields,
        )
        logger.info(json.dumps(payload, sort_keys=True))

    return _handler


def create_opentelemetry_tracer(
    *,
    name: str = "agent_did_semantic_kernel",
    version: str | None = None,
    tracer_provider: Any | None = None,
) -> Any:
    try:
        trace = importlib.import_module("opentelemetry.trace")
    except ImportError as error:  # pragma: no cover - depends on optional package install
        raise RuntimeError(
            "OpenTelemetry support requires installing agent-did-semantic-kernel[observability]"
        ) from error

    if version is None:
        return trace.get_tracer(name, tracer_provider=tracer_provider)
    return trace.get_tracer(name, version, tracer_provider=tracer_provider)


def create_opentelemetry_event_handler(
    tracer: Any,
    *,
    include_timestamp: bool = True,
    extra_fields: Mapping[str, Any] | None = None,
    attributes_namespace: str = "agent_did",
    record_exception: bool = True,
) -> AgentDidEventHandler:
    try:
        trace_module = importlib.import_module("opentelemetry.trace")
        Status = getattr(trace_module, "Status")
        StatusCode = getattr(trace_module, "StatusCode")
    except ImportError as error:  # pragma: no cover - depends on optional package install
        raise RuntimeError(
            "OpenTelemetry support requires installing agent-did-semantic-kernel[observability]"
        ) from error

    active_tool_spans: dict[tuple[str, str], Any] = {}
    sanitized_extra_fields = sanitize_observability_attributes(dict(extra_fields or {}))

    def _handler(event: AgentDidSemanticKernelObservabilityEvent) -> None:
        record = serialize_observability_event(
            event,
            include_timestamp=include_timestamp,
            extra_fields=sanitized_extra_fields,
        )
        span_attributes = _build_span_attributes(record, namespace=attributes_namespace)
        event_attributes = _build_event_attributes(record, namespace=attributes_namespace)

        raw_attributes = record.get("attributes", {})
        if _is_tool_lifecycle_event(event.event_type, raw_attributes):
            _handle_tool_lifecycle_event(
                tracer,
                active_tool_spans,
                event.event_type,
                raw_attributes,
                span_attributes,
                event_attributes,
                record_exception=record_exception,
                status_cls=Status,
                status_code_cls=StatusCode,
            )
            return

        _handle_generic_span_event(
            tracer,
            event.event_type,
            event.level,
            raw_attributes,
            span_attributes,
            event_attributes,
            status_cls=Status,
            status_code_cls=StatusCode,
        )

    return _handler


def _is_tool_lifecycle_event(event_type: str, raw_attributes: Any) -> bool:
    if not isinstance(raw_attributes, Mapping):
        return False
    return (
        isinstance(raw_attributes.get("tool_name"), str)
        and isinstance(raw_attributes.get("did"), str)
        and event_type.startswith("agent_did.tool.")
    )


def _handle_tool_lifecycle_event(
    tracer: Any,
    active_tool_spans: dict[tuple[str, str], Any],
    event_type: str,
    raw_attributes: Mapping[str, Any],
    span_attributes: Mapping[str, Any],
    event_attributes: Mapping[str, Any],
    *,
    record_exception: bool,
    status_cls: Any,
    status_code_cls: Any,
) -> None:
    tool_name = str(raw_attributes["tool_name"])
    did = str(raw_attributes["did"])
    span_key = (tool_name, did)

    if event_type.endswith(".started"):
        span = tracer.start_span(tool_name)
        _set_span_attributes(span, span_attributes)
        span.add_event(event_type, event_attributes)
        active_tool_spans[span_key] = span
        return

    span = active_tool_spans.pop(span_key, None)
    if span is None:
        span = tracer.start_span(tool_name)
    _set_span_attributes(span, span_attributes)
    span.add_event(event_type, event_attributes)
    if event_type.endswith(".failed"):
        error_message = str(raw_attributes.get("error") or "unknown error")
        if record_exception:
            span.record_exception(RuntimeError(error_message))
        span.set_status(status_cls(status_code_cls.ERROR, error_message))
    else:
        span.set_status(status_cls(status_code_cls.OK))
    span.end()


def _handle_generic_span_event(
    tracer: Any,
    event_type: str,
    level: str,
    raw_attributes: Mapping[str, Any] | Any,
    span_attributes: Mapping[str, Any],
    event_attributes: Mapping[str, Any],
    *,
    status_cls: Any,
    status_code_cls: Any,
) -> None:
    span = tracer.start_span(event_type)
    _set_span_attributes(span, span_attributes)
    span.add_event(event_type, event_attributes)
    if level.lower() == "error":
        error_message = (
            str(raw_attributes.get("error") or event_type)
            if isinstance(raw_attributes, Mapping)
            else event_type
        )
        span.set_status(status_cls(status_code_cls.ERROR, error_message))
    else:
        span.set_status(status_cls(status_code_cls.OK))
    span.end()


def _build_span_attributes(record: Mapping[str, Any], *, namespace: str) -> dict[str, Any]:
    attributes: dict[str, Any] = {}
    for key, value in record.items():
        normalized_key = _normalize_key(str(key))
        _flatten_span_value(f"{namespace}.{normalized_key}", value, attributes)
    return attributes


def _build_event_attributes(record: Mapping[str, Any], *, namespace: str) -> dict[str, Any]:
    event_attributes: dict[str, Any] = {}
    for key, value in record.items():
        if key == "attributes":
            continue
        if value is None:
            continue
        event_attributes[f"{namespace}.{_normalize_key(str(key))}"] = str(value)
    raw_attributes = record.get("attributes")
    if isinstance(raw_attributes, Mapping):
        flattened_attributes: dict[str, Any] = {}
        _flatten_span_value(f"{namespace}.attributes", raw_attributes, flattened_attributes)
        for key, value in flattened_attributes.items():
            event_attributes[key] = _coerce_event_value(value)
    return event_attributes


def _flatten_span_value(prefix: str, value: Any, flattened: dict[str, Any]) -> None:
    if value is None:
        return
    if isinstance(value, Mapping):
        for key, item in value.items():
            _flatten_span_value(f"{prefix}.{_normalize_key(str(key))}", item, flattened)
        return
    if isinstance(value, list):
        coerced = _coerce_sequence(value)
        if coerced is not None:
            flattened[prefix] = coerced
            return
        for index, item in enumerate(value):
            _flatten_span_value(f"{prefix}.{index}", item, flattened)
        return
    if isinstance(value, tuple):
        coerced = _coerce_sequence(list(value))
        if coerced is not None:
            flattened[prefix] = coerced
            return
        for index, item in enumerate(value):
            _flatten_span_value(f"{prefix}.{index}", item, flattened)
        return
    if isinstance(value, (str, int, float, bool)):
        flattened[prefix] = value
        return
    flattened[prefix] = json.dumps(value, sort_keys=True, default=str)


def _coerce_sequence(values: list[Any]) -> list[Any] | None:
    coerced: list[Any] = []
    for item in values:
        if isinstance(item, (str, int, float, bool)):
            coerced.append(item)
            continue
        if item is None:
            continue
        return None
    return coerced


def _coerce_event_value(value: Any) -> Any:
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, list):
        return [str(item) for item in value]
    return str(value)


def _normalize_key(key: str) -> str:
    return key.replace(" ", "_").replace("-", "_")


def _set_span_attributes(span: Any, attributes: Mapping[str, Any]) -> None:
    for key, value in attributes.items():
        span.set_attribute(key, value)


__all__ = [
    "AgentDidEventHandler",
    "AgentDidSemanticKernelObservabilityEvent",
    "AgentDidObserver",
    "compose_event_handlers",
    "create_json_logger_event_handler",
    "create_opentelemetry_event_handler",
    "create_opentelemetry_tracer",
    "sanitize_observability_attributes",
    "serialize_observability_event",
]
