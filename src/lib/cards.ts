export type ReplyMode = "single" | "pair" | "echo";

export type Deck = {
  id: string;
  name: string;
  hints: string[];
};

export type WordCard = {
  id: string;
  deckId: string;
  text: string;
  note: string;
  enabled: boolean;
};

export type ChatRole = "user" | "companion" | "notice";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  at: number;
  batch?: string;
  deckName?: string;
  note?: string;
  drawNo?: number;
};

export const MODE_LABEL: Record<ReplyMode, string> = {
  single: "单抽",
  pair: "连抽",
  echo: "应声",
};

export const MODE_HINT: Record<ReplyMode, string> = {
  single: "每次从可用字卡里随机抽一张",
  pair: "每次连抽两张，中间不重复",
  echo: "你的话里若有相同的字，就优先抽那张",
};

export const SEED_DECKS: Deck[] = [
  { id: "daily", name: "闲话", hints: ["吃", "喝", "今天", "在吗", "忙", "睡", "早", "晚"] },
  { id: "verse", name: "短句", hints: ["雨", "月", "风", "夜", "山", "花", "雪", "云", "春"] },
  { id: "tease", name: "回嘴", hints: ["烦", "哈哈", "离谱", "笨", "气", "笑"] },
  { id: "cheer", name: "打气", hints: ["累", "难", "怕", "加油", "不行", "焦虑", "垮"] },
  { id: "trivia", name: "冷门", hints: ["知道", "科学", "真的", "为什么"] },
];

export const SEED_CARDS: WordCard[] = [
  { id: "seed-d1", deckId: "daily", text: "刚泡了茶，你先说。", note: "", enabled: true },
  { id: "seed-d2", deckId: "daily", text: "嗯，我在听。", note: "", enabled: true },
  { id: "seed-d3", deckId: "daily", text: "今天风有点大，话可以慢一点。", note: "", enabled: true },
  { id: "seed-d4", deckId: "daily", text: "吃了吗？没吃的话，别饿着。", note: "", enabled: true },
  { id: "seed-d5", deckId: "daily", text: "这个我得想一下，你先喝口水。", note: "", enabled: true },
  { id: "seed-d6", deckId: "daily", text: "我把这句话收进袖子里了。", note: "", enabled: true },
  { id: "seed-v1", deckId: "verse", text: "行到水穷处，坐看云起时。", note: "王维", enabled: true },
  { id: "seed-v2", deckId: "verse", text: "晚来天欲雪，能饮一杯无。", note: "白居易", enabled: true },
  { id: "seed-v3", deckId: "verse", text: "山色空蒙雨亦奇。", note: "苏轼", enabled: true },
  { id: "seed-v4", deckId: "verse", text: "小楼一夜听春雨。", note: "陆游", enabled: true },
  { id: "seed-v5", deckId: "verse", text: "落花人独立，微雨燕双飞。", note: "晏几道", enabled: true },
  { id: "seed-v6", deckId: "verse", text: "人间有味是清欢。", note: "苏轼", enabled: true },
  { id: "seed-t1", deckId: "tease", text: "你这句，我选择微笑。", note: "", enabled: true },
  { id: "seed-t2", deckId: "tease", text: "有道理，但不想承认。", note: "", enabled: true },
  { id: "seed-t3", deckId: "tease", text: "建议再想一个更好的借口。", note: "", enabled: true },
  { id: "seed-t4", deckId: "tease", text: "收到。已读，沉默了一秒。", note: "", enabled: true },
  { id: "seed-t5", deckId: "tease", text: "这属于高级难题，先跳过。", note: "", enabled: true },
  { id: "seed-t6", deckId: "tease", text: "你赢了，我去倒杯水。", note: "", enabled: true },
  { id: "seed-c1", deckId: "cheer", text: "慢慢来，比较快。", note: "", enabled: true },
  { id: "seed-c2", deckId: "cheer", text: "你已经比昨天多走了一步。", note: "", enabled: true },
  { id: "seed-c3", deckId: "cheer", text: "累了就停，不是放弃。", note: "", enabled: true },
  { id: "seed-c4", deckId: "cheer", text: "这件事，你撑得住。", note: "", enabled: true },
  { id: "seed-c5", deckId: "cheer", text: "先做最小的那一步。", note: "", enabled: true },
  { id: "seed-c6", deckId: "cheer", text: "不必一次说完，我还在。", note: "", enabled: true },
  { id: "seed-k1", deckId: "trivia", text: "蜂蜜几乎不会变质。", note: "封存得当的话", enabled: true },
  { id: "seed-k2", deckId: "trivia", text: "章鱼有三颗心脏。", note: "", enabled: true },
  { id: "seed-k3", deckId: "trivia", text: "香蕉是浆果，草莓不是。", note: "", enabled: true },
  { id: "seed-k4", deckId: "trivia", text: "先看见闪电，再听见雷，因为光更快。", note: "", enabled: true },
  { id: "seed-k5", deckId: "trivia", text: "考拉的指纹，和人很像。", note: "", enabled: true },
  { id: "seed-k6", deckId: "trivia", text: "蜗牛可以睡上三年。", note: "", enabled: true },
];

const STOP = "的了吗啊呢吧我你是在有就也都很不这那一个到说想会要和与或而";

export function scoreCard(card: WordCard, decks: Deck[], userText: string) {
  const deck = decks.find((item) => item.id === card.deckId);
  let score = 0;
  const text = userText.trim();
  if (!text) return 0;
  for (const hint of deck?.hints ?? []) {
    if (hint && text.includes(hint)) score += 3;
  }
  for (const ch of text) {
    if (STOP.includes(ch) || /\s/.test(ch)) continue;
    if (card.text.includes(ch)) score += 1;
  }
  return score;
}

export function drawCards(
  cards: WordCard[],
  decks: Deck[],
  mode: ReplyMode,
  userText: string,
  avoidIds: string[],
) {
  const enabled = cards.filter((card) => card.enabled && card.text.trim());
  if (!enabled.length) return [];
  const count = mode === "pair" ? Math.min(2, enabled.length) : 1;

  let pool = enabled;
  if (mode === "echo") {
    const scored = enabled.map((card) => ({
      card,
      score: scoreCard(card, decks, userText),
    }));
    const best = Math.max(...scored.map((item) => item.score));
    if (best > 0) pool = scored.filter((item) => item.score === best).map((item) => item.card);
  }

  const picked: WordCard[] = [];
  const fresh = pool.filter((card) => !avoidIds.includes(card.id));
  const source = [...(fresh.length ? fresh : pool)];
  for (let i = 0; i < count && source.length; i += 1) {
    const index = Math.floor(Math.random() * source.length);
    picked.push(source.splice(index, 1)[0]);
  }
  if (picked.length < count) {
    const rest = enabled.filter((card) => !picked.some((item) => item.id === card.id));
    while (picked.length < count && rest.length) {
      const index = Math.floor(Math.random() * rest.length);
      picked.push(rest.splice(index, 1)[0]);
    }
  }
  return picked;
}

export function formatStamp(at: number, now = Date.now()) {
  const date = new Date(at);
  const today = new Date(now);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const time = `${hh}:${mm}`;
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  if (sameDay) return time;
  return `${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
}

export function shouldShowStamp(messages: ChatMessage[], index: number) {
  const current = messages[index];
  if (!current || current.role === "notice") return false;
  if (index === 0) return true;
  const prev = messages[index - 1];
  if (!prev || prev.role === "notice") return true;
  return current.at - prev.at > 5 * 60 * 1000;
}
