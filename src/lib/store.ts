import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  drawCards,
  SEED_CARDS,
  SEED_DECKS,
  type ChatMessage,
  type Deck,
  type ReplyMode,
  type WordCard,
} from "@/lib/cards";

const EMPTY_NOTE = "字卡都收起来了。打开字卡库，至少留一张能用。";
const MAX_MESSAGES = 200;

type Store = {
  companionName: string;
  mode: ReplyMode;
  decks: Deck[];
  cards: WordCard[];
  messages: ChatMessage[];
  draws: number;
  setCompanionName: (name: string) => void;
  setMode: (mode: ReplyMode) => void;
  cycleMode: () => void;
  addDeck: (name: string) => void;
  renameDeck: (id: string, name: string) => void;
  removeDeck: (id: string) => void;
  addCards: (deckId: string, lines: string[], note: string) => number;
  updateCard: (id: string, patch: Partial<Pick<WordCard, "text" | "note" | "deckId" | "enabled">>) => void;
  removeCard: (id: string) => void;
  sendUser: (text: string) => void;
  appendReply: (userText: string) => void;
  rerollLast: () => void;
  clearChat: () => void;
  restoreSamples: () => void;
};

function uid() {
  return crypto.randomUUID();
}

function deckNameOf(decks: Deck[], deckId: string) {
  return decks.find((deck) => deck.id === deckId)?.name ?? "字卡";
}

function avoidIds(messages: ChatMessage[], cards: WordCard[]) {
  const last = [...messages].reverse().find((message) => message.role === "companion");
  if (!last) return [];
  const match = cards.find((card) => card.text === last.text);
  return match ? [match.id] : [];
}

function replyMessages(
  state: Pick<Store, "cards" | "decks" | "mode" | "draws" | "messages">,
  userText: string,
  base: ChatMessage[],
): { messages: ChatMessage[]; draws: number } {
  const picked = drawCards(state.cards, state.decks, state.mode, userText, avoidIds(base, state.cards));
  const at = Date.now();
  if (!picked.length) {
    const notice: ChatMessage = { id: uid(), role: "notice", text: EMPTY_NOTE, at };
    return { messages: [...base, notice].slice(-MAX_MESSAGES), draws: state.draws };
  }
  const batch = uid();
  const next: ChatMessage[] = picked.map((card, index) => ({
    id: uid(),
    role: "companion",
    text: card.text,
    note: card.note,
    deckName: deckNameOf(state.decks, card.deckId),
    at: at + index,
    batch,
    drawNo: state.draws + index + 1,
  }));
  return {
    messages: [...base, ...next].slice(-MAX_MESSAGES),
    draws: state.draws + picked.length,
  };
}

function withoutTrailingReply(messages: ChatMessage[]) {
  const next = [...messages];
  while (next.length && next[next.length - 1]?.role !== "user") next.pop();
  return next;
}

export const useZijian = create<Store>()(
  persist(
    (set, get) => ({
      companionName: "字笺",
      mode: "echo",
      decks: SEED_DECKS,
      cards: SEED_CARDS,
      messages: [],
      draws: 0,
      setCompanionName: (name) => {
        const trimmed = name.trim().slice(0, 12);
        if (!trimmed) return;
        set({ companionName: trimmed });
      },
      setMode: (mode) => set({ mode }),
      cycleMode: () => {
        const order: ReplyMode[] = ["single", "pair", "echo"];
        const index = order.indexOf(get().mode);
        set({ mode: order[(index + 1) % order.length] });
      },
      addDeck: (name) => {
        const trimmed = name.trim().slice(0, 8);
        if (!trimmed) return;
        set((state) => ({
          decks: [...state.decks, { id: uid(), name: trimmed, hints: [] }],
        }));
      },
      renameDeck: (id, name) => {
        const trimmed = name.trim().slice(0, 8);
        if (!trimmed) return;
        set((state) => ({
          decks: state.decks.map((deck) => (deck.id === id ? { ...deck, name: trimmed } : deck)),
        }));
      },
      removeDeck: (id) => {
        const state = get();
        if (state.decks.length < 2) return;
        const fallback = state.decks.find((deck) => deck.id !== id);
        if (!fallback) return;
        set({
          decks: state.decks.filter((deck) => deck.id !== id),
          cards: state.cards.map((card) =>
            card.deckId === id ? { ...card, deckId: fallback.id } : card,
          ),
        });
      },
      addCards: (deckId, lines, note) => {
        const clean = lines.map((line) => line.trim()).filter(Boolean).slice(0, 40);
        if (!clean.length) return 0;
        const sharedNote = note.trim().slice(0, 24);
        const created: WordCard[] = clean.map((text) => ({
          id: uid(),
          deckId,
          text: text.slice(0, 120),
          note: sharedNote,
          enabled: true,
        }));
        set((state) => ({ cards: [...created, ...state.cards] }));
        return created.length;
      },
      updateCard: (id, patch) => {
        set((state) => ({
          cards: state.cards.map((card) => {
            if (card.id !== id) return card;
            const text = patch.text === undefined ? card.text : patch.text.trim().slice(0, 120);
            const note = patch.note === undefined ? card.note : patch.note.trim().slice(0, 24);
            return { ...card, ...patch, text, note };
          }),
        }));
      },
      removeCard: (id) => set((state) => ({ cards: state.cards.filter((card) => card.id !== id) })),
      sendUser: (text) => {
        const trimmed = text.trim().slice(0, 500);
        if (!trimmed) return;
        const message: ChatMessage = { id: uid(), role: "user", text: trimmed, at: Date.now() };
        set((state) => ({ messages: [...state.messages, message].slice(-MAX_MESSAGES) }));
      },
      appendReply: (userText) => {
        const state = get();
        const result = replyMessages(state, userText, state.messages);
        set(result);
      },
      rerollLast: () => {
        const state = get();
        const base = withoutTrailingReply(state.messages);
        const lastUser = [...base].reverse().find((message) => message.role === "user");
        const result = replyMessages(state, lastUser?.text ?? "", base);
        set(result);
      },
      clearChat: () => set({ messages: [] }),
      restoreSamples: () => {
        set((state) => {
          const deckIds = new Set(state.decks.map((deck) => deck.id));
          const cardIds = new Set(state.cards.map((card) => card.id));
          return {
            decks: [...state.decks, ...SEED_DECKS.filter((deck) => !deckIds.has(deck.id))],
            cards: [...state.cards, ...SEED_CARDS.filter((card) => !cardIds.has(card.id))],
          };
        });
      },
    }),
    { name: "zijian-v1", skipHydration: true },
  ),
);
