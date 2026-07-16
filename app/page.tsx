"use client";

import { useEffect, useMemo, useState } from "react";

type ModeId = "monthly" | "quarterly" | "yearly" | "maturity";
type ProductId = "fixed" | "clinic" | "equity";
type ClinicScenarioId = "minimum" | "base" | "achievable";
type EquityScenarioId = "minimum" | "base" | "maximum";
type GoalId =
  | "preserve"
  | "car"
  | "home"
  | "education"
  | "security"
  | "business"
  | "freedom";

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
const INFLATION_RATE = 10.9;
const APARTMENT_PRICE = 7_000_000;
const DOWN_PAYMENT_SHARE = 0.3;
const CLINIC_SHARE_PRICE = 800_000;
const CLINIC_USD_RATE = 87.5;
const EQUITY_MIN_RETURN = 14;
const TOTAL_HOLDING_SHARES = 1_000_000;
const PREFERRED_SHARES_FOR_SALE = 300_000;
const CURRENT_SHARE_PRICE_USD = 25;
const TARGET_SHARE_PRICE_USD = 150;
const TERMS = [6, 12, 24, 36] as const;

const HOLDING_CLINICS_BY_YEAR: Record<number, number> = {
  1: 50,
  2: 1_000,
  3: 5_000,
};

const EQUITY_SCENARIOS: Array<{
  id: EquityScenarioId;
  title: string;
  equipmentUsd: number;
  turnoverSomMonth: number;
}> = [
  { id: "minimum", title: "Минимум", equipmentUsd: 40_000, turnoverSomMonth: 2_000_000 },
  { id: "base", title: "База", equipmentUsd: 120_000, turnoverSomMonth: 7_000_000 },
  { id: "maximum", title: "Потенциал", equipmentUsd: 200_000, turnoverSomMonth: 12_000_000 },
];

