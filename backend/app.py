import os
import json
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
import httpx

# Optional AWS SDK (boto3) for DynamoDB session logging
try:
    import boto3
    dynamodb = boto3.resource("dynamodb", region_name=os.getenv("AWS_REGION", "ap-south-1"))
    TABLE_NAME = os.getenv("DYNAMODB_TABLE", "TabPilotSessions")
except Exception:
    dynamodb = None
    TABLE_NAME = None

app = FastAPI(title="TabPilot AWS Serverless API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class TabItem(BaseModel):
    title: str
    url: str
    snippet: Optional[str] = ""

class AnalyzeRequest(BaseModel):
    goal: str
    tabs: List[TabItem]

class VoiceRequest(BaseModel):
    text: str

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "TabPilot API", "timestamp": datetime.utcnow().isoformat()}

@app.post("/api/analyze")
async def analyze_tabs(req: AnalyzeRequest):
    if not req.tabs:
        raise HTTPException(status_code=400, detail="No browser tabs provided.")

    openai_key = os.getenv("OPENAI_API_KEY")
    result_payload = None

    if openai_key:
        prompt = f"""You are TabPilot, an action-first web decision assistant.
User Goal: {req.goal}
Open Tabs: {json.dumps([t.dict() for t in req.tabs])}

Return STRICT JSON with keys:
- "matrix": list of objects with keys "option", "specs", "cost", "verdict"
- "dealbreakers": list of 3 concise fine-print warnings or hidden trade-offs
- "checklist": list of 3 concrete next-step actions for the user
- "voice_summary": 2-sentence spoken briefing suitable for ElevenLabs TTS"""

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {openai_key}"},
                json={
                    "model": "gpt-4o-mini",
                    "response_format": {"type": "json_object"},
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2,
                },
            )
            if resp.status_code == 200:
                content = resp.json()["choices"][0]["message"]["content"]
                result_payload = json.loads(content)

    # Deterministic structured synthesis fallback when running locally without API keys
    if not result_payload:
        result_payload = {
            "matrix": [
                {
                    "option": t.title[:32],
                    "specs": (t.snippet[:75] + "...") if t.snippet else "Extracted page attributes",
                    "cost": "Compare Tier",
                    "verdict": "Top Match" if i == 0 else "Alternative"
                }
                for i, t in enumerate(req.tabs[:4])
            ],
            "dealbreakers": [
                "Check cancellation/return window fine print before finalizing.",
                "Compare total bundled cost including taxes and add-on fees.",
                "Verify eligibility requirements across selected tabs."
            ],
            "checklist": [
                f"Review top-ranked option: {req.tabs[0].title[:35]}",
                "Validate hidden terms flagged in Dealbreaker Radar",
                "Complete checkout or form submission with verified details"
            ],
            "voice_summary": f"TabPilot analyzed {len(req.tabs)} open tabs for your goal: {req.goal}. Review the side-by-side matrix and three fine-print checks before proceeding."
        }

    # Persist snapshot to AWS DynamoDB when deployed on AWS
    if dynamodb and TABLE_NAME:
        try:
            table = dynamodb.Table(TABLE_NAME)
            table.put_item(
                Item={
                    "session_id": str(uuid.uuid4()),
                    "goal": req.goal,
                    "tab_count": len(req.tabs),
                    "created_at": datetime.utcnow().isoformat()
                }
            )
        except Exception:
            pass

    return result_payload

@app.post("/api/voice")
async def generate_voice_briefing(req: VoiceRequest):
    eleven_key = os.getenv("ELEVENLABS_API_KEY")
    voice_id = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")  # Rachel default voice

    if not eleven_key:
        raise HTTPException(status_code=501, detail="ELEVENLABS_API_KEY not configured; client uses browser TTS fallback.")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            url,
            headers={
                "xi-api-key": eleven_key,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
            json={
                "text": req.text,
                "model_id": "eleven_monolingual_v1",
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
            },
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="ElevenLabs synthesis failed")
        return Response(content=resp.content, media_type="audio/mpeg")
