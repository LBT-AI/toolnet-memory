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


class ToolNetWikiClientTests(unittest.TestCase):
    def test_wiki_search(self):
        client = ToolNetApiClient(
            "http://127.0.0.1:9750",
            principal="owner",
        )

        with patch(
            "toolnet_memory.client.urlopen",
            return_value=FakeResponse(
                {
                    "schema": "toolnet.api-wiki-search.v1",
                    "query": "architecture",
                    "results": [],
                }
            ),
        ) as mocked:
            result = client.wiki_search(
                "architecture",
                5,
            )

        self.assertEqual(result["results"], [])

        request = mocked.call_args.args[0]

        self.assertIn(
            "/v1/wiki/search?",
            request.full_url,
        )

    def test_wiki_update_uses_put(self):
        client = ToolNetApiClient(
            "http://127.0.0.1:9750",
        )

        with patch(
            "toolnet_memory.client.urlopen",
            return_value=FakeResponse(
                {
                    "schema": "toolnet.api-wiki-page.v1",
                    "page": {
                        "slug": "architecture",
                    },
                }
            ),
        ) as mocked:
            client.update_wiki_page(
                "architecture",
                content="updated",
            )

        request = mocked.call_args.args[0]

        self.assertEqual(request.get_method(), "PUT")


if __name__ == "__main__":
    unittest.main()
