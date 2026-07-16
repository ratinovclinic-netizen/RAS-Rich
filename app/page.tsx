"use client";

import { useEffect, useMemo, useState } from "react";

type ModeId = "monthly" | "quarterly" | "yearly" | "maturity";

type Calculation = {
  total: number;
  profit: number;
  endPayment: number;
  interimIncome: number;
  monthlyPayment: number;
  effectiveAnnualRate: number;
};

const MIN_AMOUNT = 500_000;
const MAX_AMOUNT = 10_000_000;
const TERMS = [6, 12, 24, 36] as const;

const MODES: Array<{
  id: ModeId;
  short: string;
  title: string;
  description: string;
  badge?: string;
}> = [
  {
    id: "monthly",
    short: "Каждый месяц",
    title: "Ежемесячная выплата",
    description: "Стандарт: доход выплачивается, тело не увеличивается.",
  },
  {
    id: "quarterly",
    short: "Каждый квартал",
    title: "Капитализация раз в квартал",
    description: "Начисленный доход добавляется к телу каждые 3 месяца.",
  },
  {
    id: "yearly",
    short: "Каждый год",
    title: "Капитализация раз в год",
    description: "Доход присоединяется к телу после каждого полного года.",
  },
  {
    id: "maturity",
    short: "В конце срока",
    title: "Всё в конце срока",
    description: "Доход ежемесячно капитализируется и выплачивается вместе с телом.",
    badge: "Максимум роста",
  },
];

const moneyFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function calculate(
  amount: number,
  annualRate: number,
  months: number,
  mode: ModeId,
): Calculation {
  const rate = annualRate / 100;
  let total = amount;

  if (mode === "monthly") {
    total = amount + amount * (rate / 12) * months;
  }

  if (mode === "quarterly") {
    total = amount * Math.pow(1 + rate / 4, months / 3);
  }

  if (mode === "yearly") {
    const fullYears = Math.floor(months / 12);
    const remainingMonths = months % 12;
    total =
      amount *
      Math.pow(1 + rate, fullYears) *
      (1 + (rate / 12) * remainingMonths);
  }

  if (mode === "maturity") {
    total = amount * Math.pow(1 + rate / 12, months);
  }

  const profit = total - amount;
  const monthlyPayment = mode === "monthly" ? (amount * rate) / 12 : 0;

  const effectiveAnnualRate =
    mode === "maturity"
      ? (Math.pow(1 + rate / 12, 12) - 1) * 100
      : mode === "quarterly"
        ? (Math.pow(1 + rate / 4, 4) - 1) * 100
        : annualRate;

  return {
    total,
    profit,
    endPayment: mode === "monthly" ? amount : total,
    interimIncome: mode === "monthly" ? profit : 0,
    monthlyPayment,
    effectiveAnnualRate,
  };
}

function formatMoney(value: number) {
  return `${moneyFormatter.format(Math.round(value))} сом`;
}

