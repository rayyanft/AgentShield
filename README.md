# 🛡️ AgentShield

**AgentShield** is an educational, local-only web app that demonstrates how a safety layer for AI-agent tool requests can work. It reviews a proposed action, applies a clear policy, and records whether it would allow or block the action — without ever executing the action for real.

> **Simulation only.** No real web searches, emails, file deletions, or any external service calls are made at any point.

---

## How it differs from "ask every time"

| Ask every time | AgentShield policy gate |
|---|---|
| Human is interrupted for every action | Low-risk actions pass automatically |
| No consistent rule | Policy is deterministic and auditable |
| Approval fatigue | Only genuinely risky actions surface |

---

## Prerequisites

| Tool | Version |
|---|---|
| Python | 3.10 + |
| Node.js | 18 + |
| npm | 9 + |

---

## Project layout

```
agentshield/
├── README.md
├── backend/
│   ├── .env.example          ← copy to .env for optional config
│   ├── requirements.txt
│   ├── agentshield.db        ← created automatically on first run
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py           ← FastAPI app + policy gate
│   └── tests/
│       └── test_policy.py    ← pytest policy unit tests
└── frontend/
    ├── index.html
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── vite.config.js
    └── src/
        ├── App.jsx           ← main React component
        ├── index.css
        └── main.jsx
```

---

## Setup and run

### 1 · Backend (FastAPI + SQLite)

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server (auto-reloads on file changes)
uvicorn app.main:app --reload
```

The API is now available at **http://localhost:8000**.  
Interactive docs (Swagger UI): http://localhost:8000/docs

### 2 · Frontend (React + Vite + Tailwind CSS)

Open a **second terminal**:

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Trying the demo cases

Click **"Try this action →"** on any card:

| Card | Tool | Expected decision | Why |
|---|---|---|---|
| Search public information | `web_search` | ✅ **ALLOWED** | Read-only, public data, minimal risk |
| Send an email | `send_email` | 🚫 **BLOCKED** | Outbound communication requires human approval |
| Delete a file | `delete_file` | 🚫 **BLOCKED** | Destructive, irreversible action |

Every decision is saved to `backend/agentshield.db` and shown in the **Decision log** panel.

---

## Running the tests

```bash
cd backend
source .venv/bin/activate          # if not already active

pytest tests/test_policy.py -v
```

All tests run in-process — no server, no database, no network required.

### Building the frontend (production)

```bash
cd frontend
npm run build
```

Output is written to `frontend/dist/`.

---

## Optional environment variables

Copy `backend/.env.example` to `backend/.env` and set variables as needed.  
**The demo works with no `.env` file at all.**

| Variable | Default | Purpose |
|---|---|---|
| `CORS_ORIGIN` | `http://localhost:5173` | Allow this frontend origin |
| `DATABASE_URL` | `sqlite:///./agentshield.db` | (informational) |
| `LLM_PROVIDER` | *(unset)* | Future LLM integration placeholder |
| `LLM_API_KEY` | *(unset)* | Future LLM integration placeholder |
| `LLM_MODEL` | *(unset)* | Future LLM integration placeholder |

> **Security note:** LLM API keys are backend-only environment variables. They are never read by the frontend and never exposed through Vite's `VITE_*` variable mechanism.

---

## API reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness probe — returns `{"status":"ok"}` |
| `POST` | `/evaluate` | Evaluate a proposed action through the policy gate |
| `GET` | `/decisions?limit=20` | List recent decisions from the SQLite log |

---

## Understanding the policy gate

The policy is a plain list of rules in [`backend/app/main.py`](backend/app/main.py) — no LLM, no external config file, easy to read:

```python
POLICY_RULES = [
    {"tool": "delete_file", "outcome": "block", "reason": "..."},
    {"tool": "send_email",  "outcome": "block", "reason": "..."},
    {"tool": "web_search",  "outcome": "allow", "reason": "..."},
]
```

Rules are checked in order. The first match wins. Unknown tools are **blocked by default** (fail-safe).

---

## Architecture

```
Browser (React/Vite)
    │
    │  POST /api/evaluate   GET /api/decisions
    ▼
Vite dev proxy  ──►  FastAPI (localhost:8000)
                          │
                          ├── evaluate_policy()   ← no LLM, no network
                          │
                          └── SQLite (agentshield.db)
```

---

## Security and scope

- **Simulation only** — the backend never calls any real tool, service, or external API.
- The API listens on localhost only by default.
- CORS is restricted to the configured frontend origin.
- Only demo descriptions and policy decisions are stored in SQLite.
- No secrets are committed or printed.
