"use client";

import {
  Children,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

type Source = {
  id: number | string;
  documentId?: number;
  chunkIndex?: number;
  content: string;
  distance: number;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  failed?: boolean;
};

type DocumentRef = {
  id: number;
  name: string;
};

type ChatPageProps = {
  /** Used to show real document names on citations. */
  documents?: DocumentRef[];
};

const CHAT_ENDPOINT = "http://localhost:3001/api/chat";

const EYEBROW =
  "font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-soft";

/**
 * The server prompts the model with numbered `[Source N]` blocks, so answers
 * routinely refer back to them. These are turned into real citation chips.
 *
 * `(?<!\w)` keeps array indexing like `items[2]` from being read as a citation.
 */
const RAW_CITATION = /(?<!\w)\[\s*(?:sources?|src|doc(?:ument)?)?\s*#?\s*(\d{1,2})\s*\]/gi;

/** Marker that survives markdown parsing without being mistaken for syntax. */
const MARKER_SPLIT = /⟦(\d{1,2})⟧/;

/** Rewrites `[Source 2]` to `⟦2⟧`, but only for sources that were returned. */
function markCitations(text: string, sourceCount: number) {
  if (sourceCount === 0) return text;

  return text.replace(RAW_CITATION, (whole, digits: string) => {
    const n = Number(digits);
    return n >= 1 && n <= sourceCount ? `⟦${n}⟧` : whole;
  });
}

/** Puts markers back to plain text for code, where chips would be wrong. */
function unmarkCitations(node: ReactNode): ReactNode {
  return Children.map(node, (child) =>
    typeof child === "string"
      ? child.replace(/⟦(\d{1,2})⟧/g, "[$1]")
      : child,
  );
}

/** pgvector `<=>` returns cosine distance, so closeness is 1 - distance. */
function matchOf(distance: number) {
  if (!Number.isFinite(distance)) return 0;
  return Math.max(0, Math.min(1, 1 - distance));
}

function CitationChip({
  n,
  active,
  onSelect,
}: {
  n: number;
  active: boolean;
  onSelect: (index: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(n - 1)}
      aria-label={`Show source ${n}`}
      className={`mx-0.5 inline-flex h-[17px] min-w-[17px] -translate-y-[1px] items-center justify-center rounded-[3px] border px-1 align-middle font-mono text-[10px] font-medium leading-none transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp ${
        active
          ? "border-stamp bg-stamp text-white"
          : "border-stamp/30 bg-stamp/8 text-stamp hover:border-stamp/60 hover:bg-stamp/15"
      }`}
    >
      {n}
    </button>
  );
}

/** Swaps `⟦n⟧` markers inside text nodes for citation chips. */
function withCitations(
  node: ReactNode,
  activeIndex: number | null,
  onSelect: (index: number) => void,
): ReactNode {
  return Children.map(node, (child) => {
    if (typeof child !== "string" || !child.includes("⟦")) return child;

    return child.split(MARKER_SPLIT).map((part, i) => {
      if (i % 2 === 0) return part;

      const n = Number(part);

      return (
        <CitationChip
          key={`cite-${i}-${n}`}
          n={n}
          active={activeIndex === n - 1}
          onSelect={onSelect}
        />
      );
    });
  });
}

function buildMarkdownComponents(
  activeIndex: number | null,
  onSelect: (index: number) => void,
): Components {
  const cite = (node: ReactNode) => withCitations(node, activeIndex, onSelect);

  return {
    p: ({ children }) => <p className="mb-3 last:mb-0">{cite(children)}</p>,
    ul: ({ children }) => (
      <ul className="mb-3 list-disc space-y-1.5 pl-5 last:mb-0">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-3 list-decimal space-y-1.5 pl-5 last:mb-0">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed">{cite(children)}</li>
    ),
    h1: ({ children }) => (
      <h1 className="mb-2 mt-1 font-sans text-[13px] font-semibold uppercase tracking-wide last:mb-0">
        {cite(children)}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-2 mt-1 font-sans text-[13px] font-semibold uppercase tracking-wide last:mb-0">
        {cite(children)}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-1 mt-1 font-sans text-[13px] font-semibold last:mb-0">
        {cite(children)}
      </h3>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold">{cite(children)}</strong>
    ),
    em: ({ children }) => <em className="italic">{cite(children)}</em>,
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-stamp underline decoration-stamp/40 underline-offset-2 hover:decoration-stamp"
      >
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mb-3 border-l-2 border-rule pl-3 text-ink-soft last:mb-0">
        {cite(children)}
      </blockquote>
    ),
    hr: () => <hr className="my-3 border-rule" />,
    code: ({ className, children }) => {
      const isBlock = /language-/.test(className ?? "");

      if (isBlock) {
        return <code className={className}>{unmarkCitations(children)}</code>;
      }

      return (
        <code className="rounded-[3px] border border-rule bg-paper px-1 py-0.5 font-mono text-[0.85em]">
          {unmarkCitations(children)}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="mb-3 overflow-x-auto rounded-[3px] border border-rule bg-paper p-3 font-mono text-[11px] leading-relaxed text-ink last:mb-0">
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div className="mb-3 overflow-x-auto last:mb-0">
        <table className="w-full border-collapse text-left text-[13px]">
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border border-rule bg-paper px-2 py-1 font-sans text-[11px] font-semibold uppercase tracking-wide">
        {cite(children)}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-rule px-2 py-1">{cite(children)}</td>
    ),
  };
}

function MatchBar({ match }: { match: number }) {
  const segments = 8;
  const filled = Math.round(match * segments);

  return (
    <span className="flex items-center gap-[2px]" aria-hidden="true">
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 w-[3px] rounded-[1px] ${
            i < filled ? "bg-stamp" : "bg-rule"
          }`}
        />
      ))}
    </span>
  );
}

function SourceRow({
  index,
  source,
  documentName,
  expanded,
  highlighted,
  onToggle,
}: {
  index: number;
  source: Source;
  documentName: string;
  expanded: boolean;
  highlighted: boolean;
  onToggle: (index: number) => void;
}) {
  const match = matchOf(source.distance);

  return (
    <li
      className={`rounded-[3px] border transition-colors motion-reduce:transition-none ${
        highlighted ? "border-stamp/50 bg-stamp/5" : "border-transparent"
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(index)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2.5 px-2 py-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp"
      >
        <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-[3px] border border-stamp/30 bg-stamp/8 px-1 font-mono text-[10px] font-medium leading-none text-stamp">
          {index + 1}
        </span>

        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink">
          {documentName}
          {typeof source.chunkIndex === "number" && (
            <span className="text-ink-soft"> · chunk {source.chunkIndex}</span>
          )}
        </span>

        <MatchBar match={match} />

        <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums text-ink-soft">
          {Math.round(match * 100)}%
        </span>

        <span
          className={`shrink-0 font-mono text-[9px] text-ink-soft transition-transform motion-reduce:transition-none ${
            expanded ? "rotate-90" : ""
          }`}
          aria-hidden="true"
        >
          ▶
        </span>
      </button>

      {expanded && (
        <div className="px-2 pb-2">
          <p className={`${EYEBROW} mb-1.5`}>
            Retrieved passage · distance {source.distance.toFixed(3)}
          </p>

          <div className="max-h-40 overflow-y-auto rounded-[3px] border border-rule bg-paper p-2.5 font-serif text-[12.5px] leading-relaxed text-ink-soft">
            <p className="whitespace-pre-wrap">{source.content}</p>
          </div>
        </div>
      )}
    </li>
  );
}

function AnswerSlip({
  message,
  documents,
}: {
  message: Message;
  documents?: DocumentRef[];
}) {
  const sources = message.sources ?? [];

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggle(index: number) {
    setActiveIndex(index);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function selectFromCitation(index: number) {
    setActiveIndex(index);
    setExpanded((prev) => new Set(prev).add(index));
  }

  const markdownComponents = useMemo(
    () => buildMarkdownComponents(activeIndex, selectFromCitation),
    [activeIndex],
  );

  const marked = useMemo(
    () => markCitations(message.content, sources.length),
    [message.content, sources.length],
  );

  function nameFor(source: Source) {
    const found = documents?.find((d) => d.id === source.documentId);
    if (found) return found.name;
    return source.documentId ? `Document ${source.documentId}` : "Document";
  }

  return (
    <article className="animate-slip-in motion-reduce:animate-none">
      <header className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className={EYEBROW}>{message.failed ? "Unfilled" : "Answer"}</span>

        {sources.length > 0 && (
          <span className={EYEBROW}>
            {sources.length} {sources.length === 1 ? "source" : "sources"}
          </span>
        )}
      </header>

      <div
        className={`rounded-[3px] border bg-slip px-4 py-3.5 ${
          message.failed ? "border-ink/25 bg-paper" : "border-rule"
        }`}
      >
        {message.failed ? (
          <p className="font-sans text-[13px] leading-relaxed text-ink">
            {message.content}
          </p>
        ) : (
          <div className="font-serif text-[14.5px] leading-[1.65] text-ink">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {marked}
            </ReactMarkdown>
          </div>
        )}

        {sources.length > 0 && (
          <div className="mt-3.5 border-t border-rule pt-2.5">
            <p className={`${EYEBROW} mb-1 px-2`}>Cited from</p>

            <ul className="-mx-0.5">
              {sources.map((source, index) => (
                <SourceRow
                  key={`${source.id}-${index}`}
                  index={index}
                  source={source}
                  documentName={nameFor(source)}
                  expanded={expanded.has(index)}
                  highlighted={activeIndex === index}
                  onToggle={toggle}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}

function RequestBlock({ content }: { content: string }) {
  return (
    <article className="animate-slip-in motion-reduce:animate-none">
      <p className={`${EYEBROW} mb-1.5`}>Asked</p>

      <p className="border-l-2 border-ink pl-3 font-sans text-[14.5px] font-medium leading-relaxed text-ink">
        <span className="whitespace-pre-wrap">{content}</span>
      </p>
    </article>
  );
}

function ConsultingSlip() {
  return (
    <article className="animate-slip-in motion-reduce:animate-none">
      <p className={`${EYEBROW} mb-1.5`}>Consulting</p>

      <div className="rounded-[3px] border border-rule bg-slip px-4 py-3.5">
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-rule">
          <div className="h-full w-1/3 animate-[slip-scan_1.1s_ease-in-out_infinite] rounded-full bg-stamp motion-reduce:w-full motion-reduce:animate-none" />
        </div>

        <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          Searching the indexed passages
        </p>
      </div>
    </article>
  );
}

function EmptyDesk() {
  return (
    <div className="m-auto max-w-sm px-6 text-center">
      <p className={`${EYEBROW} mb-3`}>No requests yet</p>

      <h3 className="font-serif text-xl leading-snug text-ink">
        Ask about your documents
      </h3>

      <p className="mt-2 font-sans text-[13px] leading-relaxed text-ink-soft">
        Every answer cites the passages it came from, so you can check it
        against the source.
      </p>
    </div>
  );
}

export default function ChatPage({ documents }: ChatPageProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep the newest slip in view as the conversation grows.
  useEffect(() => {
    const log = logRef.current;
    if (!log) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    log.scrollTo({
      top: log.scrollHeight,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [messages, loading]);

  async function ask(trimmedQuestion: string) {
    setLoading(true);

    try {
      const response = await fetch(CHAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ?? `The desk returned status ${response.status}.`,
        );
      }

      if (typeof data?.answer !== "string") {
        throw new Error("The desk returned a response that couldn't be read.");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer,
          sources: Array.isArray(data.sources) ? data.sources : [],
        },
      ]);
    } catch (error) {
      console.error(error);

      const reason =
        error instanceof TypeError
          ? "Couldn't reach the desk. Check that the server on port 3001 is running, then ask again."
          : error instanceof Error
            ? error.message
            : "Something went wrong while answering.";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reason, failed: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmedQuestion },
    ]);
    setQuestion("");

    if (inputRef.current) inputRef.current.style.height = "auto";

    await ask(trimmedQuestion);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  // Re-send the most recent question after a failure.
  const lastQuestion = [...messages]
    .reverse()
    .find((m) => m.role === "user")?.content;

  const canRetry =
    !loading && !!lastQuestion && messages.at(-1)?.failed === true;

  const documentCount = documents?.length ?? 0;

  return (
    <section className="mx-auto my-8 flex h-[min(72vh,640px)] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-rule bg-paper text-ink shadow-[0_14px_32px_-24px_rgba(26,29,35,0.4)]">
      <header className="flex items-center justify-between gap-4 border-b border-rule px-4 py-3 sm:px-5">
        <div>
          <p className={EYEBROW}>Reference desk</p>

          <h2 className="font-serif text-[15px] leading-tight text-ink">
            Ask your documents
          </h2>
        </div>

        {documentCount > 0 && (
          <p className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">
            {documentCount} {documentCount === 1 ? "document" : "documents"}{" "}
            indexed
          </p>
        )}
      </header>

      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label="Questions and answers"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5 sm:px-6"
      >
        {messages.length === 0 && !loading ? (
          <EmptyDesk />
        ) : (
          <div className="space-y-5">
            {messages.map((message, index) =>
              message.role === "user" ? (
                <RequestBlock key={index} content={message.content} />
              ) : (
                <AnswerSlip
                  key={index}
                  message={message}
                  documents={documents}
                />
              ),
            )}

            {loading && <ConsultingSlip />}

            {canRetry && (
              <button
                type="button"
                onClick={() => ask(lastQuestion)}
                className="rounded-[3px] border border-ink px-3 py-1.5 font-sans text-[12px] font-medium text-ink transition-colors hover:bg-ink hover:text-white motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp"
              >
                Ask again
              </button>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 border-t border-rule bg-slip px-3 py-3 sm:px-4"
      >
        <label htmlFor="desk-question" className="sr-only">
          Ask about your documents
        </label>

        <textarea
          id="desk-question"
          ref={inputRef}
          rows={1}
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
          }}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Ask about your documents…"
          className="max-h-[120px] min-h-[38px] flex-1 resize-none rounded-[3px] border border-rule bg-paper px-3 py-2 font-sans text-[14px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-soft/70 focus:border-stamp focus:bg-slip motion-reduce:transition-none disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="flex h-[38px] shrink-0 items-center gap-2 rounded-[3px] bg-ink px-4 font-sans text-[13px] font-medium text-white transition-colors hover:bg-stamp motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stamp disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Asking…" : "Ask"}
          {!loading && (
            <span className="font-mono text-[11px] opacity-60" aria-hidden="true">
              ⏎
            </span>
          )}
        </button>
      </form>
    </section>
  );
}
