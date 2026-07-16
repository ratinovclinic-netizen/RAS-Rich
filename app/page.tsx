"use client";

import { useEffect, useMemo, useState } from "react";

type ModeId = "monthly" | "quarterly" | "yearly" | "maturity";
type GoalId = "car" | "home" | "education" | "security" | "business" | "freedom";

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

const AMOUNT_TIERS = [
  { min: 500_000, rate: 18, label: "от 500 000 сом" },
  { min: 1_000_000, rate: 20, label: "от 1 000 000 сом" },
  { min: 2_000_000, rate: 22, label: "от 2 000 000 сом" },
  { min: 3_000_000, rate: 24, label: "от 3 000 000 сом" },
  { min: 5_000_000, rate: 26, label: "от 5 000 000 сом" },
  { min: 7_000_000, rate: 28, label: "от 7 000 000 сом" },
  { min: 10_000_000, rate: 30, label: "10 000 000 сом" },
] as const;

const TERM_BONUS: Record<number, number> = {
  6: 0,
  12: 2,
  24: 4,
  36: 6,
};

const GOALS: Array<{
  id: GoalId;
  icon: string;
  title: string;
  description: string;
  defaultTarget: number;
}> = [
  {
    id: "car",
    icon: "🚙",
    title: "Автомобиль",
    description: "Новая машина без потери основного капитала",
    defaultTarget: 3_000_000,
  },
  {
    id: "home",
    icon: "🏠",
    title: "Квартира",
    description: "Первоначальный взнос или собственное жильё",
    defaultTarget: 8_000_000,
  },
  {
    id: "education",
    icon: "🎓",
    title: "Учёба детям",
    description: "Образование и сильный старт для семьи",
    defaultTarget: 2_500_000,
  },
  {
    id: "security",
    icon: "🛡️",
    title: "Запас для семьи",
    description: "Финансовая защита и уверенность в будущем",
    defaultTarget: 4_000_000,
  },
  {
    id: "business",
    icon: "🚀",
    title: "Свой бизнес",
    description: "Капитал для запуска или расширения дела",
    defaultTarget: 5_000_000,
  },
  {
    id: "freedom",
    icon: "🌿",
    title: "Свободный капитал",
    description: "Деньги, которые дают больше вариантов",
    defaultTarget: 10_000_000,
  },
];

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

