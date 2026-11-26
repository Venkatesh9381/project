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


class QuestionGenerationTests(unittest.TestCase):
    def setUp(self):
        self.payload = main.QuestionRequest(
            role="QA Automation Engineer",
            interviewType="Technical",
            level="Intermediate",
            difficulty="Hard",
            count=3,
        )

    def test_fallback_questions_are_role_aware_and_match_requested_count(self):
        result = main.fallback_questions(self.payload)
        self.assertEqual(len(result), 3)
        self.assertTrue(all("QA Automation Engineer" in question for question in result))

    @patch("main.urllib.request.urlopen")
    def test_ollama_questions_returns_requested_number(self, urlopen):
        response = MagicMock()
        response.__enter__.return_value.read.return_value = json.dumps({
            "message": {"content": json.dumps({
                "questions": [
                    "How would you design a stable test automation framework?",
                    "How do you isolate a flaky end-to-end test?",
                    "How would you test a critical REST API workflow?"
                ]
            })}
        }).encode("utf-8")
        urlopen.return_value = response
        result = main.ollama_questions(self.payload)
        self.assertEqual(len(result), 3)
        self.assertIn("flaky", result[1])

    @patch("main.ollama_questions", side_effect=OSError("Ollama is offline"))
    def test_generation_uses_transparent_fallback_when_model_is_unavailable(self, _ollama):
        result = main.generate_questions(self.payload)
        self.assertEqual(result["mode"], "role-template-fallback")
        self.assertEqual(len(result["questions"]), 3)
        self.assertIn("disclaimer", result)


if __name__ == "__main__":
    unittest.main()
