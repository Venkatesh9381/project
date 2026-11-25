from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Literal

app = FastAPI(title="InterviewOS AI Service", version="0.1.0")

class ReviewRequest(BaseModel):
    question: str = Field(min_length=5, max_length=2000)
    answer: str = Field(min_length=12, max_length=12000)
    role: str = Field(default="Candidate", max_length=120)
    interviewType: Literal["Technical", "HR", "Mixed"] = "Technical"

@app.get("/health")
def health():
    return {"status": "ok", "service": "interviewos-ai", "mode": "heuristic-demo"}

@app.post("/review")
def review(payload: ReviewRequest):
    words = payload.answer.split()
    lower = payload.answer.lower()
    score = min(95, max(48, 52 + round(len(words) * 0.55) + (5 if "because" in lower else 0)))
    return {
        "mode": "heuristic-demo",
        "disclaimer": "This is a transparent rule-based demo, not an LLM evaluation.",
        "score": score,
        "strengths": [
            "You addressed the question directly.",
            "You provided supporting detail." if len(words) > 35 else "Your answer is concise."
        ],
        "improvements": [
            "Add a specific example and explain your personal contribution.",
            "Finish with the outcome or lesson learned."
        ],
        "suggested_structure": "Explain the context, your responsibility, the actions you took, and the result."
    }
