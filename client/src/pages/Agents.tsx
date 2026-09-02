import { useEffect, useState } from 'react';
import { agents as agentsApi } from '../api';
import { HudPanel } from '../components/jarvis/HudBits';
import type { Agent, AgentRun, Autonomy, ToolSpec } from '../types';

/** Blank slate for the forge form. */
const EMPTY = {
  name: '',
  role: '',
  systemPrompt: '',
  tools: [] as string[],
  autonomy: 'READ_ONLY' as Autonomy,
};

function parseTools(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function Chip({ children, tone = 'cyan' }: { children: React.ReactNode; tone?: 'cyan' | 'amber' | 'dim' | 'red' }) {
  const tones = {
    cyan: 'border-cyan-400/30 text-cyan-300/85 bg-cyan-400/5',
    amber: 'border-amber-400/40 text-amber-300/90 bg-amber-400/5',
    dim: 'border-cyan-400/15 text-cyan-400/45',
    red: 'border-rose-400/40 text-rose-300/90 bg-rose-400/5',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-sm border text-[10px] tracking-wider uppercase ${tones[tone]}`}>
      {children}
    </span>
  );
}

export default function Agents() {
  const [roster, setRoster] = useState<Agent[]>([]);
  const [palette, setPalette] = useState<ToolSpec[]>([]);
  const [draft, setDraft] = useState({ ...EMPTY });
  const [forging, setForging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Agent | null>(null);
  const [task, setTask] = useState('');
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<AgentRun[]>([]);

  const refresh = () => agentsApi.list().then(setRoster).catch(() => {});

  useEffect(() => {
    refresh();
    agentsApi.tools().then(setPalette).catch(() => {});
  }, []);

  const toggleTool = (name: string) =>
    setDraft(d => ({
      ...d,
      tools: d.tools.includes(name) ? d.tools.filter(t => t !== name) : [...d.tools, name],
    }));

  const forge = async () => {
    setForging(true);
    setError(null);
    try {
      await agentsApi.create(draft);
      setDraft({ ...EMPTY });
      refresh();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Could not create the agent.');
    } finally {
      setForging(false);
    }
  };

  const open = async (agent: Agent) => {
    setSelected(agent);
    setRuns([]);
    setTask('');
    agentsApi.runs(agent.id).then(setRuns).catch(() => {});
  };

  const dispatch = async () => {
    if (!selected || !task.trim()) return;
    setRunning(true);
    try {
      const run = await agentsApi.run(selected.id, task.trim());
      setRuns(prev => [run, ...prev]);
      setTask('');
      refresh();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'The agent could not be dispatched.');
    } finally {
      setRunning(false);
    }
  };

  const retire = async (agent: Agent) => {
    await agentsApi.delete(agent.id);
    if (selected?.id === agent.id) setSelected(null);
    refresh();
  };

  const canForge =
    draft.name.trim() && draft.role.trim() && draft.systemPrompt.trim().length >= 20 && draft.tools.length > 0;

  return (
    <div className="hud relative min-h-full overflow-hidden">
      <div className="absolute inset-0 hud-grid pointer-events-none" />
      <div className="absolute inset-0 hud-vignette pointer-events-none" />

      <div className="relative p-6 space-y-4" style={{ minHeight: '100vh' }}>
        <header className="hud-boot">
          <h1 className="text-xl font-semibold tracking-[0.3em] hud-glow">AGENT ROSTER</h1>
          <p className="text-[10px] tracking-[0.25em] uppercase text-cyan-400/50 mt-1">
            Standing orders JARVIS and you can dispatch on demand
          </p>
        </header>

        {error && (
          <div className="hud-panel rounded-sm p-3 text-xs text-rose-300 border-rose-400/40">{error}</div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* ── Roster ───────────────────────────────────────────────── */}
          <HudPanel label={`Roster · ${roster.length}`} className="p-4">
            <div className="space-y-3 pt-2">
              {roster.length === 0 && (
                <p className="text-xs text-cyan-400/45 py-6 text-center">
                  No agents yet. Forge one here, or ask JARVIS to build you one.
                </p>
              )}

              {roster.map(agent => (
                <div
                  key={agent.id}
                  className={`border rounded-sm p-3 cursor-pointer transition-colors ${
                    selected?.id === agent.id
                      ? 'border-cyan-400/60 bg-cyan-400/5'
                      : 'border-cyan-400/15 hover:border-cyan-400/35'
                  }`}
                  onClick={() => open(agent)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-cyan-200 hud-glow truncate">{agent.name}</div>
                      <div className="text-[11px] text-cyan-400/55 mt-0.5">{agent.role}</div>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        retire(agent);
                      }}
                      className="shrink-0 text-[10px] tracking-wider uppercase text-rose-400/60 hover:text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <Chip tone={agent.autonomy === 'COMMAND' ? 'amber' : 'dim'}>
                      {agent.autonomy === 'COMMAND' ? 'command' : 'read only'}
                    </Chip>
                    <Chip tone={agent.createdBy === 'JARVIS' ? 'cyan' : 'dim'}>
                      by {agent.createdBy.toLowerCase()}
                    </Chip>
                    <Chip tone="dim">{agent._count?.runs ?? 0} runs</Chip>
                    {parseTools(agent.tools).map(t => (
                      <Chip key={t} tone="dim">
                        {t.replace(/_/g, ' ')}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </HudPanel>

          {/* ── Forge ────────────────────────────────────────────────── */}
          <HudPanel label="Forge a new agent" className="p-4">
            <div className="space-y-3 pt-2">
              <input
                value={draft.name}
                onChange={e => setDraft({ ...draft, name: e.target.value })}
                placeholder="Name — e.g. Dispatch Watch"
                className="w-full bg-transparent border border-cyan-400/20 rounded-sm px-3 py-2 text-sm text-cyan-100 placeholder:text-cyan-400/30 focus:outline-none focus:border-cyan-400/60"
              />
              <input
                value={draft.role}
                onChange={e => setDraft({ ...draft, role: e.target.value })}
                placeholder="Role — one line on what it is for"
                className="w-full bg-transparent border border-cyan-400/20 rounded-sm px-3 py-2 text-sm text-cyan-100 placeholder:text-cyan-400/30 focus:outline-none focus:border-cyan-400/60"
              />
              <textarea
                value={draft.systemPrompt}
                onChange={e => setDraft({ ...draft, systemPrompt: e.target.value })}
                rows={4}
                placeholder="Standing orders, in the second person — 'You watch for orders stuck in PENDING and report the oldest first…'"
                className="w-full bg-transparent border border-cyan-400/20 rounded-sm px-3 py-2 text-sm text-cyan-100 placeholder:text-cyan-400/30 focus:outline-none focus:border-cyan-400/60 resize-none"
              />

              <div>
                <div className="text-[10px] tracking-[0.25em] uppercase text-cyan-400/50 mb-2">
                  Tools · {draft.tools.length} selected
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {palette.map(tool => (
                    <button
                      key={tool.name}
                      onClick={() => toggleTool(tool.name)}
                      title={tool.description}
                      className={`px-2 py-1 rounded-sm border text-[10px] tracking-wider uppercase transition-colors ${
                        draft.tools.includes(tool.name)
                          ? tool.mutates
                            ? 'border-amber-400/60 text-amber-300 bg-amber-400/10'
                            : 'border-cyan-400/60 text-cyan-200 bg-cyan-400/10'
                          : 'border-cyan-400/15 text-cyan-400/45 hover:border-cyan-400/40'
                      }`}
                    >
                      {tool.name.replace(/_/g, ' ')}
                      {tool.mutates && ' ⚠'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(['READ_ONLY', 'COMMAND'] as Autonomy[]).map(level => (
                  <button
                    key={level}
                    onClick={() => setDraft({ ...draft, autonomy: level })}
                    className={`flex-1 py-2 text-[10px] tracking-[0.2em] uppercase border rounded-sm transition-colors ${
                      draft.autonomy === level
                        ? level === 'COMMAND'
                          ? 'border-amber-400/70 text-amber-300 bg-amber-400/10'
                          : 'border-cyan-400/60 text-cyan-200 bg-cyan-400/10'
                        : 'border-cyan-400/15 text-cyan-400/45 hover:border-cyan-400/40'
                    }`}
                  >
                    {level === 'COMMAND' ? 'May act' : 'Reports only'}
                  </button>
                ))}
              </div>

              <button
                onClick={forge}
                disabled={!canForge || forging}
                className="w-full py-2.5 text-[11px] tracking-[0.25em] uppercase border border-cyan-400/40 rounded-sm text-cyan-200 hover:bg-cyan-400/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
              >
                {forging ? 'Forging…' : 'Forge agent'}
              </button>
            </div>
          </HudPanel>
        </div>

        {/* ── Dispatch console ───────────────────────────────────────── */}
        {selected && (
          <HudPanel label={`Dispatch · ${selected.name}`} className="p-4">
            <div className="pt-2 space-y-3">
              <p className="text-[11px] text-cyan-400/55 whitespace-pre-wrap">{selected.systemPrompt}</p>

              <div className="flex gap-2">
                <input
                  value={task}
                  onChange={e => setTask(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && dispatch()}
                  placeholder="Task for this agent…"
                  className="flex-1 bg-transparent border border-cyan-400/20 rounded-sm px-3 py-2 text-sm text-cyan-100 placeholder:text-cyan-400/30 focus:outline-none focus:border-cyan-400/60"
                />
                <button
                  onClick={dispatch}
                  disabled={running || !task.trim()}
                  className="px-5 py-2 text-[11px] tracking-[0.2em] uppercase border border-cyan-400/40 rounded-sm text-cyan-200 hover:bg-cyan-400/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                >
                  {running ? 'Running…' : 'Dispatch'}
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto hud-scroll">
                {runs.length === 0 && <p className="text-xs text-cyan-400/40 py-3">No runs recorded yet.</p>}
                {runs.map(run => (
                  <div key={run.id} className="border border-cyan-400/15 rounded-sm p-3 hud-boot">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <span className="text-[11px] text-cyan-300/70 truncate">{run.input}</span>
                      <Chip tone={run.status === 'FAILED' ? 'red' : run.status === 'COMPLETE' ? 'cyan' : 'dim'}>
                        {run.status}
                      </Chip>
                    </div>
                    <p className="text-xs text-cyan-200/85 whitespace-pre-wrap leading-relaxed">
                      {run.output ?? run.error ?? '—'}
                    </p>
                    {(run.tokensIn > 0 || run.tokensOut > 0) && (
                      <div className="text-[10px] text-cyan-400/35 mt-2 tabular-nums">
                        {run.tokensIn} in · {run.tokensOut} out
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </HudPanel>
        )}
      </div>
    </div>
  );
}
