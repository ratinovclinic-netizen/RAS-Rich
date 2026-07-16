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
    short: "Получать каждый месяц",
    title: "Проценты каждый месяц",
    description: "Получили проценты — они больше не растут.",
    badge: "Деньги сейчас",
  },
  {
    id: "yearly",
    short: "Добавлять раз в год",
    title: "Проценты прибавляются раз в год",
    description: "Раз в год доход прибавляется к вашим деньгам.",
  },
  {
    id: "quarterly",
    short: "Добавлять раз в квартал",
    title: "Рост каждые 3 месяца",
    description: "Доход прибавляется 4 раза в год и растёт быстрее.",
  },
  {
    id: "maturity",
    short: "Оставить до конца",
    title: "Максимум сложного процента",
    description: "Проценты прибавляются каждый месяц. Самый большой итог.",
    badge: "Самый большой итог",
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

  const standard = comparisons.find((item) => item.id === "monthly")!.result;
  const maxGrowth = comparisons.find((item) => item.id === "maturity")!.result;
  const selectedMode = MODES.find((item) => item.id === mode)!;
  const retentionGain = maxGrowth.profit - standard.profit;
  const goalProgress = goalAmount > 0 ? (result.total / goalAmount) * 100 : 0;
  const goalDifference = result.total - goalAmount;
  const profitGoalShare = goalAmount > 0 ? (result.profit / goalAmount) * 100 : 0;
  const purchaseExamples = useMemo(() => {
    const alternatives = GOALS.filter((item) => item.id !== goalId).sort(
      (a, b) =>
        Math.abs(a.defaultTarget - result.total) -
        Math.abs(b.defaultTarget - result.total),
    );

    return [selectedGoal, ...alternatives.slice(0, 2)].map((goal) => ({
      ...goal,
      totalCoverage: (result.total / goal.defaultTarget) * 100,
      profitCoverage: (result.profit / goal.defaultTarget) * 100,
    }));
  }, [goalId, result.profit, result.total, selectedGoal]);

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

  async function shareProposal() {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({
      amount: String(Math.round(amount)),
      term: String(months),
      mode,
      goal: goalId,
      target: String(Math.round(goalAmount)),
      ...(clientName.trim() ? { name: clientName.trim() } : {}),
    }).toString();

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Персональное предложение ИнвестКапитал",
          text: `${clientName.trim() || "Инвестор"}: ${formatMoney(amount)} на ${termLabel(months)}, итог ${formatMoney(result.total)}.`,
          url: url.toString(),
        });
        return;
      } catch {
        return;
      }
    }

    await copyCalculation();
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="К началу калькулятора">
          <span className="brand-mark" aria-hidden="true">И</span>
          <span>
            <strong>ИнвестКапитал</strong>
            <small>персональный расчёт для инвестора</small>
          </span>
        </a>
        <div className="topbar-note">
          <span className="status-dot" /> Ваш расчёт обновляется автоматически
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Ваш капитал — ваш будущий результат</p>
          <h1>Узнайте, сколько заработает ваш капитал</h1>
          <p className="hero-text">
            Выберите сумму и срок — и сразу увидите, почему выгоднее оставить
            проценты работать, увеличить капитал и быстрее приблизиться к своей цели.
          </p>
        </div>
        <div className="hero-principle">
          <span>Ваша стратегия роста</span>
          <strong>Не забирать проценты сейчас — получить больше в будущем</strong>
        </div>
      </section>

      <section className="calculator-grid" aria-label="Инвестиционный калькулятор">
        <div className="control-panel">
          <div className="panel-heading">
            <span className="step-number">01</span>
            <div>
              <p className="section-kicker">Ваши условия</p>
              <h2>Выберите сумму и срок</h2>
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
            <legend>Когда вы хотите получить проценты?</legend>
            <p className="mode-lead">
              Начальная сумма везде одинаковая. Чем чаще проценты прибавляются
              к ней, тем больше денег получается в конце.
            </p>

            <div className="retention-comparison">
              <div className="withdraw-now-card">
                <span>Получать проценты сейчас</span>
                <strong>{formatMoney(standard.total)}</strong>
                <small>
                  {formatMoney(amount)} ваших денег + {formatMoney(standard.profit)} дохода
                </small>
              </div>
              <div className="retain-income-card">
                <span>Оставить проценты работать</span>
                <strong>{formatMoney(maxGrowth.total)}</strong>
                <small>
                  {formatMoney(amount)} ваших денег + {formatMoney(maxGrowth.profit)} дохода
                </small>
              </div>
            </div>

            <div className="retention-message">
              <span aria-hidden="true">+</span>
              <p>
                Простая разница: если подождать, вы получите ещё
                <strong> {formatMoney(retentionGain)}</strong>. Эти деньги появляются,
                потому что проценты сами приносят новые проценты.
              </p>
            </div>

            <div className="growth-order">
              <span>Меньше</span>
              <strong>Варианты от меньшего итога к большему</strong>
              <span>Больше</span>
            </div>

            <div className="mode-options">
              {MODES.map((item, index) => {
                const itemResult = comparisons.find((entry) => entry.id === item.id)!.result;
                const extraIncome = itemResult.profit - standard.profit;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`mode-card ${item.id === "monthly" ? "withdrawal-mode" : "growth-mode"} ${mode === item.id ? "active" : ""}`}
                    onClick={() => setMode(item.id)}
                    aria-pressed={mode === item.id}
                  >
                    <span className="radio-dot" aria-hidden="true" />
                    <span className="mode-copy">
                      <span className="mode-order">Вариант {index + 1}</span>
                      <strong>{item.short}</strong>
                      <small>{item.description}</small>
                      <span className="mode-result-label">Вы получите всего</span>
                      <span className="mode-result">{formatMoney(itemResult.total)}</span>
                      <span className="mode-profit">Ваш доход: +{formatMoney(itemResult.profit)}</span>
                      {extraIncome > 1 && (
                        <span className="mode-extra">На {formatMoney(extraIncome)} больше варианта 1</span>
                      )}
                    </span>
                    {item.badge && <span className="mode-badge">{item.badge}</span>}
                  </button>
                );
              })}
            </div>

            <p className="frequency-explanation">
              Почему квартал даёт больше, чем год? Потому что проценты
              прибавляются к вашим деньгам чаще: 4 раза в год вместо 1 раза.
            </p>
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
              {mode === "maturity" ? (
                <>
                  Вы сохраняете в капитале ещё <strong>{formatMoney(retentionGain)}</strong>,
                  которое теряется при ежемесячном изъятии процентов.
                </>
              ) : (
                <>
                  Если оставить проценты до конца срока, итог будет выше ещё на
                  <strong> {formatMoney(maxGrowth.profit - result.profit)}</strong>.
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

      <section className="proposal-section" id="proposal">
        <div className="proposal-intro no-print">
          <div>
            <p className="section-kicker">Готовый оффер</p>
            <h2>Индивидуальный результат</h2>
            <p>Имя, цель и все примеры ниже меняются вместе с расчётом.</p>
          </div>

          <div className="proposal-controls compact-proposal-controls">
            <label className="proposal-name-field">
              <span>Инвестор</span>
              <input
                type="text"
                value={clientName}
                maxLength={80}
                placeholder="Имя"
                onChange={(event) => setClientName(event.target.value)}
              />
            </label>

            <fieldset className="goal-fieldset">
              <legend>Главная цель</legend>
              <div className="goal-options compact-goals">
                {GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    className={goalId === goal.id ? "goal-card active" : "goal-card"}
                    onClick={() => selectGoal(goal.id)}
                    aria-pressed={goalId === goal.id}
                  >
                    <span className="goal-icon" aria-hidden="true">{goal.icon}</span>
                    <strong>{goal.title}</strong>
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="proposal-target-field">
              <span>Ориентир цели</span>
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
            <h2>{formatMoney(amount)} начинают работать на цель «{selectedGoal.title}»</h2>
            <span>
              Срок {termLabel(months)}, фиксированная ставка {annualRate}% годовых,
              выбранный способ — {selectedMode.short.toLowerCase()}.
            </span>
          </div>

          <div className="proposal-metrics">
            <div>
              <span>Вложение</span>
              <strong>{formatMoney(amount)}</strong>
            </div>
            <div>
              <span>Расчётный доход</span>
              <strong>+{formatMoney(result.profit)}</strong>
            </div>
            <div>
              <span>Итоговый капитал</span>
              <strong>{formatMoney(result.total)}</strong>
            </div>
            <div className="proposal-profit-metric">
              <span>Рост капитала</span>
              <strong>+{percentFormatter.format((result.profit / amount) * 100)}%</strong>
            </div>
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

          <div className="purchase-section">
            <div className="purchase-section-heading">
              <div>
                <p className="proposal-label">Что дают эти деньги</p>
                <h3>Примеры на языке жизненных целей</h3>
              </div>
              <small>Ориентиры можно изменить перед печатью</small>
            </div>
            <div className="purchase-example-grid">
              {purchaseExamples.map((example) => (
                <div className="purchase-example" key={example.id}>
                  <span className="purchase-example-icon" aria-hidden="true">{example.icon}</span>
                  <strong>{example.title}</strong>
                  <span>
                    {example.totalCoverage >= 100
                      ? `Итог покрывает ориентир полностью и оставляет ${formatMoney(result.total - example.defaultTarget)}`
                      : `Итоговый капитал покрывает ${percentFormatter.format(example.totalCoverage)}% ориентира`}
                  </span>
                  <small>
                    Только заработанный доход — {percentFormatter.format(example.profitCoverage)}% цели
                  </small>
                </div>
              ))}
            </div>
          </div>

          <div className="compact-offer-summary">
            <div>
              <p className="proposal-label">Персональное предложение</p>
              {goalDifference >= 0 ? (
                <h3>
                  Цель «{selectedGoal.title}» покрыта. Запас — {formatMoney(goalDifference)}.
                </h3>
              ) : (
                <h3>
                  Расчёт формирует {percentFormatter.format(goalProgress)}% цели.
                  Останется {formatMoney(Math.abs(goalDifference))}.
                </h3>
              )}
              <p>
                Один только доход создаёт {percentFormatter.format(profitGoalShare)}%
                стоимости выбранной цели.
              </p>
            </div>
            <ul>
              <li><span>Ставка</span><strong>{annualRate}% годовых</strong></li>
              <li><span>Срок</span><strong>{termLabel(months)}</strong></li>
              <li><span>Выплата</span><strong>{selectedMode.short}</strong></li>
              <li><span>Итог</span><strong>{formatMoney(result.total)}</strong></li>
            </ul>
          </div>

          <div className="proposal-recommendation compact-recommendation">
            <span>Рекомендация</span>
            <p>
              {mode === "maturity"
                ? `Проценты остаются в теле весь срок. Это сохраняет ${formatMoney(retentionGain)}, которое теряется при ежемесячном изъятии.`
                : `Если не забирать проценты до конца срока, итог вырастет ещё на ${formatMoney(maxGrowth.total - result.total)} — до ${formatMoney(maxGrowth.total)}.`}
            </p>
          </div>

          <div className="proposal-closing compact-closing">
            <div className="proposal-signatures">
              <span>Инвестор ____________________</span>
              <span>Менеджер ____________________</span>
            </div>
            <p>
              Предварительный расчёт. Финальные условия, порядок начислений и
              обязательства сторон фиксируются в договоре займа.
            </p>
          </div>

          <div className="proposal-actions no-print">
            <button className="print-button" type="button" onClick={printProposal}>
              Печать / сохранить в PDF <span aria-hidden="true">↗</span>
            </button>
            <button className="secondary-share-button" type="button" onClick={shareProposal}>
              Отправить предложение
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
