import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { createBitrixReadOnlyClient } from "@/lib/bitrix/read-only-client";

export const dynamic = "force-dynamic";
type Activity = Record<string, unknown> & { ID?: string; TYPE_ID?: string; PROVIDER_ID?: string; PROVIDER_TYPE_ID?: string; SUBJECT?: string; COMPLETED?: string; START_TIME?: string; END_TIME?: string; FILES?: unknown[] };

function scoreDeal(deal: Record<string, unknown>, activities: Activity[]) {
  const updated = Date.parse(String(deal.updatedTime || ""));
  const daysSilent = Number.isFinite(updated) ? Math.floor((Date.now() - updated) / 86_400_000) : 99;
  const calls = activities.filter((item) => item.TYPE_ID === "2" || item.PROVIDER_TYPE_ID === "CALL");
  const meetings = activities.filter((item) => /встреч/i.test(String(item.SUBJECT || "")));
  const pending = activities.filter((item) => item.COMPLETED === "N");
  const recordings = calls.filter((item) => Array.isArray(item.FILES) && item.FILES.length > 0);
  let probability = 35;
  if (daysSilent <= 2) probability += 15; else if (daysSilent >= 7) probability -= 20;
  if (calls.length) probability += Math.min(15, calls.length * 4);
  if (meetings.some((item) => item.COMPLETED === "Y")) probability += 15;
  if (pending.length) probability += 10;
  probability = Math.max(5, Math.min(95, probability));
  const actions: string[] = [];
  if (daysSilent >= 7) actions.push("Вернуть сделку в работу сегодня и зафиксировать следующий шаг.");
  if (!pending.length) actions.push("Поставить конкретную следующую задачу с датой и ответственным.");
  if (!meetings.length) actions.push("Назначить встречу для выявления мотивации, суммы и срока решения.");
  if (!calls.length) actions.push("Провести квалификационный звонок и зафиксировать возражения клиента.");
  if (!actions.length) actions.push("Проверить итог последнего контакта и подтвердить дату следующего решения.");
  return { probability, daysSilent, calls: calls.length, meetings: meetings.length, recordings: recordings.length, pending: pending.length, actions };
}

export async function POST(request: Request) {
  if (!await getChatGPTUser()) return Response.json({ error: "Требуется вход руководителя." }, { status: 401 });
  const bindings = env as unknown as { BITRIX24_WEBHOOK_URL?: string; OPENAI_API_KEY?: string };
  const body = await request.json().catch(() => null) as { id?: number } | null;
  if (!bindings.BITRIX24_WEBHOOK_URL || !body?.id) return Response.json({ error: "Не указана сделка." }, { status: 400 });
  const client = createBitrixReadOnlyClient(bindings.BITRIX24_WEBHOOK_URL);
  const [dealResult, activityResult] = await Promise.all([
    client.call<Record<string, unknown>>("crm.item.get", { entityTypeId: 2, id: body.id }),
    client.call<Activity[]>("crm.activity.list", { filter: { OWNER_TYPE_ID: 2, OWNER_ID: body.id }, order: { ID: "DESC" }, start: 0 }),
  ]);
  const root = dealResult.result as { item?: Record<string, unknown> };
  const deal = root.item || dealResult.result;
  const activities = activityResult.result.slice(0, 50);
  return Response.json({ deal, activities, assessment: scoreDeal(deal, activities), callAnalysisAvailable: Boolean(bindings.OPENAI_API_KEY) }, { headers: { "cache-control": "no-store" } });
}
