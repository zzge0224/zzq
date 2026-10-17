import { useEffect, useRef, useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { MODE_HINT, MODE_LABEL, type ReplyMode } from "@/lib/cards";
import { cn } from "@/lib/cn";
import { useZijian } from "@/lib/store";

const MODES: ReplyMode[] = ["single", "pair", "echo"];

export function LibrarySheet({
  open,
  focusAdd,
  onClose,
}: {
  open: boolean;
  focusAdd: boolean;
  onClose: () => void;
}) {
  const decks = useZijian((state) => state.decks);
  const cards = useZijian((state) => state.cards);
  const mode = useZijian((state) => state.mode);
  const setMode = useZijian((state) => state.setMode);
  const addDeck = useZijian((state) => state.addDeck);
  const renameDeck = useZijian((state) => state.renameDeck);
  const removeDeck = useZijian((state) => state.removeDeck);
  const addCards = useZijian((state) => state.addCards);
  const updateCard = useZijian((state) => state.updateCard);
  const removeCard = useZijian((state) => state.removeCard);

  const [deckId, setDeckId] = useState(decks[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [deckName, setDeckName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const draftRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!decks.some((deck) => deck.id === deckId)) setDeckId(decks[0]?.id ?? "");
  }, [decks, deckId]);

  useEffect(() => {
    if (!open || !focusAdd) return;
    const timer = window.setTimeout(() => draftRef.current?.focus(), 180);
    return () => window.clearTimeout(timer);
  }, [open, focusAdd]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const keyword = query.trim();
  const visible = cards.filter((card) => {
    if (filter !== "all" && card.deckId !== filter) return false;
    if (!keyword) return true;
    return card.text.includes(keyword) || card.note.includes(keyword);
  });
  const enabled = cards.filter((card) => card.enabled && card.text.trim()).length;

  function submitCard() {
    const count = addCards(deckId, draft.split(/\n+/), note);
    if (!count) return;
    setDraft("");
    setNote("");
    setNotice(count > 1 ? `放进了 ${count} 张` : "放进字卡库了");
  }

  return (
    <div
      className={cn("absolute inset-0 z-40", open ? "" : "pointer-events-none")}
      aria-hidden={!open}
      inert={!open}
    >
      <button
        type="button"
        aria-label="关闭字卡库"
        className={cn("absolute inset-0 bg-canvas/80 transition-opacity duration-200", open ? "opacity-100" : "opacity-0")}
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="library-title"
        className={cn(
          "absolute inset-x-0 bottom-0 flex h-[92%] flex-col rounded-t-3xl border border-line bg-chrome transition-transform duration-200 ease-out",
          open ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line md:hidden" />
        <header className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 id="library-title" className="font-serif text-xl">
              字卡库
            </h2>
            <p className="text-sm text-muted tabular-nums">
              {enabled} 张可抽 · 共 {cards.length} 张
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="grid size-11 place-items-center rounded-full text-ink"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="回复方式">
            {MODES.map((item) => (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={mode === item}
                onClick={() => setMode(item)}
                className={cn(
                  "h-11 rounded-xl text-sm transition-transform duration-150 ease-out active:scale-[0.96]",
                  mode === item ? "bg-self text-self-ink" : "bg-canvas text-muted",
                )}
              >
                {MODE_LABEL[item]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-pretty text-muted">{MODE_HINT[mode]}</p>

          <form
            className="mt-4 rounded-2xl bg-canvas p-3"
            onSubmit={(event) => {
              event.preventDefault();
              submitCard();
            }}
          >
            <label className="text-xs text-muted" htmlFor="new-card">
              写一张新字卡，一行一句
            </label>
            <textarea
              id="new-card"
              ref={draftRef}
              rows={3}
              value={draft}
              maxLength={2000}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="比如：今晚月色刚好"
              className="mt-2 w-full resize-none bg-transparent text-base leading-relaxed text-ink outline-none placeholder:text-muted"
            />
            <input
              value={note}
              maxLength={24}
              onChange={(event) => setNote(event.target.value)}
              placeholder="出处，可空"
              aria-label="出处"
              className="mt-1 h-10 w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
            />
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {decks.map((deck) => (
                <button
                  key={deck.id}
                  type="button"
                  onClick={() => setDeckId(deck.id)}
                  className={cn(
                    "h-9 shrink-0 rounded-full px-3 text-sm",
                    deckId === deck.id ? "bg-self text-self-ink" : "bg-chrome text-muted",
                  )}
                >
                  {deck.name}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={!draft.trim()}
              className="mt-3 h-11 w-full rounded-xl bg-self text-sm text-self-ink transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-40"
            >
              放入字卡库
            </button>
          </form>

          <label className="mt-4 block text-xs text-muted" htmlFor="card-search">
            搜索
          </label>
          <input
            id="card-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="找一句"
            className="mt-1 h-11 w-full rounded-xl bg-canvas px-3 text-base text-ink outline-none placeholder:text-muted"
          />
          <div className="mt-3 flex gap-2 overflow-x-auto">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="全部" />
            {decks.map((deck) => (
              <FilterChip
                key={deck.id}
                active={filter === deck.id}
                onClick={() => setFilter(deck.id)}
                label={deck.name}
              />
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted">这组里还没有字卡。</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {visible.map((card) => {
                const deck = decks.find((item) => item.id === card.deckId);
                const isEditing = editing === card.id;
                return (
                  <li key={card.id} className={cn("rounded-2xl bg-paper p-3 text-paper-ink", !card.enabled && "opacity-50")}>
                    {isEditing ? (
                      <CardEditor
                        text={card.text}
                        note={card.note}
                        deckId={card.deckId}
                        decks={decks}
                        onCancel={() => setEditing(null)}
                        onSave={(patch) => {
                          updateCard(card.id, patch);
                          setEditing(null);
                        }}
                      />
                    ) : (
                      <>
                        <div className="flex items-start gap-3">
                          <p className="min-w-0 flex-1 font-serif text-base leading-relaxed wrap-break-word">
                            {card.text}
                          </p>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={card.enabled}
                            aria-label={card.enabled ? "停用这张字卡" : "启用这张字卡"}
                            onClick={() => updateCard(card.id, { enabled: !card.enabled })}
                            className="grid size-11 shrink-0 place-items-center"
                          >
                            <span
                              className={cn(
                                "relative h-7 w-12 rounded-full",
                                card.enabled ? "bg-self" : "bg-line",
                              )}
                            >
                              <span
                                className={cn(
                                  "absolute top-1 size-5 rounded-full bg-paper transition-transform duration-150",
                                  card.enabled ? "translate-x-6" : "translate-x-1",
                                )}
                              />
                            </span>
                          </button>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <p className="truncate text-xs text-paper-muted">
                            {deck?.name ?? "未分组"}
                            {card.note ? ` · ${card.note}` : ""}
                          </p>
                          <div className="flex shrink-0">
                            <button
                              type="button"
                              aria-label="编辑"
                              onClick={() => setEditing(card.id)}
                              className="grid size-10 place-items-center text-paper-muted"
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={confirmDelete === card.id ? "确认删除" : "删除"}
                              onClick={() => {
                                if (confirmDelete === card.id) {
                                  removeCard(card.id);
                                  setConfirmDelete(null);
                                } else {
                                  setConfirmDelete(card.id);
                                }
                              }}
                              className="grid size-10 place-items-center text-stamp"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                        {confirmDelete === card.id ? (
                          <p className="text-xs text-stamp">再点一次删除</p>
                        ) : null}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-6 border-t border-line pt-4">
            <p className="text-xs text-muted">分组</p>
            <ul className="mt-2 flex flex-col gap-2">
              {decks.map((deck) => (
                <DeckRow
                  key={deck.id}
                  name={deck.name}
                  count={cards.filter((card) => card.deckId === deck.id).length}
                  canRemove={decks.length > 1}
                  onRename={(name) => renameDeck(deck.id, name)}
                  onRemove={() => removeDeck(deck.id)}
                />
              ))}
            </ul>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                addDeck(deckName);
                setDeckName("");
              }}
            >
              <input
                value={deckName}
                maxLength={8}
                onChange={(event) => setDeckName(event.target.value)}
                placeholder="新分组"
                aria-label="新分组名称"
                className="h-11 min-w-0 flex-1 rounded-xl bg-canvas px-3 text-base text-ink outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                disabled={!deckName.trim()}
                className="h-11 shrink-0 rounded-xl bg-canvas px-3 text-sm text-ink disabled:opacity-40"
              >
                添加
              </button>
            </form>
            {notice ? <p className="mt-3 text-sm text-muted">{notice}</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 shrink-0 rounded-full px-3 text-sm",
        active ? "bg-paper text-paper-ink" : "bg-canvas text-muted",
      )}
    >
      {label}
    </button>
  );
}

function CardEditor({
  text,
  note,
  deckId,
  decks,
  onSave,
  onCancel,
}: {
  text: string;
  note: string;
  deckId: string;
  decks: { id: string; name: string }[];
  onSave: (patch: { text: string; note: string; deckId: string }) => void;
  onCancel: () => void;
}) {
  const [nextText, setNextText] = useState(text);
  const [nextNote, setNextNote] = useState(note);
  const [nextDeck, setNextDeck] = useState(deckId);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!nextText.trim()) return;
        onSave({ text: nextText, note: nextNote, deckId: nextDeck });
      }}
    >
      <textarea
        value={nextText}
        onChange={(event) => setNextText(event.target.value)}
        rows={3}
        className="w-full resize-none bg-transparent font-serif text-base leading-relaxed outline-none"
      />
      <input
        value={nextNote}
        maxLength={24}
        onChange={(event) => setNextNote(event.target.value)}
        placeholder="出处"
        aria-label="出处"
        className="mt-1 h-9 w-full bg-transparent text-sm outline-none placeholder:text-paper-muted"
      />
      <div className="mt-2 flex gap-2 overflow-x-auto">
        {decks.map((deck) => (
          <button
            key={deck.id}
            type="button"
            onClick={() => setNextDeck(deck.id)}
            className={cn(
              "h-8 shrink-0 rounded-full px-3 text-xs",
              nextDeck === deck.id ? "bg-self text-self-ink" : "bg-chrome text-paper-muted",
            )}
          >
            {deck.name}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-end gap-1">
        <button type="button" aria-label="取消" onClick={onCancel} className="grid size-10 place-items-center">
          <X className="size-4" />
        </button>
        <button type="submit" aria-label="保存" className="grid size-10 place-items-center text-self">
          <Check className="size-4" />
        </button>
      </div>
    </form>
  );
}

function DeckRow({
  name,
  count,
  canRemove,
  onRename,
  onRemove,
}: {
  name: string;
  count: number;
  canRemove: boolean;
  onRename: (name: string) => void;
  onRemove: () => void;
}) {
  const [value, setValue] = useState(name);
  useEffect(() => setValue(name), [name]);
  return (
    <li className="flex items-center gap-2">
      <input
        value={value}
        maxLength={8}
        aria-label={`分组 ${name}`}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => onRename(value)}
        className="h-11 min-w-0 flex-1 rounded-xl bg-canvas px-3 text-base text-ink outline-none"
      />
      <span className="w-8 text-right text-sm text-muted tabular-nums">{count}</span>
      <button
        type="button"
        aria-label={`删除分组 ${name}`}
        disabled={!canRemove}
        onClick={onRemove}
        className="grid size-11 place-items-center text-muted disabled:opacity-30"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}
