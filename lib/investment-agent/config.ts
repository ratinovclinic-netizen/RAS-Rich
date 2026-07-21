export type InvestmentAgentConfig = {
  timezone: string;
  currency: string;
  bitrix: {
    entityTypeId: number;
    categoryIds: number[];
    wonStageIds: string[];
    lostStageIds: string[];
  };
  google: {
    spreadsheetId: string;
    ranges: string[];
    amountColumnIndex: number;
  };
};

export class AgentConfigError extends Error {}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
}

function numbers(value: unknown): number[] {
  return Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : [];
}

export function parseAgentConfig(raw: string | undefined): InvestmentAgentConfig {
  if (!raw) throw new AgentConfigError("Не задана конфигурация INVESTMENT_AGENT_CONFIG_JSON.");
  let value: Record<string, unknown>;
  try {
    value = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new AgentConfigError("INVESTMENT_AGENT_CONFIG_JSON содержит некорректный JSON.");
  }

  const bitrix = (value.bitrix ?? {}) as Record<string, unknown>;
  const google = (value.google ?? {}) as Record<string, unknown>;
  const spreadsheetId = typeof google.spreadsheetId === "string" ? google.spreadsheetId.trim() : "";
  const ranges = strings(google.ranges);
  if (!spreadsheetId || ranges.length === 0) {
    throw new AgentConfigError("В конфигурации нужны google.spreadsheetId и хотя бы один диапазон google.ranges.");
  }

  return {
    timezone: typeof value.timezone === "string" ? value.timezone : "Asia/Bishkek",
    currency: typeof value.currency === "string" ? value.currency : "USD",
    bitrix: {
      entityTypeId: Number(bitrix.entityTypeId) || 2,
      categoryIds: numbers(bitrix.categoryIds),
      wonStageIds: strings(bitrix.wonStageIds),
      lostStageIds: strings(bitrix.lostStageIds),
    },
    google: {
      spreadsheetId,
      ranges,
      amountColumnIndex: Math.max(0, Number(google.amountColumnIndex) || 0),
    },
  };
}