function getAutomaticRate(amount: number, months: number) {
  const amountTier = [...AMOUNT_TIERS]
    .reverse()
    .find((tier) => amount >= tier.min) ?? AMOUNT_TIERS[0];
  const termBonus = TERM_BONUS[months] ?? 0;

  return {
    baseRate: amountTier.rate,
    termBonus,
    totalRate: Math.min(36, amountTier.rate + termBonus),
    amountTier,
  };
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
  const [months, setMonths] = useState<number>(36);
  const [mode, setMode] = useState<ModeId>("maturity");
  const [copied, setCopied] = useState(false);
  const [clientName, setClientName] = useState("");
  const [goalId, setGoalId] = useState<GoalId>("home");
  const [goalAmount, setGoalAmount] = useState(8_000_000);

  const rateDetails = getAutomaticRate(amount, months);
  const annualRate = rateDetails.totalRate;
  const selectedGoal = GOALS.find((item) => item.id === goalId)!;
  const nextAmountTier = AMOUNT_TIERS.find((tier) => tier.min > amount);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const amountParam = Number(params.get("amount"));
    const termParam = Number(params.get("term"));
    const modeParam = params.get("mode") as ModeId | null;
    const goalParam = params.get("goal") as GoalId | null;
    const targetParam = Number(params.get("target"));
    const nameParam = params.get("name");

    if (Number.isFinite(amountParam) && amountParam > 0) {
      setAmount(clamp(amountParam, MIN_AMOUNT, MAX_AMOUNT));
    }
    if (TERMS.includes(termParam as (typeof TERMS)[number])) {
      setMonths(termParam);
    }
    if (MODES.some((item) => item.id === modeParam)) {
      setMode(modeParam as ModeId);
    }
    if (GOALS.some((item) => item.id === goalParam)) {
      setGoalId(goalParam as GoalId);
    }
    if (Number.isFinite(targetParam) && targetParam > 0) {
      setGoalAmount(targetParam);
    }
    if (nameParam) {
      setClientName(nameParam.slice(0, 80));
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
        rate: getAutomaticRate(amount, term).totalRate,
        result: calculate(amount, getAutomaticRate(amount, term).totalRate, term, mode),
      })),
    [amount, mode],
  );

  const standard = comparisons.find((item) => item.id === "monthly")!.result;
  const maxGrowth = comparisons.find((item) => item.id === "maturity")!.result;
  const maxProfit = Math.max(...comparisons.map((item) => item.result.profit));
  const selectedMode = MODES.find((item) => item.id === mode)!;
  const advantage = result.profit - standard.profit;
  const goalProgress = goalAmount > 0 ? (result.total / goalAmount) * 100 : 0;
  const goalDifference = result.total - goalAmount;
  const profitGoalShare = goalAmount > 0 ? (result.profit / goalAmount) * 100 : 0;

  async function copyCalculation() {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({
      amount: String(Math.round(amount)),
      term: String(months),
      mode,
      goal: goalId,
      target: String(Math.round(goalAmount)),
      ...(clientName.trim() ? { name: clientName.trim() } : {}),
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

  function selectGoal(id: GoalId) {
    const goal = GOALS.find((item) => item.id === id)!;
    setGoalId(id);
    setGoalAmount(goal.defaultTarget);
  }

  function printProposal() {
    window.print();
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

          <div className="field-block automatic-rate-block">
            <div className="automatic-rate-heading">
              <div>
                <span>Ставка по выбранным условиям</span>
                <strong>{annualRate}% годовых</strong>
              </div>
              <span className="locked-rate">Назначена автоматически</span>
            </div>
            <div className="rate-breakdown">
              <div>
                <span>За сумму</span>
                <strong>{rateDetails.baseRate}%</strong>
                <small>{rateDetails.amountTier.label}</small>
              </div>
              <span className="rate-plus">+</span>
              <div>
                <span>За срок</span>
                <strong>{rateDetails.termBonus}%</strong>
                <small>{termLabel(months)}</small>
              </div>
              <span className="rate-equals">=</span>
              <div className="rate-total">
                <span>Итого</span>
                <strong>{annualRate}%</strong>
                <small>фиксировано условиями</small>
              </div>
            </div>
            <p className="rate-hint">
              {nextAmountTier
                ? `При сумме от ${moneyFormatter.format(nextAmountTier.min)} сом базовая ставка вырастет до ${nextAmountTier.rate}%. Длинный срок добавляет до 6%.`
                : "Вы выбрали максимальную сумму. Срок 3 года открывает максимальную ставку 36%."}
            </p>
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
            <span role="columnheader">Ставка</span>
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
              <span role="cell">{item.rate}%</span>
              <strong role="cell">+{formatMoney(item.result.profit)}</strong>
              <span role="cell">{formatMoney(item.result.total)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="proposal-section" id="proposal">
        <div className="proposal-intro no-print">
          <div>
            <p className="section-kicker">Персональный оффер</p>
            <h2>Свяжите расчёт с настоящей целью</h2>
            <p>
              Заполните имя, выберите цель и её стоимость. Готовое предложение
              можно распечатать или сохранить в PDF и передать инвестору.
            </p>
          </div>

          <div className="proposal-controls">
            <label className="proposal-name-field">
              <span>Имя инвестора</span>
              <input
                type="text"
                value={clientName}
                maxLength={80}
                placeholder="Например, Азамат"
                onChange={(event) => setClientName(event.target.value)}
              />
            </label>

            <fieldset className="goal-fieldset">
              <legend>Ради чего работает капитал</legend>
              <div className="goal-options">
                {GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    className={goalId === goal.id ? "goal-card active" : "goal-card"}
                    onClick={() => selectGoal(goal.id)}
                    aria-pressed={goalId === goal.id}
                  >
                    <span className="goal-icon" aria-hidden="true">{goal.icon}</span>
                    <span>
                      <strong>{goal.title}</strong>
                      <small>{goal.description}</small>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="proposal-target-field">
              <span>Стоимость цели — ориентир можно изменить</span>
              <div className="input-with-unit">
                <input
                  type="number"
                  min={100_000}
                  step={100_000}
                  value={goalAmount}
                  onChange={(event) =>
                    setGoalAmount(Math.max(100_000, Number(event.target.value)))
                  }
                />
                <span>сом</span>
              </div>
            </label>
          </div>
        </div>

        <article className="proposal-sheet">
          <header className="proposal-header">
            <div className="proposal-brand">
              <span className="brand-mark" aria-hidden="true">И</span>
              <span>
                <strong>ИнвестКапитал</strong>
                <small>Персональное инвестиционное предложение</small>
              </span>
            </div>
            <span className="proposal-status">Предварительный расчёт</span>
          </header>

          <div className="proposal-title">
            <p>{clientName.trim() ? `Для ${clientName.trim()}` : "Для будущего инвестора"}</p>
            <h2>Ваш капитал может стать реальным шагом к цели «{selectedGoal.title}»</h2>
            <span>
              Вы не просто размещаете деньги под процент. Вы даёте капиталу
              {` ${termLabel(months)} `}на рост и заранее понимаете, какой результат он создаёт.
            </span>
          </div>

          <div className="goal-progress-card">
            <div className="goal-progress-copy">
              <span className="proposal-goal-icon" aria-hidden="true">{selectedGoal.icon}</span>
              <div>
                <small>Ваша цель</small>
                <strong>{selectedGoal.title}</strong>
                <span>{selectedGoal.description}</span>
              </div>
            </div>
            <div className="goal-progress-number">
              <strong>{percentFormatter.format(goalProgress)}%</strong>
              <span>цели покрывает итоговый капитал</span>
            </div>
            <div className="goal-progress-track" aria-hidden="true">
              <span style={{ width: `${Math.min(100, Math.max(2, goalProgress))}%` }} />
            </div>
            <div className="goal-progress-values">
              <span>Итог: {formatMoney(result.total)}</span>
              <span>Цель: {formatMoney(goalAmount)}</span>
            </div>
          </div>

          <div className="proposal-metrics">
            <div>
              <span>Инвестиция</span>
              <strong>{formatMoney(amount)}</strong>
            </div>
            <div>
              <span>Фиксированная ставка</span>
              <strong>{annualRate}% годовых</strong>
            </div>
            <div>
              <span>Срок работы капитала</span>
              <strong>{termLabel(months)}</strong>
            </div>
            <div className="proposal-profit-metric">
              <span>Расчётный доход</span>
              <strong>+{formatMoney(result.profit)}</strong>
            </div>
          </div>

          <div className="proposal-story-grid">
            <div className="proposal-value-story">
              <p className="proposal-label">Что этот результат даёт лично вам</p>
              {goalDifference >= 0 ? (
                <>
                  <h3>Цель полностью покрывается расчётным капиталом</h3>
                  <p>
                    После достижения ориентира «{selectedGoal.title}» остаётся запас
                    <strong> {formatMoney(goalDifference)}</strong>. Деньги получают
                    понятное назначение, а решение — измеримый результат.
                  </p>
                </>
              ) : (
                <>
                  <h3>Один договор закрывает {percentFormatter.format(goalProgress)}% цели</h3>
                  <p>
                    До выбранного ориентира останется {formatMoney(Math.abs(goalDifference))},
                    а один только расчётный доход формирует
                    <strong> {percentFormatter.format(profitGoalShare)}% стоимости цели</strong>.
                  </p>
                </>
              )}
            </div>

            <div className="proposal-terms-card">
              <p className="proposal-label">Зафиксированный сценарий</p>
              <ul>
                <li><span>Сумма</span><strong>{formatMoney(amount)}</strong></li>
                <li><span>Ставка</span><strong>{annualRate}% — по сумме и сроку</strong></li>
                <li><span>Доход</span><strong>{selectedMode.title.toLowerCase()}</strong></li>
                <li><span>Итог инвестора</span><strong>{formatMoney(result.total)}</strong></li>
              </ul>
            </div>
          </div>

          <div className="proposal-recommendation">
            <span>Рекомендация для роста капитала</span>
            {mode === "maturity" ? (
              <p>
                Выбран сильнейший сценарий: проценты не изымаются, ежемесячно
                увеличивают тело и выплачиваются в конце срока. Так время работает
                на вашу цель без дополнительных вложений.
              </p>
            ) : (
              <p>
                Если оставить весь доход до конца срока, итог может вырасти до
                <strong> {formatMoney(maxGrowth.total)}</strong> — это на
                <strong> {formatMoney(maxGrowth.total - result.total)}</strong> больше
                текущего сценария выплат.
              </p>
            )}
          </div>

          <div className="proposal-closing">
            <div>
              <span>Следующий разумный шаг</span>
              <strong>Сохранить расчёт и обсудить договор с менеджером</strong>
              <p>
                Финальные условия, порядок выплат и обязательства сторон фиксируются
                в договоре займа. Этот документ помогает принять решение на цифрах.
              </p>
            </div>
            <div className="proposal-signatures">
              <span>Инвестор ____________________</span>
              <span>Менеджер ____________________</span>
            </div>
          </div>

          <div className="proposal-actions no-print">
            <button className="print-button" type="button" onClick={printProposal}>
              Печать / сохранить в PDF <span aria-hidden="true">↗</span>
            </button>
            <button className="secondary-share-button" type="button" onClick={copyCalculation}>
              {copied ? "Ссылка скопирована" : "Скопировать ссылку на расчёт"}
            </button>
          </div>
        </article>
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
