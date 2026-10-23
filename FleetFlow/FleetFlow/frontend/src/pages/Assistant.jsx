import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Send, User, Radar } from 'lucide-react';
import api from '../services/api';

// Suggested questions per the Command Advisor / Copilot spec — answered from
// real FleetFlow data (vessels, voyages, maintenance, fuel, alerts), not
// general knowledge.
const SUGGESTIONS = [
  'Which vessels are at highest risk?',
  'Which vessel needs maintenance first?',
  'Which voyages are likely to be delayed?',
  'Why did fuel consumption increase?',
  'Which voyages are most profitable?',
  'How is fleet utilization performing?',
];

export default function Assistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "I'm FleetFlow Copilot. Ask me about your fleet — maintenance, fuel, delays, risk, or profitability. I answer from live FleetFlow data, not general knowledge.", time: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(question) {
    const q = question || input;
    if (!q.trim() || sending) return;
    setMessages((m) => [...m, { role: 'user', text: q, time: new Date() }]);
    setInput('');
    setSending(true);
    try {
      const res = await api.post('/assistant/ask', { question: q });
      setMode(res.data.data.mode);
      setMessages((m) => [...m, { role: 'assistant', text: res.data.data.answer, time: new Date() }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: 'Unable to reach the assistant. Try again.', time: new Date() }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 rounded-lg bg-signal-500/10 text-signal-500">
          <Sparkles className="w-4 h-4" />
        </div>
        <h1 className="text-xl font-semibold font-display">FleetFlow Copilot</h1>
        {mode && (
          <span className="text-xs text-navy-400 dark:text-slate-500 ml-auto">
            {mode === 'ai' ? 'AI-powered' : 'Rule-based (no AI API configured)'}
          </span>
        )}
      </div>
      <p className="text-xs text-navy-500 dark:text-slate-400 mb-3 flex items-center gap-1">
        For a fleet-wide summary and prioritized actions, see the{' '}
        <Link to="/command-center" className="text-sea-500 hover:underline inline-flex items-center gap-0.5">
          Command Center <Radar className="w-3 h-3" />
        </Link>
      </p>

      <div className="flex-1 overflow-y-auto space-y-3 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-xl p-4 shadow-panel">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-signal-500/15 text-signal-500 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            )}
            <div className={`max-w-[80%] ${m.role === 'user' ? 'order-first' : ''}`}>
              <div className={`rounded-xl px-3.5 py-2 text-sm whitespace-pre-line ${m.role === 'user' ? 'bg-navy-900 dark:bg-sea-500 text-white' : 'bg-slate-100 dark:bg-navy-800 text-navy-800 dark:text-slate-100'}`}>
                {m.text}
              </div>
              <p className={`text-[10px] text-navy-400 dark:text-slate-500 mt-0.5 ${m.role === 'user' ? 'text-right' : ''}`}>
                {m.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {m.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-navy-900 dark:bg-sea-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-signal-500/15 text-signal-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs text-navy-400 dark:text-slate-500">Thinking…</p>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-full border border-slate-300 dark:border-navy-700 text-navy-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-navy-800">
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your fleet…"
          className="flex-1 rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sea-500"
        />
        <button type="submit" disabled={sending} className="p-2.5 rounded-lg bg-navy-900 dark:bg-sea-500 text-white disabled:opacity-60">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
