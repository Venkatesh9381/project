import json
import unittest
from unittest.mock import MagicMock, patch

import main


def ollama_response(content):
    response = MagicMock()
    response.__enter__.return_value.read.return_value = json.dumps({
        "message": {"content": json.dumps(content)}
    }).encode("utf-8")
    return response



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

    @patch("main.urllib.request.urlopen")
    def test_ollama_empty_strengths_use_honest_fallback_without_changing_score(self, urlopen):
        urlopen.return_value = ollama_response({
            "score": 35,
            "strengths": ["", "   "],
            "improvements": ["Answer the question asked", "Give a concrete example"],
            "suggested_structure": "State the approach, then an example."
        })
        result = main.ollama_review(self.payload)
        self.assertEqual(result["score"], 35)
        self.assertEqual(result["strengths"], [main.NO_CLEAR_STRENGTHS])
        self.assertIn("strengths_note", result)

    @patch("main.urllib.request.urlopen")
    def test_ollama_real_strengths_are_kept_and_not_flagged(self, urlopen):
        urlopen.return_value = ollama_response({
            "score": 72,
            "strengths": ["Clear reproduction steps"],
            "improvements": ["Add impact"],
            "suggested_structure": "Use STAR."
        })
        result = main.ollama_review(self.payload)
        self.assertEqual(result["strengths"], ["Clear reproduction steps"])
        self.assertNotIn("strengths_note", result)

    @patch("main.urllib.request.urlopen")
    def test_review_prompt_contains_calibrated_rubric_and_no_fabrication_rule(self, urlopen):
        urlopen.return_value = ollama_response({
            "score": 70, "strengths": ["Relevant"], "improvements": ["More detail"], "suggested_structure": "STAR"
        })
        main.ollama_review(self.payload)
        body = json.loads(urlopen.call_args[0][0].data.decode("utf-8"))
        prompt = body["messages"][1]["content"]
        for anchor in ("90-100", "75-89", "60-74", "40-59", "20-39", "0-19"):
            self.assertIn(anchor, prompt)
        self.assertIn("never invent praise", prompt)
        self.assertIn("Do not inflate the score", prompt)

    def test_ollama_timeout_is_configurable_and_bounded(self):
        with patch.dict("os.environ", {"OLLAMA_TIMEOUT_SECONDS": "30"}):
            self.assertEqual(main.ollama_timeout_seconds(), 30.0)
        with patch.dict("os.environ", {"OLLAMA_TIMEOUT_SECONDS": "not-a-number"}):
            self.assertEqual(main.ollama_timeout_seconds(), 45.0)
        with patch.dict("os.environ", {"OLLAMA_TIMEOUT_SECONDS": "9999"}):
            self.assertEqual(main.ollama_timeout_seconds(), 300.0)


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

    @patch("main.urllib.request.urlopen")
    def test_retry_once_when_too_few_questions_and_merge_without_duplicates(self, urlopen):
        urlopen.side_effect = [
            ollama_response({"questions": [
                "How would you design a stable test automation framework?",
                "How would you design a stable   TEST automation framework",
            ]}),
            ollama_response({"questions": [
                "how would you design a stable test automation framework?",
                "How do you isolate a flaky end-to-end test?",
                "How would you test a critical REST API workflow?",
            ]}),
        ]
        result = main.ollama_questions(self.payload)
        self.assertEqual(urlopen.call_count, 2)
        self.assertEqual(len(result), 3)
        keys = [main._question_key(q) for q in result]
        self.assertEqual(len(keys), len(set(keys)))
        retry_prompt = json.loads(urlopen.call_args_list[1][0][0].data.decode("utf-8"))["messages"][1]["content"]
        self.assertIn("exactly 2", retry_prompt)
        self.assertIn("stable test automation framework", retry_prompt)

    @patch("main.urllib.request.urlopen")
    def test_only_one_retry_then_labelled_template_fallback(self, urlopen):
        urlopen.side_effect = [
            ollama_response({"questions": ["Only one usable question here?"]}),
            ollama_response({"questions": ["Only one usable question here?"]}),
            AssertionError("a second retry must not happen"),
        ]
        result = main.generate_questions(self.payload)
        self.assertEqual(urlopen.call_count, 2)
        self.assertEqual(result["mode"], "role-template-fallback")
        self.assertEqual(len(result["questions"]), 3)
        self.assertIn("disclaimer", result)

    @patch("main.urllib.request.urlopen")
    def test_no_retry_when_first_response_is_complete(self, urlopen):
        urlopen.return_value = ollama_response({"questions": [
            "Question number one about automation?", "Question number two about flaky tests?", "Question number three about APIs?"
        ]})
        main.ollama_questions(self.payload)
        self.assertEqual(urlopen.call_count, 1)

    @patch("main.urllib.request.urlopen")
    def test_previous_questions_are_not_repeated(self, urlopen):
        payload = self.payload.model_copy(update={"previousQuestions": ["How do you isolate a flaky end-to-end test?"]})
        urlopen.side_effect = [
            ollama_response({"questions": [
                "How do you isolate a FLAKY end-to-end test?",
                "How would you design a stable test automation framework?",
                "How would you test a critical REST API workflow?",
            ]}),
            ollama_response({"questions": ["How would you report test results to stakeholders?"]}),
        ]
        result = main.ollama_questions(payload)
        self.assertEqual(len(result), 3)
        self.assertNotIn("flaky", " ".join(result).lower())

    def test_merge_unique_questions_normalises_case_and_whitespace(self):
        merged = main.merge_unique_questions(["What is REST?"], ["what  is rest", "What is GraphQL?", "WHAT IS GRAPHQL?"])
        self.assertEqual(merged, ["What is REST?", "What is GraphQL?"])


if __name__ == "__main__":
    unittest.main()
