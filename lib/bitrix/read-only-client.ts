export const BITRIX_READ_ONLY_METHODS = [
  "profile",
  "user.get",
  "crm.type.list",
  "crm.category.list",
  "crm.status.list",
  "crm.item.fields",
  "crm.item.get",
  "crm.item.list",
  "crm.activity.list",
  "crm.timeline.comment.list",
] as const;

export type BitrixReadOnlyMethod = (typeof BITRIX_READ_ONLY_METHODS)[number];

const READ_ONLY_METHOD_SET = new Set<string>(BITRIX_READ_ONLY_METHODS);

type BitrixEnvelope<T> = {
  result?: T;
  total?: number;
  next?: number;
  error?: string;
  error_description?: string;
};

export type BitrixReadResult<T> = {
  result: T;
  total?: number;
  next?: number;
};

export class BitrixReadError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 502) {
    super(message);
    this.name = "BitrixReadError";
    this.code = code;
    this.status = status;
  }
}

export function isBitrixReadOnlyMethod(method: string): method is BitrixReadOnlyMethod {
  return READ_ONLY_METHOD_SET.has(method);
}

function normalizeWebhookBase(rawWebhookUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawWebhookUrl.trim());
  } catch {
    throw new BitrixReadError("INVALID_WEBHOOK_URL", "Адрес подключения Bitrix24 имеет неверный формат.", 500);
  }

  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new BitrixReadError("INVALID_WEBHOOK_URL", "Адрес подключения Bitrix24 должен быть защищённым HTTPS-адресом без дополнительных параметров.", 500);
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const validPath =
    segments.length === 3 &&
    segments[0] === "rest" &&
    /^\d+$/.test(segments[1]) &&
    /^[A-Za-z0-9_-]+$/.test(segments[2]);

  if (!validPath) {
    throw new BitrixReadError("INVALID_WEBHOOK_URL", "Адрес подключения Bitrix24 не соответствует формату входящего webhook.", 500);
  }

  url.pathname = `/${segments.join("/")}/`;
  return url.toString();
}

function containsAuthParameter(params: Record<string, unknown>): boolean {
  return Object.keys(params).some((key) => key.toLowerCase() === "auth");
}

export function createBitrixReadOnlyClient(rawWebhookUrl: string) {
  const webhookBase = normalizeWebhookBase(rawWebhookUrl);

  return {
    async call<T>(method: BitrixReadOnlyMethod, params: Record<string, unknown> = {}): Promise<BitrixReadResult<T>> {
      if (!isBitrixReadOnlyMethod(method)) {
        throw new BitrixReadError("METHOD_NOT_ALLOWED", "Запрошенный метод Bitrix24 не разрешён политикой только чтения.", 500);
      }

      if (containsAuthParameter(params)) {
        throw new BitrixReadError("AUTH_PARAMETER_FORBIDDEN", "Авторизационные данные нельзя передавать в параметрах запроса.", 500);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      try {
        const response = await fetch(`${webhookBase}${method}.json`, {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify(params),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new BitrixReadError("BITRIX_HTTP_ERROR", `Bitrix24 вернул HTTP ${response.status}.`, 502);
        }

        const payload = (await response.json()) as BitrixEnvelope<T>;
        if (payload.error) {
          throw new BitrixReadError(
            payload.error,
            payload.error_description || "Bitrix24 отклонил запрос чтения.",
            payload.error === "NO_AUTH_FOUND" || payload.error === "INVALID_CREDENTIALS" ? 401 : 502,
          );
        }

        if (!("result" in payload)) {
          throw new BitrixReadError("INVALID_RESPONSE", "Bitrix24 вернул ответ без данных.", 502);
        }

        return {
          result: payload.result as T,
          total: payload.total,
          next: payload.next,
        };
      } catch (error) {
        if (error instanceof BitrixReadError) throw error;
        if (error instanceof Error && error.name === "AbortError") {
          throw new BitrixReadError("BITRIX_TIMEOUT", "Bitrix24 не ответил за отведённое время.", 504);
        }
        throw new BitrixReadError("BITRIX_UNAVAILABLE", "Не удалось установить защищённое соединение с Bitrix24.", 502);
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
