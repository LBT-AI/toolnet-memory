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
        timeout: float = 10.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.token = token
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
