# TabPilot — Action-First Web Co-Pilot (Track 2: Beyond the Browser)

**Team:** BYTECRAFT · **Institution:** Kumaraguru College of Technology  
**Members:** Tanushiya M (Lead), Mrithini Devi R, Deetshidha R, Bhuvadarshan S

## Overview
TabPilot transforms cluttered multi-tab browsing into a single, goal-driven workspace. Instead of forcing users to manually read, compare, and track fine print across dozens of tabs, TabPilot extracts key attributes into a **side-by-side decision matrix**, flags **hidden dealbreakers**, generates a **guided action checklist**, and delivers **ElevenLabs voice briefings**.

## Repository Structure
```text
TabPilot-MVP/
├── extension/          # Chrome Manifest V3 Sidepanel Extension
│   ├── manifest.json
│   ├── background.js
│   ├── sidepanel.html
│   ├── sidepanel.js
│   └── styles.css
├── backend/            # FastAPI Serverless Backend (AWS Lambda + DynamoDB + ElevenLabs)
│   ├── app.py
│   ├── requirements.txt
│   └── .env.example
└── demo-web/           # Zero-setup Interactive Browser Playground for Instant Demo
    └── index.html
```

## Quick Start (3 Ways to Run)

### 1. Instant Browser Demo (Zero Dependencies)
Open `demo-web/index.html` directly in Chrome or Edge to test the split-screen tab switcher, decision matrix generator, dealbreaker radar, and voice recap.

### 2. Load the Chrome Sidepanel Extension
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `extension/` folder.
4. Click the **TabPilot** extension icon in your toolbar to open the docked sidepanel.

### 3. Run the FastAPI + AWS/ElevenLabs Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # Add OPENAI_API_KEY and ELEVENLABS_API_KEY (optional; has smart fallback)
uvicorn app:app --reload --port 8000
```
