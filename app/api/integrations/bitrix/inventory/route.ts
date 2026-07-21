import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { BitrixReadError, createBitrixReadOnlyClient } from "@/lib/bitrix/read-only-client";

export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function noStoreJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("cache-control", "no-store, max-age=0");
  headers.set("pragma", "no-cache");
  return Response.json(body, { ...init, headers });
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) {
    return noStoreJson({ connected: false, error: "Требуется вход руководителя." }, { status: 401 });
  }

  const webhookUrl = (env as unknown as { BITRIX24_WEBHOOK_URL?: string }).BITRIX24_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return noStoreJson({
      connected: false,
      readonly: true,
      configured: false,
      error: "Подключение Bitrix24 ещё не настроено на сервере.",
    }, { status: 503 });
  }

  try {
    const bitrix = createBitrixReadOnlyClient(webhookUrl);

    const [profileResponse, categoriesResponse, fieldsResponse, dealsResponse] = await Promise.all([
      bitrix.call<UnknownRecord>("profile"),
      bitrix.call<UnknownRecord>("crm.category.list", { entityTypeId: 2 }),
      bitrix.call<UnknownRecord>("crm.item.fields", { entityTypeId: 2 }),
      bitrix.call<UnknownRecord>("crm.item.list", {
        entityTypeId: 2,
        select: ["id", "categoryId", "stageId", "opportunity", "currencyId", "assignedById", "createdTime", "updatedTime"],
        order: { updatedTime: "DESC" },
        start: 0,
      }),
    ]);

    const profile = asRecord(profileResponse.result);
    const categoriesRoot = asRecord(categoriesResponse.result);
    const rawCategories = asArray(categoriesRoot.categories);
    const categories = rawCategories.slice(0, 20).map((entry) => {
      const category = asRecord(entry);
      return {
        id: numberValue(category.id ?? category.ID),
        name: stringValue(category.name ?? category.NAME) || "Без названия",
        isDefault: Boolean(category.isDefault ?? category.IS_DEFAULT),
      };
    });

    if (categories.length === 0) {
      categories.push({ id: 0, name: "Основная воронка", isDefault: true });
    }

    const stageResponses = await Promise.all(categories.map(async (category) => {
      const entityId = category.id === 0 ? "DEAL_STAGE" : `DEAL_STAGE_${category.id}`;
      const response = await bitrix.call<unknown[]>("crm.status.list", { filter: { ENTITY_ID: entityId } });
      return {
        categoryId: category.id,
        stages: asArray(response.result).map((entry) => {
          const stage = asRecord(entry);
          return {
            id: stringValue(stage.STATUS_ID ?? stage.statusId),
            name: stringValue(stage.NAME ?? stage.name) || "Без названия",
            sort: numberValue(stage.SORT ?? stage.sort),
          };
        }),
      };
    }));

    const fieldsRoot = asRecord(fieldsResponse.result);
    const rawFields = asRecord(fieldsRoot.fields);
    const fields = Object.entries(rawFields).map(([id, entry]) => {
      const field = asRecord(entry);
      return {
        id,
        title: stringValue(field.title ?? field.formLabel ?? field.listLabel) || id,
        type: stringValue(field.type),
        required: Boolean(field.isRequired),
        readonly: Boolean(field.isReadOnly),
      };
    });

    const dealsRoot = asRecord(dealsResponse.result);
    const returnedDeals = asArray(dealsRoot.items).length;

    return noStoreJson({
      connected: true,
      configured: true,
      readonly: true,
      checkedAt: new Date().toISOString(),
      portalUserId: stringValue(profile.ID ?? profile.id),
      inventory: {
        dealTotal: dealsResponse.total ?? returnedDeals,
        returnedDeals,
        categoryCount: categories.length,
        fieldCount: fields.length,
        categories,
        stages: stageResponses,
        fields,
      },
    });
  } catch (error) {
    const safeError = error instanceof BitrixReadError
      ? { code: error.code, message: error.message, status: error.status }
      : { code: "BITRIX_UNKNOWN_ERROR", message: "Не удалось проверить подключение Bitrix24.", status: 502 };

    return noStoreJson({
      connected: false,
      configured: true,
      readonly: true,
      error: safeError.message,
      code: safeError.code,
    }, { status: safeError.status });
  }
}
