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


class ToolNetHubClientTests(unittest.TestCase):
    def test_hub_sends_principal_header(self):
        client = ToolNetApiClient(
            "http://127.0.0.1:9750",
            principal="owner",
        )

        with patch(
            "toolnet_memory.client.urlopen",
            return_value=FakeResponse(
                {
                    "schema": "toolnet.api-hub-summary.v1",
                    "hub": {
                        "teams": 0,
                        "agents": 0,
                    },
                }
            ),
        ) as mocked:
            result = client.hub()

        self.assertEqual(result["hub"]["teams"], 0)

        request = mocked.call_args.args[0]

        headers = dict(request.header_items())

        self.assertEqual(
            headers.get("X-toolnet-principal"),
            "owner",
        )


if __name__ == "__main__":
    unittest.main()
