import { useCallback, useEffect, useState } from "react";

const API = "/api";

const DEMO_ACTIONS = [
  {
    action_id: "web_search",
    label: "Search public information",
    tool: "web_search",
    description: 'Search the web for "current weather in New York"',
    expectedOutcome: "allow",
  },
  {
    action_id: "send_email",
    label: "Send an email",
    tool: "send_email",
    description: 'Send an email to user@example.com — "Hello from AgentShield"',
    expectedOutcome: "block",
  },
  {
    action_id: "delete_file",
    label: "Delete a file",
    tool: "delete_file",
    description: 'Delete "/home/user/documents/report.pdf"',
    expectedOutcome: "block",
  },
];

const POLICY_TABLE = [
  {
    tool: "web_search",
    outcome: "allow",
    rationale: "Read-only · public data · no side effects",
  },
  {
    tool: "send_email",
    outcome: "block",
    rationale: "Outbound communication · requires human approval",
  },
  {
    tool: "delete_file",
    outcome: "block",
    rationale: "Destructive · irreversible",
  },
  {
    tool: "<unknown>",
    outcome: "block",
    rationale: "Fail-safe default — unknown tools are always blocked",
    muted: true,
  },
];

function formatTs(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function Pill({ outcome }) {
  return outcome === "allow" ? (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold tracking-wide text-emerald-700 uppercase">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Allowed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-semibold tracking-wide text-red-700 uppercase">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      Blocked
    </span>
  );
}

function ConnectionDot({ status }) {
  const map = {
    checking: { ring: "bg-amber-400 animate-pulse", label: "Connecting…", color: "text-amber-600" },
    ok: { ring: "bg-emerald-500", label: "Connected", color: "text-emerald-600" },
    error: { ring: "bg-red-500", label: "Offline", color: "text-red-600" },
  };
  const s = map[status] ?? map.checking;
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${s.color}`}>
      <span className={`h-2 w-2 rounded-full ${s.ring}`} />
      {s.label}
    </div>
  );
}

function SetupCard() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
      <p className="text-sm font-semibold text-amber-800 mb-1">Backend not running</p>
      <p className="text-sm text-amber-700 mb-3">
        Start the FastAPI server, then refresh this page.
      </p>
      <pre className="rounded-md bg-white border border-amber-200 p-3 text-xs text-slate-700 overflow-x-auto leading-relaxed">
{`cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload`}
      </pre>
    </div>
  );
}

function ActionCard({ action, onEvaluate, loading, result }) {
  const busy = loading === action.action_id;
  const isAllow = action.expectedOutcome === "allow";

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">
              Tool · <span className="font-mono normal-case">{action.tool}</span>
            </p>
            <h3 className="text-base font-semibold text-slate-900">{action.label}</h3>
          </div>
          <span
            className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold border ${
              isAllow
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {isAllow ? "Will allow" : "Will block"}
          </span>
        </div>

        <p className="text-sm text-slate-500 font-mono bg-slate-50 rounded px-3 py-2 border border-slate-100">
          {action.description}
        </p>

        {result && (
          <div
            className={`mt-4 rounded-md border p-4 ${
              result.outcome === "allow"
                ? "bg-emerald-50 border-emerald-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Pill outcome={result.outcome} />
              <span className="text-xs text-slate-400 tabular-nums">{formatTs(result.ts)}</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{result.reason}</p>
            <p className="mt-2 text-xs text-slate-400">
              No real action was executed — simulation only.
            </p>
          </div>
        )}
      </div>

      <div className="px-5 py-4 bg-slate-50 border-t border-slate-100">
        <button
          onClick={() => onEvaluate(action)}
          disabled={busy}
          className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white
                     hover:bg-slate-700 disabled:opacity-40 transition-colors duration-150
                     focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-1"
        >
          {busy ? "Evaluating…" : "Evaluate action"}
        </button>
      </div>
    </div>
  );
}

