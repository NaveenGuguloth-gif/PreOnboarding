import { useEffect, useRef, useState } from "react";
import { assistantApi } from "../../services/api";
import { Badge, Button } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

const starterPrompts = [
  "Which documents should I carry on joining day?",
  "What safety training is required before plant reporting?",
  "How do I prepare for relocation reimbursement?",
];

export default function Assistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi. I answer from onboarding and HR policy material only. Ask about documents, joining, learning, relocation, or approved policy guidance.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendText = async (text) => {
    const cleanText = text.trim();
    if (!cleanText || loading) return;

    setInput("");
    setMessages((current) => [...current, { role: "user", content: cleanText }]);
    setLoading(true);

    try {
      const candidateId = user?.id || user?.employeeId || user?.employee_id || "demo";
      const res = await assistantApi.chat({ message: cleanText, candidate_id: candidateId });
      const reply = res.data?.reply ?? res.data?.content ?? "I could not find a supported policy answer for that.";
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: reply,
          sources: res.data?.sources ?? [],
          grounded: res.data?.grounded,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "I could not reach the policy assistant right now. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const send = (event) => {
    event.preventDefault();
    sendText(input);
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-gray-900 to-gray-900 p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #8B5CF6, transparent 70%)" }}
        />
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/10 text-xl">AI</span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-violet-400">Policy AI Assistant</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">Policy-only answers</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-400">
          Ask questions from HR-approved policy PDFs only, scoped to onboarding, documents, travel, learning,
          relocation, and workplace guidance.
        </p>
      </div>

      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Badge color="blue">Grounded RAG</Badge>
            <h3 className="mt-4 text-xl font-semibold tracking-tight text-white">Candidate chat</h3>
          </div>
          <Badge color="gray">Scoped answers only</Badge>
        </div>

        <PolicyAssistant
          input={input}
          loading={loading}
          messages={messages}
          onPrompt={sendText}
          onSubmit={send}
          setInput={setInput}
          bottomRef={bottomRef}
        />
      </section>
    </div>
  );
}

function PolicyAssistant({ bottomRef, input, loading, messages, onPrompt, onSubmit, setInput }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-950/60">
      <div className="border-b border-gray-800 p-4">
        <div className="flex flex-wrap gap-2">
          {starterPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onPrompt(prompt)}
              disabled={loading}
              className="rounded-lg border border-violet-800/60 bg-violet-500/10 px-3 py-2 text-left text-xs font-medium text-violet-200 transition hover:border-violet-600 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[min(58vh,34rem)] overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <ChatBubble key={`${message.role}-${index}`} message={message} />
          ))}

          {loading ? (
            <div className="flex justify-start">
              <div className="rounded-xl rounded-bl-sm border border-violet-900/50 bg-gray-900 px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex gap-3 border-t border-gray-800 p-4">
        <input
          type="text"
          className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-indigo-500"
          placeholder="Ask a policy question..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={loading}
        />
        <Button type="submit" loading={loading} disabled={!input.trim()} className="px-5">
          Send
        </Button>
      </form>
    </div>
  );
}

function ChatBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-6 ${
          isUser
            ? "rounded-br-sm bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
            : "rounded-bl-sm border border-gray-800 bg-gray-900 text-gray-200"
        }`}
      >
        {message.content}
        {!isUser && message.sources?.length > 0 ? (
          <div className="mt-3 space-y-2 border-t border-gray-800 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Grounded sources</p>
            <div className="grid gap-2">
              {message.sources.map((source) => (
                <div key={source.id} className="rounded-lg border border-gray-800 bg-gray-950/60 p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[11px] font-bold text-indigo-300">
                      {source.id}
                    </span>
                    <span className="text-xs font-semibold text-white">{source.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{source.kind}</p>
                  {source.preview ? <p className="mt-1 line-clamp-2 text-xs text-gray-500">{source.preview}</p> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
