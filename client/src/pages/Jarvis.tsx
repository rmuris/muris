import { useCallback, useEffect, useRef, useState } from 'react';
import { assistant, dashboard } from '../api';
import ArcReactor, { type ReactorState } from '../components/jarvis/ArcReactor';
import { Gauge, HudPanel, Readout, Waveform } from '../components/jarvis/HudBits';
import { useVoice } from '../hooks/useVoice';
import type { AssistantStatus, DashboardStats, RuntimeEvent, ToolCall } from '../types';

interface Turn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  tools: ToolCall[];
  streaming?: boolean;
  error?: boolean;
}

const SUGGESTIONS = [
  'Give me the operational picture.',
  'Which orders are still waiting on a driver?',
  'Build me an agent that watches for unassigned orders.',
  'Who is available to dispatch right now?',
];

function clock() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

/** Tool activity chip in the log. */
function ToolChip({ call }: { call: ToolCall }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[10px] tracking-wider uppercase ${
        call.ok
          ? 'border-cyan-400/30 text-cyan-300/80 bg-cyan-400/5'
          : 'border-rose-400/40 text-rose-300/90 bg-rose-400/5'
      }`}
      title={JSON.stringify(call.input)}
    >
      <span className={call.ok ? 'text-cyan-400' : 'text-rose-400'}>{call.ok ? '▸' : '✕'}</span>
      {call.name.replace(/_/g, ' ')}
    </span>
  );
}

export default function Jarvis() {
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [allowWrites, setAllowWrites] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [activity, setActivity] = useState<string>('');
  const [time, setTime] = useState(clock());

  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const voice = useVoice();

  useEffect(() => {
    assistant.status().then(setStatus).catch(() => setStatus(null));
    const load = () => dashboard.get().then(d => setStats(d.stats)).catch(() => {});
    load();
    // The HUD is a live instrument; refresh telemetry while it's open.
    const telemetry = setInterval(load, 20000);
    const tick = setInterval(() => setTime(clock()), 1000);
    return () => {
      clearInterval(telemetry);
      clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  const send = useCallback(
    async (message: string) => {
      const text = message.trim();
      if (!text || busy) return;

      voice.shush();
      setInput('');
      setBusy(true);
      setActivity('Transmitting');

      const userTurn: Turn = { id: `u${Date.now()}`, role: 'user', text, tools: [] };
      const replyId = `a${Date.now()}`;
      setTurns(prev => [...prev, userTurn, { id: replyId, role: 'assistant', text: '', tools: [], streaming: true }]);

      const patch = (fn: (turn: Turn) => Turn) =>
        setTurns(prev => prev.map(t => (t.id === replyId ? fn(t) : t)));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await assistant.chat(
          { message: text, sessionId, allowWrites },
          (event: RuntimeEvent) => {
            switch (event.type) {
              case 'session':
                setSessionId(event.id);
                break;
              case 'text':
                setActivity('Responding');
                patch(t => ({ ...t, text: t.text + event.text }));
                break;
              case 'tool':
                setActivity(`Running ${event.name.replace(/_/g, ' ')}`);
                break;
              case 'tool_result':
                patch(t => ({
                  ...t,
                  tools: [...t.tools, { name: event.name, input: null, ok: event.ok }],
                }));
                break;
              case 'done':
                patch(t => ({ ...t, text: event.text || t.text, streaming: false }));
                if (event.text) voice.speak(event.text);
                break;
              case 'error':
                patch(t => ({ ...t, text: event.message, streaming: false, error: true }));
                break;
            }
          },
          controller.signal,
        );
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'Link to the assistant failed.';
        patch(t => ({ ...t, text: detail, streaming: false, error: true }));
      } finally {
        patch(t => ({ ...t, streaming: false }));
        setBusy(false);
        setActivity('');
        abortRef.current = null;
      }
    },
    [allowWrites, busy, sessionId, voice],
  );

  // Cancel any in-flight turn if the operator navigates away.
  useEffect(() => () => abortRef.current?.abort(), []);

  const lastTurn = turns[turns.length - 1];
  const reactorState: ReactorState = voice.listening
    ? 'listening'
    : busy
      ? 'thinking'
      : voice.speaking
        ? 'speaking'
        : lastTurn?.error
          ? 'fault'
          : status && !status.online
            ? 'degraded'
            : 'idle';

  const fleetTotal = (stats?.availableVehicles ?? 0) + (stats?.activeShipments ?? 0);

  return (
    <div className="hud relative min-h-full overflow-hidden">
      <div className="absolute inset-0 hud-grid pointer-events-none" />
      <div className="absolute inset-0 hud-vignette pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-cyan-400/40 hud-scanline pointer-events-none" />

      <div className="relative p-6 flex flex-col gap-4" style={{ minHeight: '100vh' }}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between hud-boot">
          <div>
            <h1 className="text-2xl font-semibold tracking-[0.35em] hud-glow">J.A.R.V.I.S.</h1>
            <p className="text-[10px] tracking-[0.28em] uppercase text-cyan-400/50 mt-1">
              Just A Rather Very Intelligent System · Muris Operations
            </p>
          </div>
          <div className="text-right text-[11px] leading-relaxed">
            <div className="tabular-nums text-cyan-200 hud-glow text-lg">{time}</div>
            <div className="flex items-center justify-end gap-2 text-cyan-400/60">
              <span
                className={`w-1.5 h-1.5 rounded-full ${status?.online ? 'bg-cyan-400 hud-blink' : 'bg-rose-500'}`}
              />
              {status?.online ? status.model : 'offline core'}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-[220px_1fr_240px] gap-4 flex-1 min-h-0">
          {/* ── Left: telemetry ──────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <HudPanel label="Fleet telemetry" className="p-3">
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Gauge label="In motion" value={stats?.activeShipments ?? 0} max={Math.max(fleetTotal, 1)} />
                <Gauge label="Trucks free" value={stats?.availableVehicles ?? 0} max={Math.max(fleetTotal, 1)} />
                <Gauge
                  label="Unassigned"
                  value={stats?.pendingOrders ?? 0}
                  max={Math.max(stats?.totalOrders ?? 1, 1)}
                  accent="amber"
                />
                <Gauge label="Drivers free" value={stats?.availableDrivers ?? 0} max={Math.max(fleetTotal, 1)} />
              </div>
            </HudPanel>

            <HudPanel label="Systems" className="p-3">
              <div className="pt-2">
                <Readout label="Reasoning" value={status?.online ? 'ONLINE' : 'OFFLINE'} accent={status?.online ? undefined : 'red'} />
                <Readout label="Tools" value={String(status?.tools.length ?? 0)} />
                <Readout
                  label="Authority"
                  value={allowWrites ? 'COMMAND' : 'READ ONLY'}
                  accent={allowWrites ? 'amber' : undefined}
                />
                <Readout label="Voice in" value={voice.recognitionSupported ? 'READY' : 'N/A'} />
                <Readout label="Voice out" value={voice.voiceOut ? 'ON' : 'MUTED'} />
                <Readout label="Delivered today" value={String(stats?.deliveredToday ?? 0)} />
              </div>
            </HudPanel>
          </div>

          {/* ── Centre: reactor + conversation ───────────────────────── */}
          <div className="flex flex-col gap-4 min-h-0">
            <div className="flex flex-col items-center justify-center py-2">
              <ArcReactor state={reactorState} size={200} />
              <div className="mt-2 h-5 text-[11px] tracking-[0.3em] uppercase text-cyan-300/70">
                {voice.listening
                  ? 'Listening'
                  : activity || (busy ? 'Working' : voice.speaking ? 'Speaking' : 'Standing by')}
              </div>
              <Waveform active={voice.listening || voice.speaking} />
            </div>

            <HudPanel label="Transcript" className="flex-1 min-h-0 flex flex-col">
              <div ref={logRef} className="hud-scroll flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-[220px]">
                {turns.length === 0 && (
                  <div className="text-cyan-400/45 text-xs space-y-3 pt-4">
                    <p className="tracking-wide">
                      Systems nominal, Operator. Ask me about the operation, or have me build you an agent.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {SUGGESTIONS.map(s => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="px-2.5 py-1 border border-cyan-400/20 rounded-sm hover:border-cyan-400/60 hover:text-cyan-200 transition-colors text-left"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {turns.map(turn => (
                  <div key={turn.id} className="hud-boot">
                    <div className="text-[10px] tracking-[0.25em] uppercase mb-1 text-cyan-400/40">
                      {turn.role === 'user' ? 'Operator' : 'Jarvis'}
                    </div>
                    <div
                      className={`text-sm leading-relaxed whitespace-pre-wrap ${
                        turn.error
                          ? 'text-rose-300'
                          : turn.role === 'user'
                            ? 'text-cyan-100/85'
                            : 'text-cyan-200 hud-glow'
                      }`}
                    >
                      {turn.text}
                      {turn.streaming && <span className="hud-blink">▋</span>}
                    </div>
                    {turn.tools.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {turn.tools.map((call, i) => (
                          <ToolChip key={`${call.name}-${i}`} call={call} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* ── Input ──────────────────────────────────────────── */}
              <div className="border-t border-cyan-400/15 p-3 flex items-center gap-2">
                <button
                  onClick={() =>
                    voice.listening ? voice.stopListening() : voice.startListening(text => send(text))
                  }
                  disabled={!voice.recognitionSupported}
                  title={voice.recognitionSupported ? 'Hold a conversation' : 'Voice input needs a Chromium browser'}
                  className={`shrink-0 w-10 h-10 rounded-full border flex items-center justify-center transition-colors disabled:opacity-25 disabled:cursor-not-allowed ${
                    voice.listening
                      ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100 hud-pulse-fast'
                      : 'border-cyan-400/35 text-cyan-300/80 hover:border-cyan-300 hover:text-cyan-100'
                  }`}
                >
                  ⏺
                </button>

                <input
                  value={voice.listening ? voice.transcript : input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  readOnly={voice.listening}
                  placeholder={voice.listening ? 'Listening…' : 'Speak or type a command…'}
                  className="flex-1 bg-transparent border border-cyan-400/20 rounded-sm px-3 py-2 text-sm text-cyan-100 placeholder:text-cyan-400/30 focus:outline-none focus:border-cyan-400/60"
                />

                <button
                  onClick={() => send(input)}
                  disabled={busy || !input.trim()}
                  className="shrink-0 px-4 py-2 text-xs tracking-[0.2em] uppercase border border-cyan-400/35 rounded-sm text-cyan-200 hover:bg-cyan-400/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                >
                  {busy ? '···' : 'Send'}
                </button>
              </div>
            </HudPanel>
          </div>

          {/* ── Right: controls ──────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <HudPanel label="Command authority" className="p-3">
              <p className="text-[11px] leading-relaxed text-cyan-400/55 pt-2">
                Read-only by default. Enable to let JARVIS book orders, dispatch drivers and advance shipments.
              </p>
              <button
                onClick={() => setAllowWrites(v => !v)}
                className={`mt-3 w-full py-2 text-[11px] tracking-[0.22em] uppercase border rounded-sm transition-colors ${
                  allowWrites
                    ? 'border-amber-400/70 text-amber-300 bg-amber-400/10 hud-glow-amber'
                    : 'border-cyan-400/30 text-cyan-300/70 hover:border-cyan-400/60'
                }`}
              >
                {allowWrites ? '● Command enabled' : '○ Read only'}
              </button>
            </HudPanel>

            <HudPanel label="Voice" className="p-3">
              <button
                onClick={() => {
                  voice.setVoiceOut(!voice.voiceOut);
                  voice.shush();
                }}
                disabled={!voice.synthesisSupported}
                className="mt-2 w-full py-2 text-[11px] tracking-[0.22em] uppercase border border-cyan-400/30 rounded-sm text-cyan-300/70 hover:border-cyan-400/60 disabled:opacity-30 transition-colors"
              >
                {voice.voiceOut ? '🔊 Speech on' : '🔇 Speech off'}
              </button>
              {voice.speaking && (
                <button
                  onClick={voice.shush}
                  className="mt-2 w-full py-1.5 text-[10px] tracking-[0.2em] uppercase border border-rose-400/40 rounded-sm text-rose-300/80 hover:bg-rose-400/10"
                >
                  Stop speaking
                </button>
              )}
            </HudPanel>

            <HudPanel label="Session" className="p-3">
              <div className="pt-2">
                <Readout label="Turns" value={String(turns.length)} />
                <Readout label="Thread" value={sessionId ? sessionId.slice(-6).toUpperCase() : 'NEW'} />
              </div>
              <button
                onClick={() => {
                  abortRef.current?.abort();
                  voice.shush();
                  setTurns([]);
                  setSessionId(undefined);
                }}
                className="mt-3 w-full py-2 text-[11px] tracking-[0.22em] uppercase border border-cyan-400/30 rounded-sm text-cyan-300/70 hover:border-cyan-400/60 transition-colors"
              >
                New session
              </button>
            </HudPanel>

            {status && !status.online && (
              <HudPanel label="Notice" className="p-3">
                <p className="text-[11px] leading-relaxed text-amber-300/80 pt-2">
                  Running the offline core. It reads live TMS data but cannot reason, dispatch, or build agents. Set{' '}
                  <code className="text-amber-200">ANTHROPIC_API_KEY</code> in <code>server/.env</code> and restart.
                </p>
              </HudPanel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
