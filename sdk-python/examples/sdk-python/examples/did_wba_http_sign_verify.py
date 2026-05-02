
from __future__ import annotations

import asyncio
import httpx

from agent_did_sdk import (
    AgentIdentity,
    AgentIdentityConfig,
    CreateAgentParams,
    InMemoryAgentRegistry,
    ProductionHttpResolverProfileConfig,
    SignHttpRequestParams,
    VerifyHttpRequestSignatureParams,
)


async def main() -> None:
    # 1. Setup in-memory registry
    AgentIdentity.set_registry(InMemoryAgentRegistry())

    # 2. Mock HTTP resolver (serve DID document)
    def handler(request: httpx.Request) -> httpx.Response:
        # Simulated DID document response
        return httpx.Response(
            200,
            json={
                "id": "did:wba:example.com:agent",
                "verificationMethod": [],
            },
        )

    transport = httpx.MockTransport(handler)

    AgentIdentity.use_production_resolver_from_http(
        ProductionHttpResolverProfileConfig(
            transport=transport
        )
    )

    # 3. Create identity
    identity = AgentIdentity(
        AgentIdentityConfig(
            signer_address="0x9292929292929292929292929292929292929292"
        )
    )

    created = await identity.create(
        CreateAgentParams(
            name="wba-example",
            core_model="gpt-4.1-mini",
            system_prompt="Sign outbound API requests.",
        )
    )

    # 4. Sign request
    headers = await identity.sign_http_request(
        SignHttpRequestParams(
            method="POST",
            url="https://api.example.com/tasks",
            body='{"taskId":7}',
            agent_private_key=created.agent_private_key,
            agent_did=created.document.id,
        )
    )

    # 5. Verify request (this triggers HTTP resolver)
    result = await AgentIdentity.verify_http_request_signature(
        VerifyHttpRequestSignatureParams(
            method="POST",
            url="https://api.example.com/tasks",
            body='{"taskId":7}',
            headers=headers,
        )
    )

    assert result, "Verification failed"

    print({
        "did": created.document.id,
        "ok": result,
    })


if __name__ == "__main__":
    asyncio.run(main())
