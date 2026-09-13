import { useState } from 'react';
import { useSendMessage } from '../hooks/useSendMessage';
import { useThreadStream } from '../hooks/useThreadStream';
import { AgentEvent } from '../types';

function isAwaitingInput(event: AgentEvent): event is Extract<AgentEvent, { type: 'AWAITING_USER_INPUT' }> {
  return event.type === 'AWAITING_USER_INPUT';
}

function EventCard({ event, index }: { event: AgentEvent; index: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        #{index + 1} {String(event.type)}
      </div>
      <pre className="whitespace-pre-wrap text-sm text-slate-800">
        {JSON.stringify(event, null, 2)}
      </pre>
    </div>
  );
}

export function ThreadDebugger() {
  const [threadId, setThreadId] = useState('');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const { data: events } = useThreadStream(activeThreadId);
  const sendMessage = useSendMessage();

  const waitingForInput = events?.length ? isAwaitingInput(events[events.length - 1]) : false;

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (threadId.trim()) {
      setActiveThreadId(threadId.trim());
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeThreadId || !draft.trim()) return;
    await sendMessage.mutateAsync({ threadId: activeThreadId, answer: draft.trim() });
    setDraft('');
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white p-4">
        <h1 className="text-lg font-semibold text-slate-900">AI Harness Debug UI</h1>
      </header>

      <form onSubmit={handleConnect} className="flex gap-2 border-b border-slate-200 bg-white p-4">
        <input
          type="text"
          value={threadId}
          onChange={(e) => setThreadId(e.target.value)}
          placeholder="Thread ID"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Connect
        </button>
      </form>

      <div className="flex-1 overflow-y-auto p-4">
        {!activeThreadId ? (
          <p className="text-center text-slate-500">Enter a thread ID to connect.</p>
        ) : events?.length === 0 ? (
          <p className="text-center text-slate-500">Connected. Waiting for events...</p>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {events?.map((event, index) => (
              <EventCard key={index} event={event} index={index} />
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="flex flex-col gap-2 border-t border-slate-200 bg-white p-4">
        {sendMessage.error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {String(sendMessage.error)}
          </div>
        )}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={waitingForInput ? 'Your answer...' : 'Send a message...'}
          disabled={!activeThreadId || sendMessage.isPending}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
        />
        <button
          type="submit"
          disabled={!activeThreadId || !draft.trim() || sendMessage.isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-400"
        >
          Send
        </button>
      </form>
    </div>
  );
}