function formatShortMoney(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("ru-RU", {
      maximumFractionDigits: 2,
    })} млн`;
  }
  return `${Math.round(value / 1_000)} тыс.`;
}

function termLabel(months: number) {
  if (months === 6) return "6 месяцев";
  if (months === 12) return "1 год";
  return `${months / 12} года`;
}

export default function Home() {
  const [amount, setAmount] = useState(2_000_000);
  const [annualRate, setAnnualRate] = useState(24);
  const [months, setMonths] = useState<number>(36);
  const [mode, setMode] = useState<ModeId>("maturity");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const amountParam = Number(params.get("amount"));
    const rateParam = Number(params.get("rate"));
    const termParam = Number(params.get("term"));
    const modeParam = params.get("mode") as ModeId | null;

    if (Number.isFinite(amountParam) && amountParam > 0) {
      setAmount(clamp(amountParam, MIN_AMOUNT, MAX_AMOUNT));
    }
    if (Number.isFinite(rateParam) && rateParam > 0) {
      setAnnualRate(clamp(rateParam, 18, 36));
    }
    if (TERMS.includes(termParam as (typeof TERMS)[number])) {
      setMonths(termParam);
    }
    if (MODES.some((item) => item.id === modeParam)) {
      setMode(modeParam as ModeId);
    }
  }, []);

  const result = useMemo(
    () => calculate(amount, annualRate, months, mode),
    [amount, annualRate, months, mode],
  );

  const comparisons = useMemo(
    () =>
      MODES.map((item) => ({
        ...item,
        result: calculate(amount, annualRate, months, item.id),
      })),
    [amount, annualRate, months],
  );

  const horizons = useMemo(
    () =>
      TERMS.map((term) => ({
        months: term,
        result: calculate(amount, annualRate, term, mode),
      })),
    [amount, annualRate, mode],
  );

  const standard = comparisons.find((item) => item.id === "monthly")!.result;
  const maxGrowth = comparisons.find((item) => item.id === "maturity")!.result;
  const maxProfit = Math.max(...comparisons.map((item) => item.result.profit));
  const selectedMode = MODES.find((item) => item.id === mode)!;
  const advantage = result.profit - standard.profit;

  async function copyCalculation() {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({
      amount: String(Math.round(amount)),
      rate: String(annualRate),
      term: String(months),
      mode,
    }).toString();

    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.history.replaceState({}, "", url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="К началу калькулятора">
          <span className="brand-mark" aria-hidden="true">И</span>
          <span>
            <strong>ИнвестКапитал</strong>
            <small>калькулятор для инвестиционного отдела</small>
          </span>
        </a>
        <div className="topbar-note">
          <span className="status-dot" /> Расчёт обновляется автоматически
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Сложный процент — наглядно</p>
          <h1>Покажите инвестору силу долгого капитала</h1>
          <p className="hero-text">
            Чем больше тело и дольше доход остаётся в работе, тем заметнее
            проценты начинают приносить новые проценты.
          </p>
        </div>
        <div className="hero-principle">
          <span>Главный принцип</span>
          <strong>Не изымать доход — дать ему расти</strong>
        </div>
      </section>

      <section className="calculator-grid" aria-label="Инвестиционный калькулятор">
        <div className="control-panel">
          <div className="panel-heading">
            <span className="step-number">01</span>
            <div>
              <p className="section-kicker">Параметры</p>
              <h2>Настройте расчёт</h2>
            </div>
          </div>

          <div className="field-block">
            <label htmlFor="amount">Сумма инвестиций</label>
            <div className="input-with-unit">
              <input
                id="amount"
                type="number"
                min={MIN_AMOUNT}
                max={MAX_AMOUNT}
                step={100_000}
                value={amount}
                onChange={(event) =>
                  setAmount(clamp(Number(event.target.value), MIN_AMOUNT, MAX_AMOUNT))
                }
              />
              <span>сом</span>
            </div>
            <input
              className="range-input"
              aria-label="Сумма инвестиций от 500 тысяч до 10 миллионов сом"
              type="range"
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              step={100_000}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
            />
            <div className="range-labels">
              <span>500 000</span>
              <span>10 000 000 сом</span>
            </div>
          </div>

          <div className="field-block">
            <label htmlFor="rate">Годовая ставка</label>
            <div className="input-with-unit rate-input">
              <input
                id="rate"
                type="number"
                min={18}
                max={36}
                step={0.5}
                value={annualRate}
                onChange={(event) =>
                  setAnnualRate(clamp(Number(event.target.value), 18, 36))
                }
              />
              <span>%</span>
            </div>
            <input
              className="range-input"
              aria-label="Годовая ставка от 18 до 36 процентов"
              type="range"
              min={18}
              max={36}
              step={0.5}
              value={annualRate}
              onChange={(event) => setAnnualRate(Number(event.target.value))}
            />
            <div className="range-labels">
              <span>18%</span>
              <span>36%</span>
            </div>
          </div>

          <fieldset className="field-block">
            <legend>Срок займа</legend>
            <div className="term-options">
              {TERMS.map((term) => (
                <button
                  key={term}
                  type="button"
                  className={months === term ? "active" : ""}
                  onClick={() => setMonths(term)}
                  aria-pressed={months === term}
                >
                  {termLabel(term)}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="field-block mode-field">
            <legend>Как получать доход</legend>
            <div className="mode-options">
              {MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={mode === item.id ? "mode-card active" : "mode-card"}
                  onClick={() => setMode(item.id)}
                  aria-pressed={mode === item.id}
                >
                  <span className="radio-dot" aria-hidden="true" />
                  <span className="mode-copy">
                    <strong>{item.short}</strong>
                    <small>{item.description}</small>
                  </span>
                  {item.badge && <span className="mode-badge">{item.badge}</span>}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <aside className="result-panel" aria-live="polite">
          <div className="result-topline">
            <span>Результат</span>
            <span>{termLabel(months)} · {selectedMode.short.toLowerCase()}</span>
          </div>

          <div className="primary-result">
            <p>Итог инвестора</p>
            <strong>{formatMoney(result.total)}</strong>
            <span>
              Тело {formatShortMoney(amount)} + доход {formatShortMoney(result.profit)}
            </span>
          </div>

          <div className="result-stats">
            <div>
              <span>Чистый доход</span>
              <strong>+{formatMoney(result.profit)}</strong>
            </div>
            <div>
              <span>Эффективно за год</span>
              <strong>{percentFormatter.format(result.effectiveAnnualRate)}%</strong>
            </div>
            <div>
              <span>Коэффициент роста</span>
              <strong>×{(result.total / amount).toFixed(2)}</strong>
            </div>
          </div>

          {mode === "monthly" ? (
            <div className="payment-note">
              <span>Ежемесячная выплата</span>
              <strong>{formatMoney(result.monthlyPayment)}</strong>
              <small>
                За срок выплачено {formatMoney(result.interimIncome)}, в конце
                возвращается тело {formatMoney(result.endPayment)}.
              </small>
            </div>
          ) : (
            <div className="payment-note accent-note">
              <span>Единая выплата в конце</span>
              <strong>{formatMoney(result.endPayment)}</strong>
              <small>Весь доход остаётся в работе до погашения займа.</small>
            </div>
          )}

          <div className="benefit-note">
            <span aria-hidden="true">↗</span>
            <p>
              {advantage > 1 ? (
                <>
                  Капитализация добавит <strong>{formatMoney(advantage)}</strong> к
                  доходу по сравнению с ежемесячным изъятием процентов.
                </>
              ) : (
                <>
                  При этом сроке итог равен простому доходу. Более частая
                  капитализация раскрывается на длинном горизонте.
                </>
              )}
            </p>
          </div>

          <button className="share-button" type="button" onClick={copyCalculation}>
            {copied ? "Ссылка на расчёт скопирована" : "Скопировать ссылку на расчёт"}
            <span aria-hidden="true">→</span>
          </button>
        </aside>
      </section>

      <section className="comparison-section">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Сравнение стратегий</p>
            <h2>Когда проценты остаются в работе</h2>
          </div>
          <p>
            Одинаковые сумма, ставка и срок — отличается только способ выплаты.
          </p>
        </div>

        <div className="comparison-list">
          {comparisons.map((item, index) => (
            <button
              type="button"
              key={item.id}
              className={mode === item.id ? "comparison-row active" : "comparison-row"}
              onClick={() => setMode(item.id)}
            >
              <span className="comparison-index">0{index + 1}</span>
              <span className="comparison-name">
                <strong>{item.title}</strong>
                <small>Доход {formatMoney(item.result.profit)}</small>
              </span>
              <span className="bar-track" aria-hidden="true">
                <span
                  className="bar-fill"
                  style={{ width: `${Math.max(10, (item.result.profit / maxProfit) * 100)}%` }}
                />
              </span>
              <span className="comparison-total">{formatMoney(item.result.total)}</span>
            </button>
          ))}
        </div>

        <div className="max-growth-callout">
          <div>
            <span>Потенциал без изъятия процентов</span>
            <strong>
              +{formatMoney(maxGrowth.profit - standard.profit)} сверх стандарта
            </strong>
          </div>
          <p>
            На сроке {termLabel(months)} ежемесячная капитализация превращает
            номинальные {annualRate}% в {percentFormatter.format(maxGrowth.effectiveAnnualRate)}%
            эффективных годовых.
          </p>
        </div>
      </section>

      <section className="horizon-section">
        <div className="horizon-copy">
          <p className="section-kicker">Горизонт инвестора</p>
          <h2>Долгий срок усиливает результат</h2>
          <p>
            Сравните одну и ту же сумму в выбранном режиме. После каждого цикла
            капитализация работает уже на увеличенное тело.
          </p>
          <div className="formula-card">
            <span>Формула выбранного сценария</span>
            <strong>
              {mode === "monthly"
                ? "Тело + ставка × срок"
                : mode === "quarterly"
                  ? "Тело × (1 + ставка / 4)ⁿ"
                  : mode === "yearly"
                    ? "Тело × (1 + ставка)ⁿ"
                    : "Тело × (1 + ставка / 12)ⁿ"}
            </strong>
          </div>
        </div>

        <div className="horizon-table" role="table" aria-label="Сравнение срока инвестиции">
          <div className="horizon-row horizon-header" role="row">
            <span role="columnheader">Срок</span>
            <span role="columnheader">Доход</span>
            <span role="columnheader">Итог</span>
          </div>
          {horizons.map((item) => (
            <button
              key={item.months}
              type="button"
              className={months === item.months ? "horizon-row active" : "horizon-row"}
              onClick={() => setMonths(item.months)}
              role="row"
            >
              <span role="cell">{termLabel(item.months)}</span>
              <strong role="cell">+{formatMoney(item.result.profit)}</strong>
              <span role="cell">{formatMoney(item.result.total)}</span>
            </button>
          ))}
        </div>
      </section>

      <footer>
        <p>
          Предварительный финансовый расчёт. Фактические выплаты определяются
          договором займа и графиком начислений.
        </p>
        <span>Валюта расчёта: кыргызский сом (KGS)</span>
      </footer>
    </main>
  );
}
