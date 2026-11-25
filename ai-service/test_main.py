import json
import unittest
from unittest.mock import MagicMock, patch

import main


class ReviewServiceTests(unittest.TestCase):
    def setUp(self):
        self.payload = main.ReviewRequest(
            question="How do you handle a production bug?",
            answer="I first reproduce the issue, inspect logs, isolate the cause and validate the fix.",
            role="QA Engineer",
            interviewType="Technical",
        )

    def test_heuristic_fallback_is_explicitly_labelled(self):
        result = main.heuristic_review(self.payload)
        self.assertEqual(result["mode"], "heuristic-demo")
        self.assertIn("not an LLM", result["disclaimer"])
        self.assertGreaterEqual(result["score"], 0)
        self.assertLessEqual(result["score"], 100)

    @patch("main.urllib.request.urlopen")
    def test_ollama_json_response_is_normalised(self, urlopen):
        response = MagicMock()
        response.__enter__.return_value.read.return_value = json.dumps({
            "message": {"content": json.dumps({
                "score": 84,
                "strengths": ["Clear diagnosis", "Good validation"],
                "improvements": ["Add impact", "Mention monitoring"],
                "suggested_structure": "Use context, action and result."
            })}
        }).encode("utf-8")
        urlopen.return_value = response

        result = main.ollama_review(self.payload)
        self.assertEqual(result["mode"], "ollama")
        self.assertEqual(result["score"], 84)
        self.assertEqual(len(result["strengths"]), 2)

    @patch("main.ollama_review", side_effect=OSError("Ollama is offline"))
    def test_review_falls_back_when_ollama_is_unavailable(self, _ollama):
        result = main.review(self.payload)
        self.assertEqual(result["mode"], "heuristic-demo")

    @patch("main.urllib.request.urlopen")
    def test_invalid_model_output_is_rejected(self, urlopen):
        response = MagicMock()
        response.__enter__.return_value.read.return_value = json.dumps({
            "message": {"content": "{not valid json"}
        }).encode("utf-8")
        urlopen.return_value = response
        with self.assertRaises(json.JSONDecodeError):
            main.ollama_review(self.payload)


if __name__ == "__main__":
    unittest.main()
