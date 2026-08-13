from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class ToolNetApiError(RuntimeError):
    def __init__(self, message: str, status: int | None = None) -> None:
        super().__init__(message)
        self.status = status


class ToolNetApiClient:
    def __init__(
        self,
        base_url: str,
        token: str | None = None,
        principal: str | None = None,
        timeout: float = 10.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.principal = principal
        self.timeout = timeout

        if not self.base_url:
            raise ValueError("base_url is required")

    def _request(
        self,
        path: str,
        payload: dict[str, Any] | None = None,
    ) -> Any:
        headers = {
            "Accept": "application/json",
        }

        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        if self.principal:
            headers["X-ToolNet-Principal"] = self.principal

        data: bytes | None = None
        method = "GET"

        if payload is not None:
            method = "POST"
            headers["Content-Type"] = "application/json"
            data = json.dumps(payload).encode("utf-8")

        request = Request(
            f"{self.base_url}{path}",
            data=data,
            headers=headers,
            method=method,
        )

        try:
            with urlopen(request, timeout=self.timeout) as response:
                raw = response.read().decode("utf-8")
        except HTTPError as error:
            raw = error.read().decode("utf-8", errors="replace")

            try:
                body = json.loads(raw)
            except json.JSONDecodeError:
                body = None

            message = (
                body.get("error")
                if isinstance(body, dict)
                and isinstance(body.get("error"), str)
                else f"ToolNet API request failed: HTTP {error.code}"
            )

            raise ToolNetApiError(message, error.code) from error
        except URLError as error:
            raise ToolNetApiError(
                f"ToolNet API connection failed: {error.reason}"
            ) from error

        if not raw:
            return None

        return json.loads(raw)

    def health(self) -> dict[str, Any]:
        return self._request("/v1/health")

    def project(self) -> dict[str, Any]:
        return self._request("/v1/project")

    def memory_ask(
        self,
        question: str,
        mode: str | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "question": question,
        }

        if mode is not None:
            payload["mode"] = mode

        return self._request("/v1/memory/ask", payload)

    def memory_search(
        self,
        query: str,
        limit: int | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "query": query,
        }

        if limit is not None:
            payload["limit"] = limit

        return self._request("/v1/memory/search", payload)

    def skill_search(
        self,
        query: str,
        limit: int | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "query": query,
        }

        if limit is not None:
            payload["limit"] = limit

        return self._request("/v1/skills/search", payload)

    def offload_read(
        self,
        asset_id: str,
        max_chars: int | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "assetId": asset_id,
        }

        if max_chars is not None:
            payload["maxChars"] = max_chars

        return self._request("/v1/offload/read", payload)

    def hub(self) -> dict[str, Any]:
        return self._request("/v1/hub")

    def hub_teams(self) -> dict[str, Any]:
        return self._request("/v1/hub/teams")

    def create_hub_team(
        self,
        name: str,
        team_id: str | None = None,
        description: str | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {"name": name}

        if team_id is not None:
            payload["id"] = team_id

        if description is not None:
            payload["description"] = description

        return self._request("/v1/hub/teams", payload)

    def hub_agents(self) -> dict[str, Any]:
        return self._request("/v1/hub/agents")

    def create_hub_agent(
        self,
        name: str,
        agent_id: str | None = None,
        kind: str | None = None,
        team_ids: list[str] | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {"name": name}

        if agent_id is not None:
            payload["id"] = agent_id

        if kind is not None:
            payload["kind"] = kind

        if team_ids is not None:
            payload["teamIds"] = team_ids

        return self._request("/v1/hub/agents", payload)

    def hub_acl(self) -> dict[str, Any]:
        return self._request("/v1/hub/acl")

    def grant_hub_acl(
        self,
        principal: str,
        role: str,
        scopes: list[str] | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "principal": principal,
            "role": role,
        }

        if scopes is not None:
            payload["scopes"] = scopes

        return self._request("/v1/hub/acl/grant", payload)

    def revoke_hub_acl(
        self,
        principal: str,
    ) -> dict[str, Any]:
        return self._request(
            "/v1/hub/acl/revoke",
            {"principal": principal},
        )

    def hub_loadouts(self) -> dict[str, Any]:
        return self._request("/v1/hub/loadouts")

    def set_hub_loadout(
        self,
        agent_id: str,
        tools: list[str] | None = None,
        memory_mode: str | None = None,
        skill_memory: bool | None = None,
        context_offload: bool | None = None,
        max_context_chars: int | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "agentId": agent_id,
        }

        if tools is not None:
            payload["tools"] = tools

        if memory_mode is not None:
            payload["memoryMode"] = memory_mode

        if skill_memory is not None:
            payload["skillMemory"] = skill_memory

        if context_offload is not None:
            payload["contextOffload"] = context_offload

        if max_context_chars is not None:
            payload["maxContextChars"] = max_context_chars

        return self._request("/v1/hub/loadouts", payload)

    def hub_observability(self) -> dict[str, Any]:
        return self._request("/v1/hub/observability")