const CLINIC_SCENARIOS: Array<{
  id: ClinicScenarioId;
  title: string;
  netProfitYearUsd: number;
  note: string;
}> = [
  {
    id: "minimum",
    title: "Минимум",
    netProfitYearUsd: 88_824,
    note: "Фактическая средняя чистая прибыль Q1 2026",
  },
  {
    id: "base",
    title: "База",
    netProfitYearUsd: 144_000,
    note: "Базовый план зрелой клиники",
  },
  {
    id: "achievable",
    title: "Достижимо",
    netProfitYearUsd: 312_000,
    note: "Сценарий на уровне сильного периода",
  },
];

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
    id: "preserve",
    icon: "🧱",
    title: "Сохранить деньги",
    description: "Не дать инфляции уменьшить покупательную способность накоплений",
    defaultTarget: 2_000_000,
  },
  {
    id: "car",
    icon: "🚙",
    title: "Автомобиль",
    description: "Купить машину полностью или собрать первоначальный взнос",
    defaultTarget: 3_000_000,
  },
  {
    id: "home",
    icon: "🏠",
    title: "Квартира",
    description: "Первоначальный взнос, квартира или несколько объектов",
    defaultTarget: APARTMENT_PRICE,
  },
  {
    id: "education",
    icon: "🎓",
    title: "Учёба детям",
    description: "Оплатить образование детей без кредита и спешки",
    defaultTarget: 2_500_000,
  },
  {
    id: "security",
    icon: "🛡️",
    title: "Запас для семьи",
    description: "Не зависеть от одной зарплаты и неожиданных расходов",
    defaultTarget: 4_000_000,
  },
  {
    id: "business",
    icon: "🚀",
    title: "Свой бизнес",
    description: "Запустить или расширить дело без дорогого кредита",
    defaultTarget: 5_000_000,
  },
  {
    id: "freedom",
    icon: "🌿",
    title: "Пенсия и свобода",
    description: "Создать капитал, который даст выбор не работать из необходимости",
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

const usdFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundUp(value: number, step: number) {
  return Math.ceil(value / step) * step;
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

function formatUsd(value: number) {
  return usdFormatter.format(Math.round(value));
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
  const [product, setProduct] = useState<ProductId>("fixed");
  const [amount, setAmount] = useState(2_000_000);
  const [months, setMonths] = useState<number>(36);
  const [mode, setMode] = useState<ModeId>("maturity");
  const [clinicShare, setClinicShare] = useState(1);
  const [clinicScenarioId, setClinicScenarioId] = useState<ClinicScenarioId>("base");
  const [equityInvestmentUsd, setEquityInvestmentUsd] = useState(10_000);
  const [equityScenarioId, setEquityScenarioId] = useState<EquityScenarioId>("base");
  const [equityDividendGrowth, setEquityDividendGrowth] = useState(0);
  const [copied, setCopied] = useState(false);
  const [clientName, setClientName] = useState("");
  const [goalId, setGoalId] = useState<GoalId>("preserve");
  const [goalAmount, setGoalAmount] = useState(2_000_000);

  const rateDetails = getAutomaticRate(amount, months);
  const annualRate = rateDetails.totalRate;
  const selectedGoal = GOALS.find((item) => item.id === goalId)!;
  const nextAmountTier = AMOUNT_TIERS.find((tier) => tier.min > amount);

  /* URL-параметры восстанавливают сохранённый расчёт после первого рендера. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const amountParam = Number(params.get("amount"));
    const termParam = Number(params.get("term"));
    const modeParam = params.get("mode") as ModeId | null;
    const productParam = params.get("product") as ProductId | null;
    const clinicShareParam = Number(params.get("share"));
    const clinicScenarioParam = params.get("scenario") as ClinicScenarioId | null;
    const equityInvestmentParam = Number(params.get("stock"));
    const equityScenarioParam = params.get("equityScenario") as EquityScenarioId | null;
    const dividendGrowthParam = Number(params.get("dividendGrowth"));
    const goalParam = params.get("goal") as GoalId | null;
    const targetParam = Number(params.get("target"));
    const nameParam = params.get("name");

    if (Number.isFinite(amountParam) && amountParam > 0) {
      setAmount(clamp(amountParam, MIN_AMOUNT, MAX_AMOUNT));
    }
    if (productParam === "equity") {
      setMonths(36);
    } else if (TERMS.includes(termParam as (typeof TERMS)[number])) {
      setMonths(termParam);
    }
    if (MODES.some((item) => item.id === modeParam)) {
      setMode(modeParam as ModeId);
    }
    if (productParam === "fixed" || productParam === "clinic" || productParam === "equity") {
      setProduct(productParam);
    }
    if (Number.isFinite(clinicShareParam) && clinicShareParam > 0) {
      setClinicShare(clamp(Math.round(clinicShareParam), 1, 100));
    }
    if (CLINIC_SCENARIOS.some((item) => item.id === clinicScenarioParam)) {
      setClinicScenarioId(clinicScenarioParam as ClinicScenarioId);
    }
    if (Number.isFinite(equityInvestmentParam) && equityInvestmentParam > 0) {
      setEquityInvestmentUsd(clamp(
        Math.round(equityInvestmentParam / CURRENT_SHARE_PRICE_USD) * CURRENT_SHARE_PRICE_USD,
        CURRENT_SHARE_PRICE_USD,
        PREFERRED_SHARES_FOR_SALE * CURRENT_SHARE_PRICE_USD,
      ));
    }
    if (EQUITY_SCENARIOS.some((item) => item.id === equityScenarioParam)) {
      setEquityScenarioId(equityScenarioParam as EquityScenarioId);
    }
    if (Number.isFinite(dividendGrowthParam) && dividendGrowthParam >= 0) {
      setEquityDividendGrowth(clamp(dividendGrowthParam, 0, 50));
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
  /* eslint-enable react-hooks/set-state-in-effect */

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
  const clinicScenario = CLINIC_SCENARIOS.find((item) => item.id === clinicScenarioId)!;
  const clinicInvestment = clinicShare * CLINIC_SHARE_PRICE;
  const clinicProfitYearSom = clinicScenario.netProfitYearUsd * CLINIC_USD_RATE;
  const clinicAnnualIncome = clinicProfitYearSom * (clinicShare / 100);
  const clinicTermIncome = clinicAnnualIncome * (months / 12);
  const clinicTotalValue = clinicInvestment + clinicTermIncome;
  const clinicAnnualYield = (clinicAnnualIncome / clinicInvestment) * 100;
  const clinicPaybackYears = clinicAnnualIncome > 0
    ? clinicInvestment / clinicAnnualIncome
    : 0;

  const equityScenario = EQUITY_SCENARIOS.find((item) => item.id === equityScenarioId)!;
  const equityYears = 3;
  const equityShareCount = clamp(
    Math.floor(equityInvestmentUsd / CURRENT_SHARE_PRICE_USD),
    1,
    PREFERRED_SHARES_FOR_SALE,
  );
  const equityExactInvestmentUsd = equityShareCount * CURRENT_SHARE_PRICE_USD;
  const equityDividendGrowthRate = equityDividendGrowth / 100;
  const equityDividendYear1Usd = equityExactInvestmentUsd * (EQUITY_MIN_RETURN / 100);
  const equityDividendYear2Usd = equityDividendYear1Usd * (1 + equityDividendGrowthRate);
  const equityDividendYear3Usd = equityDividendYear2Usd * (1 + equityDividendGrowthRate);
  const equityTotalDividendsUsd = equityDividendYear1Usd
    + equityDividendYear2Usd
    + equityDividendYear3Usd;
  const equityTargetShareValueUsd = equityShareCount * TARGET_SHARE_PRICE_USD;
  const equityTotalUsd = equityTargetShareValueUsd + equityTotalDividendsUsd;
  const equityProfitUsd = equityTotalUsd - equityExactInvestmentUsd;
  const equityPriceCagr = (Math.pow(TARGET_SHARE_PRICE_USD / CURRENT_SHARE_PRICE_USD, 1 / 3) - 1) * 100;
  const holdingClinicCount = HOLDING_CLINICS_BY_YEAR[3];
  const holdingEquipmentRevenueUsd = holdingClinicCount * equityScenario.equipmentUsd;
  const holdingEquipmentProfitUsd = holdingEquipmentRevenueUsd * 0.6;
  let holdingRoyaltySom = 0;
  for (let year = 1; year <= 3; year += 1) {
    const clinics = HOLDING_CLINICS_BY_YEAR[year] ?? HOLDING_CLINICS_BY_YEAR[3];
    holdingRoyaltySom += clinics * equityScenario.turnoverSomMonth * 12 * 0.15;
  }
  const holdingRoyaltyUsd = holdingRoyaltySom / CLINIC_USD_RATE;
  const holdingCurrentValuationUsd = TOTAL_HOLDING_SHARES * CURRENT_SHARE_PRICE_USD;
  const holdingTargetValuationUsd = TOTAL_HOLDING_SHARES * TARGET_SHARE_PRICE_USD;
  const preferredOfferVolumeUsd = PREFERRED_SHARES_FOR_SALE * CURRENT_SHARE_PRICE_USD;

  const activeAmount = product === "fixed"
      ? amount
      : product === "clinic"
        ? clinicInvestment
      : equityExactInvestmentUsd * CLINIC_USD_RATE;
  const activeProfit = product === "fixed"
    ? result.profit
    : product === "clinic"
      ? clinicTermIncome
      : equityProfitUsd * CLINIC_USD_RATE;
  const activeTotal = product === "fixed"
    ? result.total
    : product === "clinic"
      ? clinicTotalValue
      : equityTotalUsd * CLINIC_USD_RATE;
  const activeAnnualRate = product === "fixed"
    ? annualRate
    : product === "clinic"
      ? clinicAnnualYield
      : EQUITY_MIN_RETURN;
  const effectiveGoalAmount = goalId === "preserve" ? activeAmount : goalAmount;
  const goalProgress = effectiveGoalAmount > 0
    ? (activeTotal / effectiveGoalAmount) * 100
    : 0;
  const goalDifference = activeTotal - effectiveGoalAmount;
  const profitGoalShare = effectiveGoalAmount > 0
    ? (activeProfit / effectiveGoalAmount) * 100
    : 0;

  const contributionMonths = Math.min(12, months);
  const monthlyGrowthRate = annualRate / 100 / 12;
  let contributionGrowthFactor = 0;
  for (let month = 1; month <= contributionMonths; month += 1) {
    contributionGrowthFactor += Math.pow(1 + monthlyGrowthRate, months - month);
  }

  const bestScenarioGap = Math.max(0, effectiveGoalAmount - maxGrowth.total);
  const requiredMonthlyTopUp = bestScenarioGap > 0
    ? roundUp(bestScenarioGap / contributionGrowthFactor, 1_000)
    : 0;
  const nextTierContribution = nextAmountTier
    ? nextAmountTier.min - amount
    : roundUp(amount * 0.1, 100_000);
  const suggestedTotalTopUp = bestScenarioGap > 0
    ? requiredMonthlyTopUp * contributionMonths
    : nextTierContribution;
  const suggestedMonthlyTopUp = bestScenarioGap > 0
    ? requiredMonthlyTopUp
    : roundUp(suggestedTotalTopUp / contributionMonths, 1_000);
  const plannedTopUpTotal = suggestedMonthlyTopUp * contributionMonths;
  const projectedGoalTotal = maxGrowth.total
    + suggestedMonthlyTopUp * contributionGrowthFactor;

  const clinicValuePerShare = CLINIC_SHARE_PRICE
    + (clinicProfitYearSom / 100) * (months / 12);
  const clinicGoalGap = Math.max(0, effectiveGoalAmount - clinicTotalValue);
  const clinicSuggestedExtraShares = clinicGoalGap > 0
    ? Math.ceil(clinicGoalGap / clinicValuePerShare)
    : 1;
  const clinicSuggestedInvestment = clinicSuggestedExtraShares * CLINIC_SHARE_PRICE;
  const clinicProjectedTotal = clinicTotalValue
    + clinicSuggestedExtraShares * clinicValuePerShare;
  const equityGoalGap = Math.max(0, effectiveGoalAmount - equityTotalUsd * CLINIC_USD_RATE);
  const equityDividendPerShareUsd = equityTotalDividendsUsd / equityShareCount;
  const equityFutureValuePerShareUsd = TARGET_SHARE_PRICE_USD + equityDividendPerShareUsd;
  const equityAvailableShares = PREFERRED_SHARES_FOR_SALE - equityShareCount;
  const equityRequiredExtraShares = equityGoalGap > 0
    ? Math.ceil(equityGoalGap / CLINIC_USD_RATE / equityFutureValuePerShareUsd)
    : Math.max(1, Math.ceil(equityShareCount * 0.1));
  const equitySuggestedExtraShares = Math.min(equityRequiredExtraShares, equityAvailableShares);
  const equitySuggestedExtraUsd = equitySuggestedExtraShares * CURRENT_SHARE_PRICE_USD;
  const equityProjectedTotalUsd = equityTotalUsd
    + equitySuggestedExtraShares * equityFutureValuePerShareUsd;
  const equityPlanReachesGoal = equityProjectedTotalUsd * CLINIC_USD_RATE >= effectiveGoalAmount;

  const goalOffer = useMemo(() => {
    const inflationFactor = Math.pow(1 + INFLATION_RATE / 100, months / 12);
    const cashRealValue = activeAmount / inflationFactor;
    const inflationLoss = activeAmount - cashRealValue;
    const investedRealValue = activeTotal / inflationFactor;
    const realGrowth = investedRealValue - activeAmount;

    if (goalId === "preserve") {
      return {
        eyebrow: "Защита покупательной способности",
        headline: realGrowth >= 0
          ? "Капитал обгоняет инфляционный ориентир"
          : "Текущего сценария недостаточно, чтобы полностью обогнать инфляцию",
        description: `При ориентире инфляции ${percentFormatter.format(INFLATION_RATE)}% в год капитал без дохода теряет покупательную способность. Здесь итог после поправки на инфляцию составляет ${formatMoney(investedRealValue)} в сегодняшних деньгах.`,
        metrics: [
          {
            label: "Если деньги просто лежат",
            value: `−${formatMoney(inflationLoss)}`,
            note: "расчётная потеря покупательной способности",
          },
          {
            label: "После инфляции",
            value: formatMoney(investedRealValue),
            note: "покупательная способность итогового капитала",
          },
          {
            label: "Рост сверх инфляции",
            value: `${realGrowth >= 0 ? "+" : "−"}${formatMoney(Math.abs(realGrowth))}`,
            note: "разница в деньгах сегодняшнего дня",
          },
        ],
      };
    }

    if (goalId === "home") {
      const apartmentCount = activeTotal / APARTMENT_PRICE;
      const downPaymentCount = activeTotal / (APARTMENT_PRICE * DOWN_PAYMENT_SHARE);
      return {
        eyebrow: "Квартира или первоначальный взнос",
        headline: `Итог — это ${percentFormatter.format(apartmentCount)} квартиры по ориентиру ${formatMoney(APARTMENT_PRICE)}`,
        description: `Если покупать квартиру рано, этот же капитал покрывает ${percentFormatter.format(downPaymentCount)} первоначального взноса по 30%.`,
        metrics: [
          { label: "Средняя квартира", value: formatMoney(APARTMENT_PRICE), note: "заданный ориентир цены" },
          { label: "Покрыто квартир", value: percentFormatter.format(apartmentCount), note: "по средней цене" },
          { label: "Взносов по 30%", value: percentFormatter.format(downPaymentCount), note: "вариант для нескольких объектов" },
        ],
      };
    }

    if (goalId === "car") {
      const carCoverage = (activeTotal / effectiveGoalAmount) * 100;
      const downPaymentCount = activeTotal / (effectiveGoalAmount * DOWN_PAYMENT_SHARE);
      return {
        eyebrow: "Автомобиль без лишнего кредита",
        headline: `Капитал покрывает ${percentFormatter.format(carCoverage)}% выбранной стоимости автомобиля`,
        description: `Либо формирует ${percentFormatter.format(downPaymentCount)} первоначального взноса по 30% — можно купить раньше или выбрать автомобиль выше классом.`,
        metrics: [
          { label: "Цена автомобиля", value: formatMoney(effectiveGoalAmount), note: "ваш ориентир" },
          { label: "Покрыто сейчас", value: `${percentFormatter.format(carCoverage)}%`, note: "итоговым капиталом" },
          { label: "Доход отдельно", value: `+${formatMoney(activeProfit)}`, note: "заработано за срок" },
        ],
      };
    }

    const goalLabels: Record<Exclude<GoalId, "preserve" | "home" | "car">, string> = {
      education: "Образование без кредита",
      security: "Запас, который даёт спокойствие",
      business: "Капитал для своего дела",
      freedom: "Свобода не зависеть от одной зарплаты",
    };
    const coverage = (activeTotal / effectiveGoalAmount) * 100;
    const difference = activeTotal - effectiveGoalAmount;

    return {
      eyebrow: goalLabels[goalId as Exclude<GoalId, "preserve" | "home" | "car">],
      headline: difference >= 0
        ? `Цель покрыта, и остаётся запас ${formatMoney(difference)}`
        : `Уже сформировано ${percentFormatter.format(coverage)}% вашей цели`,
      description: difference >= 0
        ? "Капитал закрывает выбранную потребность без необходимости забирать деньги раньше срока."
        : `До полного ориентира остаётся ${formatMoney(Math.abs(difference))}. Ниже показан конкретный план, как закрыть эту разницу.`,
      metrics: [
        { label: "Ваша цель", value: formatMoney(effectiveGoalAmount), note: selectedGoal.title },
        { label: "Уже сформировано", value: `${percentFormatter.format(coverage)}%`, note: "итоговым капиталом" },
        {
          label: "Доход отдельно",
          value: `+${formatMoney(activeProfit)}`,
          note: product === "fixed" ? "работа процентов" : product === "clinic" ? "доля чистой прибыли" : "целевой рост акций",
        },
      ],
    };
  }, [activeAmount, activeProfit, activeTotal, effectiveGoalAmount, goalId, months, product, selectedGoal.title]);

  async function copyCalculation() {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({
      product,
      amount: String(Math.round(amount)),
      term: String(months),
      mode,
      share: String(clinicShare),
      scenario: clinicScenarioId,
      stock: String(Math.round(equityInvestmentUsd)),
      equityScenario: equityScenarioId,
      dividendGrowth: String(equityDividendGrowth),
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

  function selectProduct(id: ProductId) {
    setProduct(id);
    if (id === "equity") {
      setMonths(36);
    } else if (id === "clinic" && months === 6) {
      setMonths(12);
    }
  }

  function printProposal() {
    window.print();
  }

  async function shareProposal() {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({
      product,
      amount: String(Math.round(amount)),
      term: String(months),
      mode,
      share: String(clinicShare),
      scenario: clinicScenarioId,
      stock: String(Math.round(equityInvestmentUsd)),
      equityScenario: equityScenarioId,
      dividendGrowth: String(equityDividendGrowth),
      goal: goalId,
      target: String(Math.round(goalAmount)),
      ...(clientName.trim() ? { name: clientName.trim() } : {}),
    }).toString();

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Персональное предложение R.I.C.H.",
          text: `${clientName.trim() || "Инвестор"}: ${formatMoney(activeAmount)} на ${termLabel(months)}, итог ${formatMoney(activeTotal)}.`,
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
          <span className="brand-mark" aria-hidden="true">R</span>
          <span>
            <strong>R.I.C.H.</strong>
            <small>Ratinov Invest Club of Health</small>
          </span>
        </a>
        <div className="topbar-note">
          <span className="status-dot" /> Ваш расчёт обновляется автоматически
        </div>
      </header>

      <section className="product-section" id="top" aria-labelledby="product-title">
        <div className="product-heading">
          <div>
            <p className="section-kicker">Сначала выберите продукт</p>
            <h2 id="product-title">Как будет работать ваш капитал?</h2>
          </div>
          <p>Три самостоятельных продукта — три разных расчёта.</p>
        </div>
        <div className="product-options" role="tablist" aria-label="Инвестиционные продукты R.I.C.H.">
          <button
            type="button"
            className={product === "fixed" ? "product-card active" : "product-card"}
            onClick={() => selectProduct("fixed")}
            role="tab"
            aria-selected={product === "fixed"}
          >
            <span className="product-number">01</span>
            <span>
              <small>Предсказуемый результат</small>
              <strong>Доходный капитал</strong>
              <span>Ставка известна заранее, проценты можно получать или оставлять для роста.</span>
            </span>
            <span className="product-select">Выбрать</span>
          </button>
          <button
            type="button"
            className={product === "clinic" ? "product-card clinic active" : "product-card clinic"}
            onClick={() => selectProduct("clinic")}
            role="tab"
            aria-selected={product === "clinic"}
          >
            <span className="product-number">02</span>
            <span>
              <small>Совладение действующим бизнесом</small>
              <strong>Доля в клинике</strong>
              <span>1% стоит {formatMoney(CLINIC_SHARE_PRICE)}. Доход зависит от чистой прибыли клиники.</span>
            </span>
            <span className="product-select">Выбрать</span>
          </button>
          <button
            type="button"
            className={product === "equity" ? "product-card equity active" : "product-card equity"}
            onClick={() => selectProduct("equity")}
            role="tab"
            aria-selected={product === "equity"}
          >
            <span className="product-number">03</span>
            <span>
              <small>Рост вместе с медицинским холдингом</small>
              <strong>Акции R.I.C.H.</strong>
              <span>14% дивидендов в USD ежегодно и плановый рост акции с $25 до $150 за 3 года.</span>
            </span>
            <span className="product-select">Выбрать</span>
          </button>
        </div>
      </section>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Ratinov Invest Club of Health</p>
          <h1>Инвестируем в здоровье. Умножаем капитал.</h1>
          <p className="hero-text">
            Выберите свой формат участия: фиксированный доход, долю в клинике
            или акции растущего медицинского холдинга.
          </p>
        </div>
        <div className="hero-principle">
          <span>Клуб инвесторов в здоровье</span>
          <strong>Три продукта. Одна цель — сильный капитал.</strong>
        </div>
      </section>

      <section className="purpose-section" aria-labelledby="purpose-title">
        <div className="purpose-heading">
          <div>
            <p className="section-kicker">Начните не с цифры, а с причины</p>
            <h2 id="purpose-title">Зачем вам увеличивать капитал?</h2>
          </div>
          <p>
            Выберите то, ради чего готовы оставить деньги работать дольше.
            Весь расчёт и готовое предложение подстроятся под эту цель.
          </p>
        </div>

        <div className="purpose-grid">
          {GOALS.map((goal) => (
            <button
              key={goal.id}
              type="button"
              className={goalId === goal.id ? "purpose-card active" : "purpose-card"}
              onClick={() => selectGoal(goal.id)}
              aria-pressed={goalId === goal.id}
            >
              <span className="purpose-icon" aria-hidden="true">{goal.icon}</span>
              <span>
                <strong>{goal.title}</strong>
                <small>{goal.description}</small>
              </span>
              <span className="purpose-check" aria-hidden="true">✓</span>
            </button>
          ))}
        </div>

        <div className="purpose-answer">
          <span>Ваша цель</span>
          <strong>{selectedGoal.icon} {selectedGoal.title}</strong>
          <p>{selectedGoal.description}</p>
          <a href="#calculator">Показать, как к ней прийти <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      {product === "fixed" ? (
      <section className="calculator-grid" id="calculator" aria-label="Калькулятор фиксированного дохода">
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
      ) : product === "clinic" ? (
      <section className="calculator-grid clinic-calculator" id="calculator" aria-label="Калькулятор доли в клинике">
        <div className="control-panel">
          <div className="panel-heading">
            <span className="step-number">01</span>
            <div>
              <p className="section-kicker">Ваша доля</p>
              <h2>Выберите процент клиники</h2>
            </div>
          </div>

          <div className="clinic-share-picker">
            <label htmlFor="clinic-share">Сколько процентов вы хотите приобрести?</label>
            <div className="clinic-share-input">
              <button
                type="button"
                onClick={() => setClinicShare(Math.max(1, clinicShare - 1))}
                aria-label="Уменьшить долю на один процент"
              >−</button>
              <input
                id="clinic-share"
                type="number"
                min={1}
                max={100}
                step={1}
                value={clinicShare}
                onChange={(event) => setClinicShare(clamp(Math.round(Number(event.target.value)), 1, 100))}
              />
              <span>%</span>
              <button
                type="button"
                onClick={() => setClinicShare(Math.min(100, clinicShare + 1))}
                aria-label="Увеличить долю на один процент"
              >+</button>
            </div>
            <div className="clinic-share-quick">
              {[1, 2, 5, 10].map((share) => (
                <button
                  key={share}
                  type="button"
                  className={clinicShare === share ? "active" : ""}
                  onClick={() => setClinicShare(share)}
                >{share}%</button>
              ))}
            </div>
            <div className="clinic-investment-total">
              <span>Стоимость вашей доли</span>
              <strong>{formatMoney(clinicInvestment)}</strong>
              <small>1% = {formatMoney(CLINIC_SHARE_PRICE)}</small>
            </div>
          </div>

          <fieldset className="field-block clinic-scenario-field">
            <legend>Какой сценарий прибыли посмотреть?</legend>
            <div className="clinic-scenario-options">
              {CLINIC_SCENARIOS.map((scenario) => {
                const profitYearSom = scenario.netProfitYearUsd * CLINIC_USD_RATE;
                const investorIncome = profitYearSom * (clinicShare / 100);
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    className={clinicScenarioId === scenario.id ? "active" : ""}
                    onClick={() => setClinicScenarioId(scenario.id)}
                    aria-pressed={clinicScenarioId === scenario.id}
                  >
                    <span>{scenario.title}</span>
                    <strong>{formatMoney(investorIncome)} / год</strong>
                    <small>{scenario.note}</small>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="field-block">
            <legend>Горизонт расчёта дохода</legend>
            <div className="term-options clinic-terms">
              {[12, 24, 36].map((term) => (
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

          <div className="clinic-model-note">
            <strong>Что такое ОП4?</strong>
            <p>
              Это 100% чистой прибыли клиники после расходов центрального офиса.
              Ваша расчётная доля дохода равна выбранному проценту от ОП4.
            </p>
          </div>
        </div>

        <aside className="result-panel clinic-result-panel" aria-live="polite">
          <div className="result-topline">
            <span>Результат по модели клиники</span>
            <span>{clinicScenario.title.toLowerCase()} · {termLabel(months)}</span>
          </div>

          <div className="primary-result clinic-primary-result">
            <p>Ваша доля в клинике</p>
            <strong>{clinicShare}%</strong>
            <span>Стоимость приобретения — {formatMoney(clinicInvestment)}</span>
          </div>

          <div className="clinic-income-hero">
            <span>Расчётный доход за {termLabel(months)}</span>
            <strong>+{formatMoney(clinicTermIncome)}</strong>
            <small>из 100% чистой прибыли ОП4, пропорционально вашей доле</small>
          </div>

          <div className="result-stats clinic-result-stats">
            <div>
              <span>В среднем в месяц</span>
              <strong>{formatMoney(clinicAnnualIncome / 12)}</strong>
            </div>
            <div>
              <span>В год</span>
              <strong>{formatMoney(clinicAnnualIncome)}</strong>
            </div>
            <div>
              <span>Доходность в год</span>
              <strong>{percentFormatter.format(clinicAnnualYield)}%</strong>
            </div>
          </div>

          <div className="clinic-payback-note">
            <span>Расчётная окупаемость доли</span>
            <strong>{percentFormatter.format(clinicPaybackYears)} года</strong>
            <small>При неизменной чистой прибыли выбранного сценария.</small>
          </div>

          <div className="clinic-risk-note">
            <span aria-hidden="true">i</span>
            <p>
              Это доля в бизнесе, а не фиксированная ставка. Доход может быть выше
              или ниже и зависит от фактической чистой прибыли клиники.
            </p>
          </div>

          <button className="share-button" type="button" onClick={copyCalculation}>
            {copied ? "Ссылка на расчёт скопирована" : "Скопировать расчёт доли"}
            <span aria-hidden="true">→</span>
          </button>
        </aside>
      </section>
      ) : (
      <section className="calculator-grid equity-calculator" id="calculator" aria-label="Калькулятор акций холдинга R.I.C.H.">
        <div className="control-panel">
          <div className="panel-heading">
            <span className="step-number">01</span>
            <div>
              <p className="section-kicker">Акции R.I.C.H.</p>
              <h2>Рассчитайте капитал в долларах</h2>
            </div>
          </div>

          <div className="field-block equity-investment-field">
            <label htmlFor="equity-investment">Сколько привилегированных акций купить?</label>
            <div className="input-with-unit equity-usd-input">
              <input
                id="equity-investment"
                type="number"
                min={1}
                max={PREFERRED_SHARES_FOR_SALE}
                step={1}
                value={equityShareCount}
                onChange={(event) => {
                  const shares = clamp(Math.round(Number(event.target.value)), 1, PREFERRED_SHARES_FOR_SALE);
                  setEquityInvestmentUsd(shares * CURRENT_SHARE_PRICE_USD);
                }}
              />
              <span>акций</span>
            </div>
            <div className="equity-quick-values">
              {[100, 400, 1_000, 5_000].map((shares) => (
                <button
                  key={shares}
                  type="button"
                  className={equityShareCount === shares ? "active" : ""}
                  onClick={() => setEquityInvestmentUsd(shares * CURRENT_SHARE_PRICE_USD)}
                >{moneyFormatter.format(shares)} акций</button>
              ))}
            </div>
            <p className="equity-kgs-equivalent">
              Стоимость пакета: <strong>{formatUsd(equityExactInvestmentUsd)}</strong> · цена {formatUsd(CURRENT_SHARE_PRICE_USD)} за акцию · доступно 300 000 из 1 000 000 акций
            </p>
          </div>

          <fieldset className="field-block equity-scenario-field">
            <legend>Сценарий роста сети</legend>
            <div className="clinic-scenario-options equity-scenario-options">
              {EQUITY_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  className={equityScenarioId === scenario.id ? "active" : ""}
                  onClick={() => setEquityScenarioId(scenario.id)}
                  aria-pressed={equityScenarioId === scenario.id}
                >
                  <span>{scenario.title}</span>
                  <strong>{formatUsd(scenario.equipmentUsd)} оборудования</strong>
                  <small>{formatMoney(scenario.turnoverSomMonth)} оборота клиники в месяц</small>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="field-block dividend-growth-field">
            <legend>Возможный рост суммы дивидендов в год</legend>
            <div className="term-options dividend-growth-options">
              {[0, 5, 10, 20].map((growth) => (
                <button
                  key={growth}
                  type="button"
                  className={equityDividendGrowth === growth ? "active" : ""}
                  onClick={() => setEquityDividendGrowth(growth)}
                  aria-pressed={equityDividendGrowth === growth}
                >
                  {growth === 0 ? "Без роста" : `+${growth}% в год`}
                </button>
              ))}
            </div>
            <small className="dividend-growth-help">
              База всегда начинается с 14% от цены покупки. Рост дивидендов — дополнительный сценарий, а не гарантия.
            </small>
          </fieldset>

          <div className="equity-roadmap">
            {[1, 2, 3].map((year) => {
              const dividend = year === 1
                ? equityDividendYear1Usd
                : year === 2
                  ? equityDividendYear2Usd
                  : equityDividendYear3Usd;
              return (
                <div key={year}>
                  <span>{year}-й год</span>
                  <strong>до {moneyFormatter.format(HOLDING_CLINICS_BY_YEAR[year])} клиник</strong>
                  <small>Дивиденд: {formatUsd(dividend)}</small>
                  {year === 3 && <em>Цель акции: {formatUsd(TARGET_SHARE_PRICE_USD)}</em>}
                </div>
              );
            })}
          </div>

          <div className="equity-assumption-note">
            <strong>Как читается этот расчёт</strong>
            <p>
              Первые 3 года расчёт показывает базовый дивиденд 14% годовых в USD.
              Параллельно плановая цена акции растёт с $25 до $150. Экономика сети
              показана отдельно: 60% чистой прибыли с оборудования и роялти 15% от оборота.
            </p>
          </div>
        </div>

        <aside className="result-panel equity-result-panel" aria-live="polite">
          <div className="result-topline">
            <span>Акции медицинского холдинга</span>
            <span>{equityScenario.title.toLowerCase()} · {equityYears} г.</span>
          </div>

          <div className="primary-result equity-primary-result">
            <p>Потенциальная стоимость пакета через 3 года</p>
            <strong>{formatUsd(equityTotalUsd)}</strong>
            <span>{formatUsd(equityTargetShareValueUsd)} акции + {formatUsd(equityTotalDividendsUsd)} дивиденды</span>
          </div>

          <div className="equity-minimum-card">
            <span>Базовый дивиденд первые 3 года</span>
            <strong>{EQUITY_MIN_RETURN}% в год в USD</strong>
            <small>
              В 1-й год {formatUsd(equityDividendYear1Usd)}.
              {equityDividendGrowth > 0
                ? ` Далее сумма растёт на ${equityDividendGrowth}% в год по выбранному сценарию.`
                : " Без дополнительного роста дивидендов."}
            </small>
          </div>

          <div className="result-stats equity-result-stats">
            <div>
              <span>Ваш пакет</span>
              <strong>{moneyFormatter.format(equityShareCount)} акций</strong>
            </div>
            <div>
              <span>Дивиденды за 3 года</span>
              <strong>{formatUsd(equityTotalDividendsUsd)}</strong>
            </div>
            <div>
              <span>Рост цены акции</span>
              <strong>{formatUsd(CURRENT_SHARE_PRICE_USD)} → {formatUsd(TARGET_SHARE_PRICE_USD)}</strong>
            </div>
          </div>

          <div className="equity-growth-engine">
            <p>Оценка холдинга и пакет акций</p>
            <div>
              <span>Текущая оценка: 1 млн × $25</span>
              <strong>{formatUsd(holdingCurrentValuationUsd)}</strong>
            </div>
            <div>
              <span>Плановая оценка: 1 млн × $150</span>
              <strong>{formatUsd(holdingTargetValuationUsd)}</strong>
            </div>
            <div>
              <span>300 000 привилегированных акций</span>
              <strong>{formatUsd(preferredOfferVolumeUsd)} объём предложения</strong>
            </div>
            <div>
              <span>Плановый среднегодовой рост цены</span>
              <strong>{percentFormatter.format(equityPriceCagr)}%</strong>
            </div>
          </div>

          <div className="equity-network-summary">
            <div>
              <span>Клиник через 3 года</span>
              <strong>{moneyFormatter.format(holdingClinicCount)}</strong>
            </div>
            <div>
              <span>60% ЧП оборудования</span>
              <strong>{formatUsd(holdingEquipmentProfitUsd)}</strong>
            </div>
            <div>
              <span>Роялти за 3 года</span>
              <strong>{formatUsd(holdingRoyaltyUsd)}</strong>
            </div>
          </div>

          <div className="clinic-risk-note equity-risk-note">
            <span aria-hidden="true">i</span>
            <p>
              $150 за акцию и рост дивидендов — плановые ориентиры, а не гарантия.
              Фактическая стоимость зависит от результатов холдинга и условий выпуска акций.
            </p>
          </div>

          <button className="share-button" type="button" onClick={copyCalculation}>
            {copied ? "Ссылка на расчёт скопирована" : "Скопировать расчёт акций"}
            <span aria-hidden="true">→</span>
          </button>
        </aside>
      </section>
      )}

      <section className="proposal-section" id="proposal">
        <div className="proposal-intro no-print">
          <div>
            <p className="section-kicker">Ваш готовый план</p>
            <h2>От суммы — к конкретной цели</h2>
            <p>Цель уже выбрана. Здесь можно уточнить имя и нужную сумму перед печатью.</p>
          </div>

          <div className={`proposal-controls compact-proposal-controls ${goalId === "preserve" ? "preserve-controls" : ""}`}>
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

            <div className="chosen-goal-control">
              <span>Выбранная цель</span>
              <strong>{selectedGoal.icon} {selectedGoal.title}</strong>
              <small>{selectedGoal.description}</small>
              <a href="#purpose-title">Изменить цель</a>
            </div>

            {goalId !== "preserve" && (
              <label className="proposal-target-field">
                <span>Сколько нужно для цели</span>
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
            )}
          </div>
        </div>

        <article className="proposal-sheet">
          <header className="proposal-header">
            <div className="proposal-brand">
              <span className="brand-mark" aria-hidden="true">R</span>
              <span>
                <strong>R.I.C.H.</strong>
                <small>
                  {product === "fixed"
                    ? "Предложение: капитал с фиксированным доходом"
                    : product === "clinic"
                      ? "Предложение: доля в клинике"
                      : "Предложение: акции холдинга R.I.C.H."}
                </small>
              </span>
            </div>
            <span className="proposal-status">Предварительный расчёт</span>
          </header>

          <div className="proposal-title">
            <p>{clientName.trim() ? `Для ${clientName.trim()}` : "Для будущего инвестора"}</p>
            <h2>
              {product === "equity" ? formatUsd(equityExactInvestmentUsd) : formatMoney(activeAmount)} начинают работать на цель «{selectedGoal.title}»
            </h2>
            <span>
              {product === "fixed"
                ? `Срок ${termLabel(months)}, фиксированная ставка ${annualRate}% годовых, выбранный способ — ${selectedMode.short.toLowerCase()}.`
                : product === "clinic"
                  ? `${clinicShare}% доли клиники, сценарий «${clinicScenario.title}», горизонт расчёта — ${termLabel(months)}.`
                  : `Пакет из ${moneyFormatter.format(equityShareCount)} привилегированных акций по $25, базовый дивиденд ${EQUITY_MIN_RETURN}% годовых в USD, плановая цена через 3 года — $150.`}
            </span>
          </div>

          <div className="proposal-metrics">
            <div>
              <span>Вложение</span>
              <strong>{product === "equity" ? formatUsd(equityExactInvestmentUsd) : formatMoney(activeAmount)}</strong>
            </div>
            <div>
              <span>{product === "equity" ? "Рост цены + дивиденды" : "Расчётный доход"}</span>
              <strong>+{product === "equity" ? formatUsd(equityProfitUsd) : formatMoney(activeProfit)}</strong>
            </div>
            <div>
              <span>
                {product === "fixed"
                  ? "Итоговый капитал"
                  : product === "clinic"
                    ? "Доля + расчётный доход"
                    : "Плановая стоимость пакета"}
              </span>
              <strong>{product === "equity" ? formatUsd(equityTotalUsd) : formatMoney(activeTotal)}</strong>
            </div>
            <div className="proposal-profit-metric">
              <span>
                {product === "fixed"
                  ? "Рост капитала"
                  : product === "clinic"
                    ? "Доходность в год"
                    : "Базовый дивиденд в год"}
              </span>
              <strong>+{percentFormatter.format(activeAnnualRate)}%</strong>
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
              <span>
                {goalId === "preserve"
                  ? "от начального капитала остаётся после роста"
                  : "цели покрывает итоговый капитал"}
              </span>
            </div>
            <div className="goal-progress-track" aria-hidden="true">
              <span style={{ width: `${Math.min(100, Math.max(2, goalProgress))}%` }} />
            </div>
            <div className="goal-progress-values">
              <span>Итог: {formatMoney(activeTotal)}</span>
              <span>{goalId === "preserve" ? "Было" : "Цель"}: {formatMoney(effectiveGoalAmount)}</span>
            </div>
          </div>

          <div className="goal-offer-section">
            <div className="goal-offer-copy">
              <p className="proposal-label">{goalOffer.eyebrow}</p>
              <h3>{goalOffer.headline}</h3>
              <p>{goalOffer.description}</p>
              {goalId === "preserve" && (
                <a
                  href="https://www.nbkr.kg/newsout.jsp?item=31&lang=RUS&material=132131"
                  target="_blank"
                  rel="noreferrer"
                >
                  Ориентир: годовая инфляция 10,9% по данным НБКР на 15 мая 2026 года
                </a>
              )}
            </div>
            <div className="goal-offer-metrics">
              {goalOffer.metrics.map((metric) => (
                <div key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.note}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="compact-offer-summary">
            <div>
              <p className="proposal-label">Персональное предложение</p>
              {goalId === "preserve" ? (
                <h3>{goalOffer.headline}</h3>
              ) : goalDifference >= 0 ? (
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
                {product === "equity"
                  ? `За 3 года пакет приносит ${formatUsd(equityTotalDividendsUsd)} дивидендов, а плановая стоимость самих акций составляет ${formatUsd(equityTargetShareValueUsd)}.`
                  : goalId === "preserve"
                  ? `Расчётный доход составляет ${formatMoney(activeProfit)} и работает вместе с основной суммой.`
                  : `Один только доход создаёт ${percentFormatter.format(profitGoalShare)}% стоимости выбранной цели.`}
              </p>
            </div>
            <ul>
              {product === "fixed" ? (
                <>
                  <li><span>Ставка</span><strong>{annualRate}% годовых</strong></li>
                  <li><span>Срок</span><strong>{termLabel(months)}</strong></li>
                  <li><span>Выплата</span><strong>{selectedMode.short}</strong></li>
                  <li><span>Итог</span><strong>{formatMoney(activeTotal)}</strong></li>
                </>
              ) : product === "clinic" ? (
                <>
                  <li><span>Доля</span><strong>{clinicShare}%</strong></li>
                  <li><span>Сценарий</span><strong>{clinicScenario.title}</strong></li>
                  <li><span>Доход в год</span><strong>{formatMoney(clinicAnnualIncome)}</strong></li>
                  <li><span>Доходность</span><strong>{percentFormatter.format(clinicAnnualYield)}%</strong></li>
                </>
              ) : (
                <>
                  <li><span>Количество</span><strong>{moneyFormatter.format(equityShareCount)} акций</strong></li>
                  <li><span>Цена покупки</span><strong>$25 за акцию</strong></li>
                  <li><span>Дивиденды за 3 года</span><strong>{formatUsd(equityTotalDividendsUsd)}</strong></li>
                  <li><span>Плановый итог</span><strong>{formatUsd(equityTotalUsd)}</strong></li>
                </>
              )}
            </ul>
          </div>

          <div className="proposal-recommendation compact-recommendation topup-recommendation">
            <span>
              {product === "fixed"
                ? (bestScenarioGap > 0 ? "Как достичь цели" : "Как получить ещё больше")
                : product === "clinic"
                  ? (clinicGoalGap > 0 ? "Как увеличить долю" : "Следующий шаг")
                  : (equityGoalGap > 0 ? "Как усилить пакет" : "Следующий шаг")}
            </span>
            <div>
              {product === "clinic" ? (
                <>
                  <strong className="topup-headline">
                    {clinicGoalGap > 0
                      ? `Приобретите ещё ${clinicSuggestedExtraShares}% доли за ${formatMoney(clinicSuggestedInvestment)}.`
                      : `Добавьте ещё 1% доли за ${formatMoney(CLINIC_SHARE_PRICE)}.`}
                  </strong>
                  <p>
                    Тогда доля вместе с расчётным доходом за {termLabel(months)} составит
                    <strong> {formatMoney(clinicProjectedTotal)}</strong>.
                    {clinicGoalGap > 0
                      ? ` Это закрывает разницу до цели «${selectedGoal.title}».`
                      : " Чем больше доля, тем большая часть чистой прибыли ОП4 принадлежит вам."}
                  </p>
                  <small>
                    Расчёт выполнен по сценарию «{clinicScenario.title}». Фактическая прибыль бизнеса
                    не гарантирована и может быть выше или ниже. Права на долю и дивиденды фиксируются договором.
                  </small>
                </>
              ) : product === "equity" && equitySuggestedExtraShares > 0 ? (
                <>
                  <strong className="topup-headline">
                    {equityGoalGap > 0
                      ? `Добавьте ещё ${moneyFormatter.format(equitySuggestedExtraShares)} привилегированных акций за ${formatUsd(equitySuggestedExtraUsd)}.`
                      : `Увеличьте пакет ещё на ${moneyFormatter.format(equitySuggestedExtraShares)} акций за ${formatUsd(equitySuggestedExtraUsd)}.`}
                  </strong>
                  <p>
                    С базовыми дивидендами {EQUITY_MIN_RETURN}% в год и плановой ценой $150 за акцию стоимость пакета через 3 года составит
                    <strong> {formatUsd(equityProjectedTotalUsd)}</strong>.
                    {equityGoalGap > 0
                      ? equityPlanReachesGoal
                        ? ` Этого достаточно для цели «${selectedGoal.title}» по курсу модели.`
                        : " Доступного остатка выпуска недостаточно, чтобы полностью закрыть выбранную цель."
                      : " Чем больше пакет, тем больше сумма дивидендов и потенциальный результат от роста цены."}
                  </p>
                  <small>
                    Цена $150 и выбранный рост суммы дивидендов — плановые сценарии, а не гарантия.
                    Фактическая цена и выплаты определяются результатами холдинга и условиями выпуска ценных бумаг.
                  </small>
                </>
              ) : product === "equity" ? (
                <>
                  <strong className="topup-headline">
                    Вы выбрали весь доступный выпуск — {moneyFormatter.format(PREFERRED_SHARES_FOR_SALE)} привилегированных акций.
                  </strong>
                  <p>
                    Стоимость покупки составляет <strong>{formatUsd(equityExactInvestmentUsd)}</strong>,
                    а плановый итог пакета через 3 года — <strong>{formatUsd(equityTotalUsd)}</strong>.
                  </p>
                  <small>
                    Цена $150 и рост суммы дивидендов — плановые сценарии, а не гарантия.
                    Фактическая цена и выплаты определяются результатами холдинга и условиями выпуска ценных бумаг.
                  </small>
                </>
              ) : bestScenarioGap > 0 ? (
                <>
                  <strong className="topup-headline">
                    Внесите ещё {formatMoney(plannedTopUpTotal)} в течение {contributionMonths === 12 ? "первого года" : `первых ${contributionMonths} месяцев`}.
                  </strong>
                  <p>
                    Это по <strong>{formatMoney(suggestedMonthlyTopUp)} в месяц</strong>.
                    Если оставить все проценты работать до конца срока, расчётный итог составит
                    <strong> {formatMoney(projectedGoalTotal)}</strong> — выбранная цель будет достигнута за {termLabel(months)}.
                  </p>
                </>
              ) : (
                <>
                  <strong className="topup-headline">
                    Цель уже достижима. Добавьте ещё {formatMoney(plannedTopUpTotal)} в течение {contributionMonths === 12 ? "года" : `${contributionMonths} месяцев`}.
                  </strong>
                  <p>
                    Это по <strong>{formatMoney(suggestedMonthlyTopUp)} в месяц</strong>.
                    Не забирая проценты, вы увеличите расчётный итог до
                    <strong> {formatMoney(projectedGoalTotal)}</strong> и создадите дополнительный запас для цели.
                  </p>
                </>
              )}
              {product === "fixed" && (
                <small>
                  План рассчитан по текущей ставке {annualRate}% с ежемесячной капитализацией.
                  Возможность дополнительных взносов закрепляется в договоре.
                </small>
              )}
            </div>
          </div>

          <div className="proposal-closing compact-closing">
            <div className="proposal-signatures">
              <span>Инвестор ____________________</span>
              <span>Менеджер ____________________</span>
            </div>
            <p>
              Предварительный расчёт. Финальные условия, порядок выплат,
              права и обязательства сторон фиксируются договором.
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
          Предварительный финансовый расчёт. Фактические выплаты и права инвестора
          определяются выбранным продуктом и подписанным договором.
        </p>
        <span>Валюта расчёта: кыргызский сом (KGS)</span>
      </footer>
    </main>
  );
}
