import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { runInvestmentAgent } from "@/lib/investment-agent/run";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const bindings = env as unknown as Record<string, string | undefined>;
  const bearer = request.headers.get("authorization");
  const cronAuthorized = Boolean(bindings.AGENT_CRON_SECRET && bearer === `Bearer ${bindings.AGENT_CRON_SECRET}`);
  const user = cronAuthorized ? null : await getChatGPTUser();
  if (!cronAuthorized && !user) return Response.json({ error: "Требуется вход руководителя." }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { deliver?: boolean };
  try {
    const result = await runInvestmentAgent(bindings, body.deliver !== false);
    return Response.json(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось сформировать отчёт.";
    return Response.json({ error: message }, { status: 502, headers: { "cache-control": "no-store" } });
  }
}
