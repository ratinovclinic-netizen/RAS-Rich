import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { createBitrixReadOnlyClient } from "@/lib/bitrix/read-only-client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await getChatGPTUser()) return Response.json({ error: "Требуется вход руководителя." }, { status: 401 });
  const bindings = env as unknown as { BITRIX24_WEBHOOK_URL?: string; BITRIX24_CATEGORY_IDS?: string };
  if (!bindings.BITRIX24_WEBHOOK_URL) return Response.json({ error: "Bitrix24 не настроен." }, { status: 503 });
  const url = new URL(request.url);
  const categoryId = Number(url.searchParams.get("categoryId"));
  const stageId = url.searchParams.get("stageId") || "";
  const allowed = (bindings.BITRIX24_CATEGORY_IDS || "").split(",").map(Number);
  if (!allowed.includes(categoryId)) return Response.json({ error: "Воронка не разрешена." }, { status: 400 });
  const filter: Record<string, unknown> = { categoryId };
  if (stageId) filter.stageId = stageId;
  const client = createBitrixReadOnlyClient(bindings.BITRIX24_WEBHOOK_URL);
  const result = await client.call<{ items?: Array<Record<string, unknown>> }>("crm.item.list", {
    entityTypeId: 2, filter,
    select: ["id", "title", "stageId", "opportunity", "currencyId", "assignedById", "contactId", "createdTime", "updatedTime"],
    order: { updatedTime: "DESC" }, start: 0,
  });
  return Response.json({ deals: (result.result.items || []).slice(0, 50), total: result.total || 0 }, { headers: { "cache-control": "no-store" } });
}
