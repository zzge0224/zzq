import { useEffect, useRef, useState } from "react";
import { BookOpen, MoreHorizontal, Plus, RefreshCw, Send } from "lucide-react";
import { MODE_HINT, MODE_LABEL, formatStamp, shouldShowStamp } from "@/lib/cards";
import { cn } from "@/lib/cn";
import { useZijian } from "@/lib/store";
import { LibrarySheet } from "@/components/library-sheet";

const PROMPTS = ["在吗", "今天有点累", "窗外下雨了", "为什么香蕉是浆果"];

export function ChatApp() {
  const companionName = useZijian((state) => state.companionName);
  const mode = useZijian((state) => state.mode);
  const cards = useZijian((state) => state.cards);
  const messages = useZijian((state) => state.messages);
  const cycleMode = useZijian((state) => state.cycleMode);
  const setCompanionName = useZijian((state) => state.setCompanionName);
  const sendUser = useZijian((state) => state.sendUser);
  const appendReply = useZijian((state) => state.appendReply);
  const rerollLast = useZijian((state) => state.rerollLast);
  const clearChat = useZijian((state) => state.clearChat);
  const restoreSamples = useZijian((state) => state.restoreSamples);

  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(0);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [focusAdd, setFocusAdd] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [live, setLive] = useState("");
  const mountedAt = useRef(Date.now());
  const bottomRef = useRef<HTMLDivElement>(null);
  const queue = useRef(Promise.resolve());
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void useZijian.persist.rehydrate();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const enabled = cards.filter((card) => card.enabled && card.text.trim()).length;
  const lastIsReply = messages.length > 0 && messages[messages.length - 1]?.role !== "user";

  function notify(text: string) {
    setToast(text);
  }

  function send(raw?: string) {
    const text = (raw ?? draft).trim();
    if (!text) return;
    sendUser(text);
    setDraft("");
    if (fieldRef.current) fieldRef.current.style.height = "auto";
    setTyping((count) => count + 1);
    const delay = 640 + Math.floor(Math.random() * 480);
    queue.current = queue.current.then(
      () =>
        new Promise<void>((resolve) => {
          window.setTimeout(() => {
            appendReply(text);
            const latest = useZijian.getState().messages.at(-1);
            if (latest?.role === "companion") setLive(`${companionName}抽到：${latest.text}`);
            else if (latest?.role === "notice") setLive(latest.text);
            setTyping((count) => Math.max(0, count - 1));
            resolve();
          }, delay);
        }),
    );
  }

  function openLibrary(add: boolean) {
    setFocusAdd(add);
    setLibraryOpen(true);
    setMenuOpen(false);
  }

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-xl flex-col overflow-hidden border-line bg-canvas md:border-x">
      <header className="pt-safe relative z-20 flex items-center gap-3 border-b border-line bg-chrome px-3 py-2">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-full bg-self font-serif text-lg text-self-ink"
          aria-hidden
        >
          {companionName.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-medium">{companionName}</h1>
          <button
            type="button"
            onClick={() => {
              cycleMode();
              const next = useZijian.getState().mode;
              notify(`${MODE_LABEL[next]} · ${MODE_HINT[next]}`);
            }}
            className="truncate text-left text-sm text-muted"
          >
            {MODE_LABEL[mode]} · {enabled} 张可抽
          </button>
        </div>
        <button
          type="button"
          aria-label="打开字卡库"
          onClick={() => openLibrary(false)}
          className="grid size-11 place-items-center rounded-full text-ink transition-transform duration-150 ease-out active:scale-[0.96]"
        >
          <BookOpen className="size-5" />
        </button>
        <button
          type="button"
          aria-label="更多"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="grid size-11 place-items-center rounded-full text-ink transition-transform duration-150 ease-out active:scale-[0.96]"
        >
          <MoreHorizontal className="size-5" />
        </button>
        {menuOpen ? (
          <>
            <button
              type="button"
              aria-label="关闭菜单"
              className="fixed inset-0 z-30 cursor-default"
              onClick={() => setMenuOpen(false)}
            />
            <SettingsMenu
              name={companionName}
              onName={setCompanionName}
              onClear={() => {
                clearChat();
                setMenuOpen(false);
                notify("对话已清空");
              }}
              onRestore={() => {
                restoreSamples();
                setMenuOpen(false);
                notify("示例字卡已补回");
              }}
            />
          </>
        ) : null}
      </header>

      <div className="chat-wall flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3 py-4">
        {messages.length === 0 && typing === 0 ? (
          <div className="flex flex-1 flex-col justify-center">
            <EmptyState name={companionName} onPick={send} />
          </div>
        ) : null}
        <ol className="flex flex-col gap-3">
          {messages.map((message, index) => (
            <li key={message.id} className="contents">
              {shouldShowStamp(messages, index) ? (
                <p className="mx-auto rounded-full bg-chrome px-2.5 py-1 text-xs text-muted tabular-nums">
                  {formatStamp(message.at)}
                </p>
              ) : null}
              {message.role === "notice" ? (
                <p className="mx-auto max-w-72 rounded-full bg-chrome px-3 py-2 text-center text-sm text-muted">
                  {message.text}
                </p>
              ) : null}
              {message.role === "user" ? (
                <div className={cn("flex items-end justify-end gap-2", message.at >= mountedAt.current && "slip-in")}>
                  <div className="max-w-72 rounded-2xl rounded-br-sm bg-self px-3 py-2 text-self-ink">
                    <p className="text-pretty text-base leading-relaxed wrap-break-word whitespace-pre-wrap">
                      {message.text}
                    </p>
                  </div>
                  <Avatar label="我" />
                </div>
              ) : null}
              {message.role === "companion" ? (
                <div className={cn("flex items-end gap-2", message.at >= mountedAt.current && "slip-in")}>
                  <Avatar label={companionName.slice(0, 1)} tone="self" />
                  <article className="slip max-w-72 rounded-2xl rounded-bl-sm px-3.5 py-3">
                    <header className="flex items-start justify-between gap-3">
                      <p className="text-xs tracking-widest text-paper-muted">{message.deckName}</p>
                      <span className="seal grid size-8 shrink-0 place-items-center rounded-full border border-stamp font-serif text-sm text-stamp">
                        {(message.deckName ?? "笺").slice(0, 1)}
                      </span>
                    </header>
                    <p className="mt-1 font-serif text-lg leading-relaxed text-balance wrap-break-word whitespace-pre-wrap">
                      {message.text}
                    </p>
                    {message.note ? (
                      <p className="mt-2 text-xs text-paper-muted">{message.note}</p>
                    ) : null}
                    <footer className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-xs text-paper-muted tabular-nums">
                        {message.drawNo ? `第 ${message.drawNo} 抽` : "字卡"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard?.writeText(message.text).then(
                            () => notify("已复制这张字卡"),
                            () => notify("没能复制"),
                          );
                        }}
                        className="text-xs text-paper-muted"
                      >
                        复制
                      </button>
                    </footer>
                  </article>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
        {typing > 0 ? (
          <div className="mt-3 flex items-end gap-2" aria-hidden>
            <Avatar label={companionName.slice(0, 1)} tone="self" />
            <div className="flex h-10 items-center gap-1 rounded-2xl rounded-bl-sm bg-paper px-4">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        ) : null}
        {lastIsReply && messages.some((message) => message.role === "user") ? (
          <div className="mt-3 flex pl-12">
            <button
              type="button"
              disabled={typing > 0 || enabled === 0}
              onClick={() => {
                rerollLast();
                const latest = useZijian.getState().messages.at(-1);
                if (latest?.role === "companion") {
                  setLive(`${companionName}换了一张：${latest.text}`);
                  notify("换了一张");
                }
              }}
              className="inline-flex h-9 items-center gap-1 rounded-full bg-chrome px-3 text-sm text-muted disabled:opacity-40"
            >
              <RefreshCw className="size-3.5" />
              换一张
            </button>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form
        className="pb-safe flex items-end gap-2 border-t border-line bg-chrome px-3 pt-2"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <button
          type="button"
          aria-label="写一张新字卡"
          onClick={() => openLibrary(true)}
          className="grid size-11 shrink-0 place-items-center rounded-full text-ink transition-transform duration-150 ease-out active:scale-[0.96]"
        >
          <Plus className="size-5" />
        </button>
        <label className="sr-only" htmlFor="composer">
          输入想说的话
        </label>
        <textarea
          id="composer"
          ref={fieldRef}
          rows={1}
          value={draft}
          placeholder="说一句，字笺抽一张卡回你"
          enterKeyHint="send"
          className="max-h-32 min-h-11 flex-1 resize-none overflow-y-auto rounded-2xl bg-canvas px-3 py-2.5 text-base leading-relaxed text-ink outline-none placeholder:text-muted"
          onChange={(event) => {
            setDraft(event.target.value);
            const field = event.target;
            field.style.height = "auto";
            field.style.height = `${field.scrollHeight}px`;
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send();
            }
          }}
        />
        <button
          type="submit"
          aria-label="发送"
          disabled={!draft.trim()}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-self text-self-ink transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-40"
        >
          <Send className="size-5" />
        </button>
      </form>

      <p className="sr-only" aria-live="polite">
        {live}
      </p>
      {toast ? (
        <p className="pointer-events-none fixed bottom-24 left-1/2 z-50 max-w-xs -translate-x-1/2 rounded-full bg-paper px-3 py-2 text-center text-sm text-paper-ink">
          {toast}
        </p>
      ) : null}
      <LibrarySheet
        open={libraryOpen}
        focusAdd={focusAdd}
        onClose={() => setLibraryOpen(false)}
      />
    </div>
  );
}

function Avatar({ label, tone = "muted" }: { label: string; tone?: "self" | "muted" }) {
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full text-sm",
        tone === "self" ? "bg-self font-serif text-self-ink" : "bg-line text-ink",
      )}
      aria-hidden
    >
      {label}
    </span>
  );
}

function EmptyState({ name, onPick }: { name: string; onPick: (text: string) => void }) {
  return (
    <div className="flex w-full flex-col items-center px-4 text-center">
      <span className="seal grid size-16 place-items-center rounded-full border-2 border-stamp font-serif text-2xl text-stamp">
        {name.slice(0, 1)}
      </span>
      <h2 className="mt-4 font-serif text-2xl text-balance">{name}不会自己编话</h2>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-pretty text-muted">
        你说一句，它只从你的字卡库里抽一张回来。库里已经放了闲话、短句、回嘴、打气和冷门。
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPick(prompt)}
            className="rounded-full border border-line bg-chrome px-3 py-2 text-sm text-ink transition-transform duration-150 ease-out active:scale-[0.96]"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsMenu({
  name,
  onName,
  onClear,
  onRestore,
}: {
  name: string;
  onName: (name: string) => void;
  onClear: () => void;
  onRestore: () => void;
}) {
  const [value, setValue] = useState(name);
  return (
    <div className="panel absolute top-16 right-3 z-40 w-64 rounded-2xl border border-line bg-chrome p-3">
      <label className="block text-xs text-muted" htmlFor="companion-name">
        对方怎么称呼
      </label>
      <input
        id="companion-name"
        value={value}
        maxLength={12}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => onName(value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onName(value);
          }
        }}
        className="mt-1 h-11 w-full rounded-xl bg-canvas px-3 text-base text-ink outline-none"
      />
      <p className="mt-2 text-xs leading-relaxed text-muted">字笺只回复字卡上的原句，不另外编。</p>
      <button
        type="button"
        onClick={onRestore}
        className="mt-3 h-11 w-full rounded-xl bg-canvas text-sm text-ink"
      >
        补回示例字卡
      </button>
      <button type="button" onClick={onClear} className="mt-2 h-11 w-full rounded-xl text-sm text-stamp">
        清空这段对话
      </button>
    </div>
  );
}
