from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
from openai import OpenAI
import json
from dotenv import load_dotenv
load_dotenv()


class AnalysisRequest(BaseModel):
    text: str


class HighlightedSentence(BaseModel):
    sentence: str
    emoji: str


class AnalysisResponse(BaseModel):
    summary: str
    sentiment: str
    highlights: List[HighlightedSentence]


app = FastAPI(title="AI Summary and Sentiment/Emoji Translator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_openai_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY environment variable is not set")
    return OpenAI(api_key=api_key)


@app.get("/")
async def root():
    return {"message": "Hello World"}


# @app.options("/analyze")
# async def options_analyze() -> Response:
#     # Explicitly handle CORS preflight for /analyze
#     return Response(
#         status_code=204,
#         headers={
#             "Access-Control-Allow-Origin": "*",
#             "Access-Control-Allow-Methods": "POST, OPTIONS",
#             "Access-Control-Allow-Headers": "*",
#         },
#     )

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_text(payload: AnalysisRequest) -> AnalysisResponse:
    client = get_openai_client()
    print('client')
    system_prompt = (
        "You are an assistant that summarizes long text, determines overall sentiment "
        "(positive, neutral, or negative), and picks 2-4 key sentences that justify "
        "the sentiment. For each highlight sentence, also choose a single emoji that "
        "matches the emotional tone.\n\n"
        "Return JSON with keys: summary (4 concise lines), sentiment (one of "
        "\"positive\", \"neutral\", \"negative\"), and highlights (array of "
        "objects with sentence and emoji fields)."
    )

    completion = client.chat.completions.create(
        model="gpt-4.1-mini",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": payload.text},
        ],
        temperature=0.3,
    )

    content = completion.choices[0].message.content

    try:
        data = json.loads(content or "{}")
    except json.JSONDecodeError:
        raise RuntimeError("Model returned invalid JSON")

    summary_raw = data.get("summary", "")

    # The model sometimes returns a list of lines instead of a single string.
    if isinstance(summary_raw, list):
        summary = "\n".join(str(line) for line in summary_raw)
    else:
        summary = str(summary_raw)

    sentiment = data.get("sentiment", "").lower()
    raw_highlights = data.get("highlights") or []

    highlights: List[HighlightedSentence] = []
    for item in raw_highlights:
        sentence = (item.get("sentence") or "").strip()
        emoji = (item.get("emoji") or "").strip()
        if sentence:
            highlights.append(HighlightedSentence(sentence=sentence, emoji=emoji))

    if sentiment not in {"positive", "neutral", "negative"}:
        sentiment = "neutral"

    return AnalysisResponse(summary=summary, sentiment=sentiment, highlights=highlights)
