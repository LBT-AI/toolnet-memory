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


class GovernanceClientTests(unittest.TestCase):
    def test_governance(self):
        client = ToolNetApiClient(
            "http://127.0.0.1:9750",
            principal="owner",
        )

        with patch(
            "toolnet_memory.client.urlopen",
            return_value=FakeResponse(
                {
                    "schema": "toolnet.api-governance-summary.v1",
                    "governance": {
                        "pending": 0,
                    },
                }
            ),
        ) as mocked:
            result = client.governance()

        self.assertEqual(
            result["governance"]["pending"],
            0,
        )

        request = mocked.call_args.args[0]

        self.assertTrue(
            request.full_url.endswith(
                "/v1/governance"
            )
        )

    def test_policy_update_uses_put(self):
        client = ToolNetApiClient(
            "http://127.0.0.1:9750"
        )

        with patch(
            "toolnet_memory.client.urlopen",
            return_value=FakeResponse(
                {
                    "schema": "toolnet.api-governance-policy.v1",
                    "policy": {
                        "staleAfterDays": 30,
                    },
                }
            ),
        ) as mocked:
            client.set_governance_policy(
                stale_after_days=30
            )

        request = mocked.call_args.args[0]

        self.assertEqual(
            request.get_method(),
            "PUT",
        )


if __name__ == "__main__":
    unittest.main()
