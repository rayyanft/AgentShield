import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:5173")
DB_PATH = Path(__file__).parent.parent / "agentshield.db"


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS decisions (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                action_id TEXT NOT NULL,
                label     TEXT NOT NULL,
                tool      TEXT NOT NULL,
                outcome   TEXT NOT NULL,
                reason    TEXT NOT NULL,
                ts        TEXT NOT NULL
            )
            """
        )
        conn.commit()


POLICY_RULES: list[dict] = [
    {
        "tool": "delete_file",
        "outcome": "block",
        "reason": (
            "Deleting files is a destructive, irreversible action. "
            "The policy blocks all delete operations automatically."
        ),
    },
    {
        "tool": "send_email",
        "outcome": "block",
        "reason": (
            "Sending messages to external parties requires explicit human approval. "
            "The policy blocks all outbound communication actions."
        ),
    },
    {
        "tool": "web_search",
        "outcome": "allow",
        "reason": (
            "Read-only search of public information poses minimal risk. "
            "The policy allows this action automatically without human confirmation."
        ),
    },
]


def evaluate_policy(tool: str) -> tuple[Literal["allow", "block"], str]:
    for rule in POLICY_RULES:
        if rule["tool"] == tool:
            return rule["outcome"], rule["reason"]  # type: ignore[return-value]

    return "block", (
        f"No policy rule found for tool '{tool}'. "
        "Unknown actions are blocked by default."
    )


app = FastAPI(title="AgentShield API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

init_db()


class ActionRequest(BaseModel):
    action_id: str
    label: str
    tool: str
    description: str


class DecisionResponse(BaseModel):
    action_id: str
    label: str
    tool: str
    outcome: Literal["allow", "block"]
    reason: str
    ts: str
    simulated: bool = True


class DecisionRecord(BaseModel):
    id: int
    action_id: str
    label: str
    tool: str
    outcome: Literal["allow", "block"]
    reason: str
    ts: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "AgentShield"}


@app.post("/evaluate", response_model=DecisionResponse)
def evaluate(request: ActionRequest):
    outcome, reason = evaluate_policy(request.tool)
    ts = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        conn.execute(
            "INSERT INTO decisions (action_id, label, tool, outcome, reason, ts) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (request.action_id, request.label, request.tool, outcome, reason, ts),
        )
        conn.commit()

    return DecisionResponse(
        action_id=request.action_id,
        label=request.label,
        tool=request.tool,
        outcome=outcome,
        reason=reason,
        ts=ts,
        simulated=True,
    )


@app.get("/decisions", response_model=list[DecisionRecord])
def list_decisions(limit: int = 20):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM decisions ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    return [dict(row) for row in rows]
