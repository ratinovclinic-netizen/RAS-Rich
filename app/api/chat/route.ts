import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

type InputMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `Ты A.R.K. — персональный интеллектуальный ассистент высокого класса.
Отвечай на языке пользователя. По умолчанию будь кратким, точным, технически грамотным и инициативным.
Помогай анализировать, планировать, писать, учиться и принимать решения. Для сложных задач давай ясный следующий шаг.
Не утверждай, что выполнил внешнее действие, если у тебя нет соответствующего инструмента.
Перед оплатой, публикацией, удалением данных или иным необратимым действием всегда требуй подтверждение.
Не выдавай себя за JARVIS или персонажа Marvel; твоя личность — A.R.K.`;

async function ensureSchema(db: D1Database) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS assistant_messages (id TEXT PRIMARY KEY NOT NULL, user_email TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS assistant_messages_user_time_idx ON assistant_messages (user_email, created_at)"),
  ]);
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ messages: [] });
  const db = (env as unknown as { DB?: D1Database }).DB;
  if (!db) return Response.json({ messages: [] });
  await ensureSchema(db);
  const result = await db.prepare("SELECT id, role, content FROM assistant_messages WHERE user_email = ? ORDER BY created_at DESC LIMIT 40").bind(user.email).all<InputMessage & { id: string }>();
  return Response.json({ messages: (result.results || []).reverse() });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  const body = await request.json().catch(() => null) as { messages?: InputMessage[] } | null;
  const messages = body?.messages?.filter((item) =>
    (item.role === "user" || item.role === "assistant") && typeof item.content === "string" && item.content.trim().length > 0
  ).slice(-20);
  if (!messages?.length) return Response.json({ error: "Сообщение пустое." }, { status: 400 });

  const apiKey = (env as unknown as { OPENAI_API_KEY?: string }).OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Интерфейс готов, но серверный ключ OpenAI ещё не подключён. Добавьте OPENAI_API_KEY в настройки приложения — после этого ответы станут активны." }, { status: 503 });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      instructions: `${SYSTEM_PROMPT}\nИмя владельца: ${user?.displayName || "не указано"}.`,
      input: messages.map(({ role, content }) => ({ role, content })),
      max_output_tokens: 1200,
    }),
  });
  const data = await response.json() as { output_text?: string; output?: { content?: { type?: string; text?: string }[] }[]; error?: { message?: string } };
  if (!response.ok) return Response.json({ error: data.error?.message || "Модель временно недоступна." }, { status: response.status });
  const message = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  const finalMessage = message || "Ответ получен без текста.";
  const db = (env as unknown as { DB?: D1Database }).DB;
  if (user && db) {
    await ensureSchema(db);
    const latestUserMessage = messages[messages.length - 1];
    await db.batch([
      db.prepare("INSERT INTO assistant_messages (id, user_email, role, content, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), user.email, "user", latestUserMessage.content, Date.now()),
      db.prepare("INSERT INTO assistant_messages (id, user_email, role, content, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), user.email, "assistant", finalMessage, Date.now() + 1),
    ]);
  }
  return Response.json({ message: finalMessage });
}
