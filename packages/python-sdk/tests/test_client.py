import json
import unittest
from unittest.mock import patch

from toolnet_memory import ToolNetApiClient


class FakeResponse:
    def __init__(self, body):
        self.body = json.dumps(body).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False

    def read(self):
        return self.body


class ToolNetApiClientTests(unittest.TestCase):
    def test_health_uses_bearer_token(self):
        client = ToolNetApiClient(
            "http://127.0.0.1:9750/",
            token="python-secret",
        )

        with patch(
            "toolnet_memory.client.urlopen",
            return_value=FakeResponse(
                {
                    "ok": True,
                    "schema": "toolnet.api-health.v1",
                }
            ),
        ) as mocked:
            result = client.health()

        self.assertTrue(result["ok"])

        request = mocked.call_args.args[0]

        self.assertEqual(
            request.full_url,
            "http://127.0.0.1:9750/v1/health",
        )

        self.assertEqual(
            dict(request.header_items()).get("Authorization"),
            "Bearer python-secret",
        )

    def test_memory_search_posts_json(self):
        client = ToolNetApiClient("http://127.0.0.1:9750")

        with patch(
            "toolnet_memory.client.urlopen",
            return_value=FakeResponse(
                {
                    "schema": "toolnet.api-memory-search.v1",
                    "results": [],
                }
            ),
        ) as mocked:
            result = client.memory_search("test memory", 5)

        self.assertEqual(result["results"], [])

        request = mocked.call_args.args[0]

        self.assertEqual(request.get_method(), "POST")

        self.assertEqual(
            json.loads(request.data.decode("utf-8")),
            {
                "query": "test memory",
                "limit": 5,
            },
        )


if __name__ == "__main__":
    unittest.main()