function LogPanel({ decisions, onRefresh, refreshing }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <span className="text-sm font-semibold text-slate-700">Decision log</span>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-40 transition-colors"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {decisions.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400">
          No decisions yet. Evaluate an action above.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {decisions.map((d) => (
            <li key={d.id} className="flex items-center gap-4 px-5 py-3">
              <Pill outcome={d.outcome} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{d.label}</p>
                <p className="text-xs text-slate-400 truncate">{d.reason}</p>
              </div>
              <span className="text-xs text-slate-400 tabular-nums shrink-0">
                {formatTs(d.ts)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PolicyTable() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100">
        <span className="text-sm font-semibold text-slate-700">Policy rules</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <th className="px-5 py-2.5 text-left">Tool</th>
            <th className="px-5 py-2.5 text-left">Decision</th>
            <th className="px-5 py-2.5 text-left">Rationale</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {POLICY_TABLE.map((row) => (
            <tr key={row.tool} className={row.muted ? "opacity-50" : ""}>
              <td className="px-5 py-3 font-mono text-slate-700">{row.tool}</td>
              <td className="px-5 py-3">
                <Pill outcome={row.outcome} />
              </td>
              <td className="px-5 py-3 text-slate-500">{row.rationale}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [backendStatus, setBackendStatus] = useState("checking");
  const [results, setResults] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [logRefreshing, setLogRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API}/health`);
      setBackendStatus(res.ok ? "ok" : "error");
    } catch {
      setBackendStatus("error");
    }
  }, []);

  const loadDecisions = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLogRefreshing(true);
    try {
      const res = await fetch(`${API}/decisions?limit=15`);
      if (res.ok) setDecisions(await res.json());
    } catch {
    } finally {
      setLogRefreshing(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    loadDecisions();
  }, [checkHealth, loadDecisions]);

  const handleEvaluate = useCallback(
    async (action) => {
      setLoadingId(action.action_id);
      setError(null);
      try {
        const res = await fetch(`${API}/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        });
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data = await res.json();
        setResults((prev) => ({ ...prev, [action.action_id]: data }));
        await loadDecisions();
      } catch (err) {
        setError(`Could not reach the backend: ${err.message}`);
        setBackendStatus("error");
      } finally {
        setLoadingId(null);
      }
    },
    [loadDecisions]
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white text-sm font-bold select-none">
              AS
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900 leading-none">AgentShield</h1>
              <p className="text-xs text-slate-400 mt-0.5">AI safety layer · local demo</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">
              Simulation — no real actions
            </span>
            <ConnectionDot status={backendStatus} />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">

        <section className="grid sm:grid-cols-2 gap-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Policy-based agent safety
            </h2>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-prose">
              AgentShield intercepts an AI agent's proposed tool calls and evaluates
              them against a set of explicit rules before anything is executed. Low-risk
              read-only actions pass automatically; destructive or outbound actions are
              blocked every time — no human prompt required, no LLM in the loop.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 content-start">
            {[
              { label: "Rules checked", value: "3" },
              { label: "Auto-allowed", value: "1" },
              { label: "Auto-blocked", value: "2" },
              { label: "Fail-safe default", value: "Block" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {backendStatus === "error" && <SetupCard />}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">Try an action</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Click <strong>Evaluate action</strong> to run it through the policy gate. Nothing is
              actually executed.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {DEMO_ACTIONS.map((action) => (
              <ActionCard
                key={action.action_id}
                action={action}
                onEvaluate={handleEvaluate}
                loading={loadingId}
                result={results[action.action_id]}
              />
            ))}
          </div>
        </section>

        <div className="grid sm:grid-cols-2 gap-6 items-start">
          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-4">Audit log</h2>
            <LogPanel
              decisions={decisions}
              onRefresh={() => loadDecisions(true)}
              refreshing={logRefreshing}
            />
          </section>

          <section>
            <h2 className="text-base font-semibold text-slate-900 mb-4">Active policy</h2>
            <PolicyTable />
          </section>
        </div>

        <footer className="border-t border-slate-200 pt-6 pb-2 flex items-center justify-between flex-wrap gap-3 text-xs text-slate-400">
          <span>AgentShield · educational simulation · no real actions are executed</span>
          <span>Python · FastAPI · SQLite · React · Vite</span>
        </footer>
      </main>
    </div>
  );
}
