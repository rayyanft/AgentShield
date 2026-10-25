"""
AgentShield – policy unit tests
================================
These tests verify the deterministic policy gate in isolation.
No network, no database, no real tools are touched.

Run with:  pytest backend/tests/test_policy.py -v
"""

import sys
from pathlib import Path

# Allow importing from backend/app without installing the package
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.main import evaluate_policy


# ── allowed actions ───────────────────────────────────────────────────────────

def test_web_search_is_allowed():
    outcome, reason = evaluate_policy("web_search")
    assert outcome == "allow"
    assert "allow" in reason.lower() or "minimal risk" in reason.lower() or "public" in reason.lower()


# ── blocked actions ───────────────────────────────────────────────────────────

def test_send_email_is_blocked():
    outcome, reason = evaluate_policy("send_email")
    assert outcome == "block"
    assert len(reason) > 10  # must give a non-trivial explanation


def test_delete_file_is_blocked():
    outcome, reason = evaluate_policy("delete_file")
    assert outcome == "block"
    assert len(reason) > 10


# ── fail-safe default ─────────────────────────────────────────────────────────

def test_unknown_tool_is_blocked_by_default():
    outcome, reason = evaluate_policy("launch_rocket")
    assert outcome == "block"
    assert "unknown" in reason.lower() or "no policy" in reason.lower()


def test_empty_tool_name_is_blocked():
    outcome, reason = evaluate_policy("")
    assert outcome == "block"


# ── reason quality ────────────────────────────────────────────────────────────

def test_all_known_tools_return_nonempty_reason():
    """Every known tool must produce a human-readable reason."""
    for tool in ("web_search", "send_email", "delete_file"):
        _, reason = evaluate_policy(tool)
        assert reason.strip(), f"Empty reason for tool: {tool}"


def test_outcomes_are_valid_literals():
    for tool in ("web_search", "send_email", "delete_file", "unknown_tool"):
        outcome, _ = evaluate_policy(tool)
        assert outcome in ("allow", "block"), f"Unexpected outcome: {outcome}"
