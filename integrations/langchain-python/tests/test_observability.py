from __future__ import annotations

import pytest
from agent_did_sdk import AgentIdentity, AgentIdentityConfig, CreateAgentParams, InMemoryAgentRegistry

from agent_did_langchain import create_agent_did_langchain_integration
from agent_did_langchain.observability import AgentDidObservabilityEvent


@pytest.mark.asyncio
async def test_identity_snapshot_refresh_emits_observability_event() -> None:
    AgentIdentity.set_registry(InMemoryAgentRegistry())
    identity = AgentIdentity(AgentIdentityConfig(signer_address="0x8181818181818181818181818181818181818181"))
    runtime_identity = await identity.create(
        CreateAgentParams(
            name="SnapshotObserverBot",
            core_model="gpt-4.1-mini",
            system_prompt="Observe identity snapshot refreshes.",
        )
    )

    captured_events: list[AgentDidObservabilityEvent] = []
    integration = create_agent_did_langchain_integration(
        agent_identity=identity,
        runtime_identity=runtime_identity,
        observability_handler=captured_events.append,
    )

    current_identity = integration.get_current_identity()
    integration.compose_system_prompt("Base prompt")

    snapshot_events = [
        event for event in captured_events if event.event_type == "agent_did.identity_snapshot.refreshed"
    ]

    assert current_identity["did"] == runtime_identity.document.id
    assert len(snapshot_events) >= 2
    assert snapshot_events[0].attributes["did"] == runtime_identity.document.id
    assert snapshot_events[0].attributes["reason"] == "get_current_identity"
    assert snapshot_events[1].attributes["reason"] == "compose_system_prompt"


@pytest.mark.asyncio
async def test_tool_events_redact_payloads_signatures_and_headers() -> None:
    AgentIdentity.set_registry(InMemoryAgentRegistry())
    identity = AgentIdentity(AgentIdentityConfig(signer_address="0x8282828282828282828282828282828282828282"))
    runtime_identity = await identity.create(
        CreateAgentParams(
            name="ToolObserverBot",
            core_model="gpt-4.1-mini",
            system_prompt="Observe tool inputs safely.",
        )
    )

    captured_events: list[AgentDidObservabilityEvent] = []
    integration = create_agent_did_langchain_integration(
        agent_identity=identity,
        runtime_identity=runtime_identity,
        expose={"sign_payload": True, "sign_http": True},
        observability_handler=captured_events.append,
    )
    tools_by_name = {tool.name: tool for tool in integration.tools}

    await tools_by_name["agent_did_sign_payload"].ainvoke({"payload": "very-sensitive-payload"})
    await tools_by_name["agent_did_sign_http_request"].ainvoke(
        {
            "method": "POST",
            "url": "https://api.example.com/tasks?token=secret",
            "body": '{"secret":"value"}',
        }
    )

    started_events = [event for event in captured_events if event.event_type == "agent_did.tool.started"]
    http_success = next(
        event
        for event in captured_events
        if event.event_type == "agent_did.tool.succeeded"
        and event.attributes["tool_name"] == "agent_did_sign_http_request"
    )

    assert any(
        event.attributes["tool_name"] == "agent_did_sign_payload"
        and event.attributes["inputs"]["payload"] == {"redacted": True, "length": 22}
        for event in started_events
    )
    assert any(
        event.attributes["tool_name"] == "agent_did_sign_http_request"
        and event.attributes["inputs"]["url"] == "https://api.example.com/tasks"
        and event.attributes["inputs"]["body"] == {"redacted": True, "length": 18}
        for event in started_events
    )
    assert http_success.attributes["outputs"]["header_names"]


@pytest.mark.asyncio
async def test_tool_failure_event_emits_sanitized_error_context() -> None:
    AgentIdentity.set_registry(InMemoryAgentRegistry())
    identity = AgentIdentity(AgentIdentityConfig(signer_address="0x8383838383838383838383838383838383838383"))
    runtime_identity = await identity.create(
        CreateAgentParams(
            name="FailureObserverBot",
            core_model="gpt-4.1-mini",
            system_prompt="Observe failures safely.",
        )
    )

    captured_events: list[AgentDidObservabilityEvent] = []
    integration = create_agent_did_langchain_integration(
        agent_identity=identity,
        runtime_identity=runtime_identity,
        expose={"sign_http": True},
        observability_handler=captured_events.append,
    )
    tool = {tool.name: tool for tool in integration.tools}["agent_did_sign_http_request"]

    result = await tool.ainvoke({"method": "POST", "url": "file:///tmp/secret", "body": "payload-data"})

    failed_event = next(event for event in captured_events if event.event_type == "agent_did.tool.failed")

    assert result["error"]
    assert failed_event.level == "error"
    assert failed_event.attributes["inputs"]["body"] == {"redacted": True, "length": 12}
    assert failed_event.attributes["inputs"]["url"] == "file:///tmp/secret"
    assert "http" in failed_event.attributes["error"].lower()
