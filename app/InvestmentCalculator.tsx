"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";

type ModeId = "monthly" | "quarterly" | "yearly" | "maturity";
type ProductId = "fixed" | "clinic" | "equity";
type ClinicScenarioId = "minimum" | "base" | "achievable";
export type CurrencyId = "KGS" | "USD";
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
const BANK_RATE_BENCHMARK = 14;
const INFLATION_RATE = 10.9;
const APARTMENT_PRICE = 7_000_000;
const DOWN_PAYMENT_SHARE = 0.3;
const CLINIC_SHARE_PRICE = 800_000;
const EQUITY_MIN_RETURN = 14;
const TOTAL_HOLDING_SHARES = 1_000_000;
const PREFERRED_SHARES_FOR_SALE = 300_000;
const MIN_EQUITY_SHARES = 1_000;
const CURRENT_SHARE_PRICE_USD = 25;
const YEAR_ONE_CLINICS = 50;
const FRANCHISE_CLINICS = 1_000;
const YEAR_ONE_VALUATION_USD = 50_000_000;
const EQUIPMENT_PER_FRANCHISE_USD = 100_000;
const EQUIPMENT_NET_MARGIN = 0.6;
const MONTHLY_HOLDING_INCOME_PER_FRANCHISE_USD = 5_000;
const FRANCHISE_INCOME_GROWTH = 0.25;
const RECURRING_INCOME_MULTIPLE = 2;
const TERMS = [6, 12, 24, 36] as const;
const AMOUNT_MARKS = [500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000] as const;

const CURRENCY_CONFIG: Record<CurrencyId, {
  code: CurrencyId;
  label: string;
  shortLabel: string;
  unit: string;
  displayScale: number;
  prefix?: string;
}> = {
  KGS: {
    code: "KGS",
    label: "Кыргызский сом",
    shortLabel: "Сом",
    unit: "сом",
    displayScale: 1,
  },
  USD: {
    code: "USD",
    label: "Доллар США",
    shortLabel: "Доллар $",
    unit: "USD",
    displayScale: 0.01,
    prefix: "$",
  },
};

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

const TERM_RATES: Record<number, number> = {
  6: 24,
  12: 26,
  24: 28,
  36: 30,
};
const PAYOUT_BONUS: Record<ModeId, number> = {
  monthly: 0,
  quarterly: 2,
  yearly: 4,
  maturity: 6,
};

const GOALS: Array<{
  id: GoalId;
  icon: string;
  image: string;
  title: string;
  description: string;
  defaultTarget: number;
}> = [
  {
    id: "preserve",
    icon: "🧱",
    image: "/brand/goal-preserve.jpg",
    title: "Сохранить деньги",
    description: "Не дать инфляции уменьшить покупательную способность накоплений",
    defaultTarget: 2_000_000,
  },
  {
    id: "car",
    icon: "🚙",
    image: "/brand/goal-car.jpg",
    title: "Автомобиль",
    description: "Купить машину полностью или собрать первоначальный взнос",
    defaultTarget: 3_000_000,
  },
  {
    id: "home",
    icon: "🏠",
    image: "/brand/goal-home.jpg",
    title: "Квартира",
    description: "Первоначальный взнос, квартира или несколько объектов",
    defaultTarget: APARTMENT_PRICE,
  },
  {
    id: "education",
    icon: "🎓",
    image: "/brand/goal-education.jpg",
    title: "Учёба детям",
    description: "Оплатить образование детей без кредита и спешки",
    defaultTarget: 2_500_000,
  },
  {
    id: "security",
    icon: "🛡️",
    image: "/brand/goal-security.jpg",
    title: "Запас для семьи",
    description: "Не зависеть от одной зарплаты и неожиданных расходов",
    defaultTarget: 4_000_000,
  },
  {
    id: "business",
    icon: "🚀",
    image: "/brand/goal-business.jpg",
    title: "Свой бизнес",
    description: "Запустить или расширить дело без дорогого кредита",
    defaultTarget: 5_000_000,
  },
  {
    id: "freedom",
    icon: "🌿",
    image: "/brand/goal-freedom.jpg",
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
    description: "Регулярный доход без бонуса к ставке.",
    badge: "+0%",
  },
  {
    id: "quarterly",
    short: "Раз в квартал",
    title: "Выплата раз в квартал",
    description: "Проценты капитализируются каждые 3 месяца.",
    badge: "+2%",
  },
  {
    id: "yearly",
    short: "Раз в год",
    title: "Выплата раз в год",
    description: "Доход остаётся в работе до годовой выплаты.",
    badge: "+4%",
  },
  {
    id: "maturity",
    short: "В конце срока",
    title: "Вся сумма в конце",
    description: "+6% доступно только при сроке больше 2 лет.",
    badge: "+6% на 3 года",
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

function getAutomaticRate(months: number, mode: ModeId) {
  const baseRate = TERM_RATES[months] ?? TERM_RATES[6];
  const retentionBonus = mode === "maturity" && months <= 24
    ? 0
    : PAYOUT_BONUS[mode];
  return {
    baseRate,
    retentionBonus,
    totalRate: baseRate + retentionBonus,
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

function formatMoney(value: number, currency: CurrencyId) {
  const config = CURRENCY_CONFIG[currency];
  const displayedValue = value * config.displayScale;
  const formatted = moneyFormatter.format(Math.round(displayedValue));
  return config.prefix ? `${config.prefix}${formatted}` : `${formatted} ${config.unit}`;
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

type InvestmentCalculatorProps = {
  initialCurrency: CurrencyId;
  currencyOptions: CurrencyId[];
  usdModelRate: number;
};

export function InvestmentCalculator({
  initialCurrency,
  currencyOptions,
  usdModelRate,
}: InvestmentCalculatorProps) {
  const [currency, setCurrency] = useState<CurrencyId>(initialCurrency);
  const [product, setProduct] = useState<ProductId>("fixed");
  const [amount, setAmount] = useState(2_000_000);
  const [months, setMonths] = useState<number>(36);
  const [mode, setMode] = useState<ModeId>("maturity");
  const [clinicShare, setClinicShare] = useState(1);
  const [clinicScenarioId, setClinicScenarioId] = useState<ClinicScenarioId>("base");
  const [equityInvestmentUsd, setEquityInvestmentUsd] = useState(25_000);
  const [copied, setCopied] = useState(false);
  const [clientName, setClientName] = useState("");
  const [goalId, setGoalId] = useState<GoalId>("preserve");
  const [goalAmount, setGoalAmount] = useState(2_000_000);

  const currencyConfig = CURRENCY_CONFIG[currency];
  const usdToLocalRate = usdModelRate;
  const formatLocalMoney = useCallback(
    (value: number) => formatMoney(value, currency),
    [currency],
  );
  const toDisplayedAmount = useCallback(
    (value: number) => value * currencyConfig.displayScale,
    [currencyConfig.displayScale],
  );
  const toBaseAmount = useCallback(
    (value: number) => value / currencyConfig.displayScale,
    [currencyConfig.displayScale],
  );

  const rateDetails = getAutomaticRate(months, mode);
  const annualRate = rateDetails.totalRate;
  const selectedGoal = GOALS.find((item) => item.id === goalId)!;
  const nextAmountMark = AMOUNT_MARKS.find((mark) => mark > amount);

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
    const goalParam = params.get("goal") as GoalId | null;
    const targetParam = Number(params.get("target"));
    const nameParam = params.get("name");
    const currencyParam = params.get("currency") as CurrencyId | null;

    if (currencyParam && currencyOptions.includes(currencyParam)) {
      setCurrency(currencyParam);
    }

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
        MIN_EQUITY_SHARES * CURRENT_SHARE_PRICE_USD,
        PREFERRED_SHARES_FOR_SALE * CURRENT_SHARE_PRICE_USD,
      ));
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
  }, [currencyOptions]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const result = useMemo(
    () => calculate(amount, annualRate, months, mode),
    [amount, annualRate, months, mode],
  );

  const comparisons = useMemo(
    () =>
      MODES.map((item) => ({
        ...item,
        rate: getAutomaticRate(months, item.id).totalRate,
        result: calculate(
          amount,
          getAutomaticRate(months, item.id).totalRate,
          months,
          item.id,
        ),
      })),
    [amount, months],
  );

  const standard = comparisons.find((item) => item.id === "monthly")!.result;
  const bestComparison = comparisons.reduce((best, item) =>
    item.result.total > best.result.total ? item : best,
  );
  const maxGrowth = bestComparison.result;
  const selectedMode = MODES.find((item) => item.id === mode)!;
  const retentionGain = maxGrowth.profit - standard.profit;
  const bankRateAdvantage = annualRate - BANK_RATE_BENCHMARK;
  const inflationRateAdvantage = result.effectiveAnnualRate - INFLATION_RATE;
  const fixedSchedule = useMemo(() => {
    const checkpoints = [0];
    const checkpointStep = months <= 12 ? 3 : 6;
    for (let checkpoint = checkpointStep; checkpoint < months; checkpoint += checkpointStep) {
      checkpoints.push(checkpoint);
    }
    checkpoints.push(months);

    return checkpoints.map((checkpoint) => {
      const checkpointResult = checkpoint === 0
        ? calculate(amount, annualRate, 0, mode)
        : calculate(amount, annualRate, checkpoint, mode);
      return {
        month: checkpoint,
        total: checkpointResult.total,
        profit: checkpointResult.profit,
        capitalAtWork: mode === "monthly" ? amount : checkpointResult.total,
      };
    });
  }, [amount, annualRate, mode, months]);
  const scheduleMaximum = fixedSchedule.at(-1)?.total ?? amount;
  const clinicScenario = CLINIC_SCENARIOS.find((item) => item.id === clinicScenarioId)!;
  const clinicInvestment = clinicShare * CLINIC_SHARE_PRICE;
  const clinicProfitYearSom = clinicScenario.netProfitYearUsd * usdToLocalRate;
  const clinicAnnualIncome = clinicProfitYearSom * (clinicShare / 100);
  const clinicTermIncome = clinicAnnualIncome * (months / 12);
  const clinicTotalValue = clinicInvestment + clinicTermIncome;
  const clinicAnnualYield = (clinicAnnualIncome / clinicInvestment) * 100;
  const clinicPaybackYears = clinicAnnualIncome > 0
    ? clinicInvestment / clinicAnnualIncome
    : 0;

  const equityYears = 3;
  const equityShareCount = clamp(
    Math.floor(equityInvestmentUsd / CURRENT_SHARE_PRICE_USD),
    MIN_EQUITY_SHARES,
    PREFERRED_SHARES_FOR_SALE,
  );
  const equityExactInvestmentUsd = equityShareCount * CURRENT_SHARE_PRICE_USD;
  const equityDividendYear1Usd = equityExactInvestmentUsd * (EQUITY_MIN_RETURN / 100);
  const equityDividendYear2Usd = equityDividendYear1Usd;
  const equityDividendYear3Usd = equityDividendYear1Usd;
  const equityTotalDividendsUsd = equityDividendYear1Usd
    + equityDividendYear2Usd
    + equityDividendYear3Usd;
  const holdingEquipmentRevenueUsd = FRANCHISE_CLINICS * EQUIPMENT_PER_FRANCHISE_USD;
  const holdingEquipmentProfitUsd = holdingEquipmentRevenueUsd * EQUIPMENT_NET_MARGIN;
  const holdingRecurringIncomeYear2Usd = FRANCHISE_CLINICS
    * MONTHLY_HOLDING_INCOME_PER_FRANCHISE_USD
    * 12;
  const holdingRecurringIncomeYear3Usd = holdingRecurringIncomeYear2Usd
    * (1 + FRANCHISE_INCOME_GROWTH);
  const holdingCurrentValuationUsd = TOTAL_HOLDING_SHARES * CURRENT_SHARE_PRICE_USD;
  const holdingYear2ValuationUsd = holdingRecurringIncomeYear2Usd * RECURRING_INCOME_MULTIPLE;
  const holdingYear3ValuationUsd = holdingRecurringIncomeYear3Usd * RECURRING_INCOME_MULTIPLE;
  const yearOneSharePriceUsd = YEAR_ONE_VALUATION_USD / TOTAL_HOLDING_SHARES;
  const yearTwoSharePriceUsd = holdingYear2ValuationUsd / TOTAL_HOLDING_SHARES;
  const yearThreeSharePriceUsd = holdingYear3ValuationUsd / TOTAL_HOLDING_SHARES;
  const equityTargetShareValueUsd = equityShareCount * yearThreeSharePriceUsd;
  const equityTotalUsd = equityTargetShareValueUsd + equityTotalDividendsUsd;
  const equityProfitUsd = equityTotalUsd - equityExactInvestmentUsd;
  const equityPriceCagr = (Math.pow(yearThreeSharePriceUsd / CURRENT_SHARE_PRICE_USD, 1 / 3) - 1) * 100;
  const preferredOfferVolumeUsd = PREFERRED_SHARES_FOR_SALE * CURRENT_SHARE_PRICE_USD;

  const activeAmount = product === "fixed"
      ? amount
      : product === "clinic"
        ? clinicInvestment
      : equityExactInvestmentUsd * usdToLocalRate;
  const activeProfit = product === "fixed"
    ? result.profit
    : product === "clinic"
      ? clinicTermIncome
      : equityProfitUsd * usdToLocalRate;
  const activeTotal = product === "fixed"
    ? result.total
    : product === "clinic"
      ? clinicTotalValue
      : equityTotalUsd * usdToLocalRate;
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
  const monthlyGrowthRate = bestComparison.rate / 100 / 12;
  let contributionGrowthFactor = 0;
  for (let month = 1; month <= contributionMonths; month += 1) {
    contributionGrowthFactor += Math.pow(1 + monthlyGrowthRate, months - month);
  }

  const bestScenarioGap = Math.max(0, effectiveGoalAmount - maxGrowth.total);
  const requiredMonthlyTopUp = bestScenarioGap > 0
    ? roundUp(bestScenarioGap / contributionGrowthFactor, 1_000)
    : 0;
  const nextTierContribution = nextAmountMark
    ? nextAmountMark - amount
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
  const equityGoalGap = Math.max(0, effectiveGoalAmount - equityTotalUsd * usdToLocalRate);
  const equityDividendPerShareUsd = equityTotalDividendsUsd / equityShareCount;
  const equityFutureValuePerShareUsd = yearThreeSharePriceUsd + equityDividendPerShareUsd;
  const equityAvailableShares = PREFERRED_SHARES_FOR_SALE - equityShareCount;
  const equityRequiredExtraShares = equityGoalGap > 0
    ? Math.max(
      MIN_EQUITY_SHARES,
      Math.ceil(equityGoalGap / usdToLocalRate / equityFutureValuePerShareUsd),
    )
    : Math.max(MIN_EQUITY_SHARES, Math.ceil(equityShareCount * 0.1));
  const equitySuggestedExtraShares = Math.min(equityRequiredExtraShares, equityAvailableShares);
  const equitySuggestedExtraUsd = equitySuggestedExtraShares * CURRENT_SHARE_PRICE_USD;
  const equityProjectedTotalUsd = equityTotalUsd
    + equitySuggestedExtraShares * equityFutureValuePerShareUsd;
  const equityPlanReachesGoal = equityProjectedTotalUsd * usdToLocalRate >= effectiveGoalAmount;

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
        description: `При ориентире инфляции ${percentFormatter.format(INFLATION_RATE)}% в год капитал без дохода теряет покупательную способность. Здесь итог после поправки на инфляцию составляет ${formatLocalMoney(investedRealValue)} в сегодняшних деньгах.`,
        metrics: [
          {
            label: "Если деньги просто лежат",
            value: `−${formatLocalMoney(inflationLoss)}`,
            note: "расчётная потеря покупательной способности",
          },
          {
            label: "После инфляции",
            value: formatLocalMoney(investedRealValue),
            note: "покупательная способность итогового капитала",
          },
          {
            label: "Рост сверх инфляции",
            value: `${realGrowth >= 0 ? "+" : "−"}${formatLocalMoney(Math.abs(realGrowth))}`,
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
        headline: `Итог — это ${percentFormatter.format(apartmentCount)} квартиры по ориентиру ${formatLocalMoney(APARTMENT_PRICE)}`,
        description: `Если покупать квартиру рано, этот же капитал покрывает ${percentFormatter.format(downPaymentCount)} первоначального взноса по 30%.`,
        metrics: [
          { label: "Средняя квартира", value: formatLocalMoney(APARTMENT_PRICE), note: "заданный ориентир цены" },
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
          { label: "Цена автомобиля", value: formatLocalMoney(effectiveGoalAmount), note: "ваш ориентир" },
          { label: "Покрыто сейчас", value: `${percentFormatter.format(carCoverage)}%`, note: "итоговым капиталом" },
          { label: "Доход отдельно", value: `+${formatLocalMoney(activeProfit)}`, note: "заработано за срок" },
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
        ? `Цель покрыта, и остаётся запас ${formatLocalMoney(difference)}`
        : `Уже сформировано ${percentFormatter.format(coverage)}% вашей цели`,
      description: difference >= 0
        ? "Капитал закрывает выбранную потребность без необходимости забирать деньги раньше срока."
        : `До полного ориентира остаётся ${formatLocalMoney(Math.abs(difference))}. Ниже показан конкретный план, как закрыть эту разницу.`,
      metrics: [
        { label: "Ваша цель", value: formatLocalMoney(effectiveGoalAmount), note: selectedGoal.title },
        { label: "Уже сформировано", value: `${percentFormatter.format(coverage)}%`, note: "итоговым капиталом" },
        {
          label: "Доход отдельно",
          value: `+${formatLocalMoney(activeProfit)}`,
          note: product === "fixed" ? "работа процентов" : product === "clinic" ? "доля чистой прибыли" : "целевой рост акций",
        },
      ],
    };
  }, [activeAmount, activeProfit, activeTotal, effectiveGoalAmount, formatLocalMoney, goalId, months, product, selectedGoal.title]);

  async function copyCalculation() {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({
      product,
      currency,
      amount: String(Math.round(amount)),
      term: String(months),
      mode,
      share: String(clinicShare),
      scenario: clinicScenarioId,
      stock: String(Math.round(equityInvestmentUsd)),
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
      currency,
      amount: String(Math.round(amount)),
      term: String(months),
      mode,
      share: String(clinicShare),
      scenario: clinicScenarioId,
      stock: String(Math.round(equityInvestmentUsd)),
      goal: goalId,
      target: String(Math.round(goalAmount)),
      ...(clientName.trim() ? { name: clientName.trim() } : {}),
    }).toString();

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Персональное предложение R.I.C.H.",
          text: `${clientName.trim() || "Инвестор"}: ${formatLocalMoney(activeAmount)} на ${termLabel(months)}, итог ${formatLocalMoney(activeTotal)}.`,
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
          <Image className="brand-logo" src="/brand/rich-logo-gold.png" width={453} height={270} priority alt="R.I.C.H. — Ratinov Invest Club of Health" />
        </a>
        <div className="topbar-note">
          <span className="status-dot" /> Персональный расчёт инвестора
        </div>
      </header>

      {currencyOptions.length > 1 && (
        <section className="currency-section" aria-label="Выбор валюты расчёта">
          <div>
            <p className="section-kicker">Валюта расчёта</p>
            <strong>Одинаковая логика — кыргызский сом или доллар США</strong>
            <small>При переключении сумма автоматически пересчитывается, а ставка и срок не меняются.</small>
          </div>
          <div className="currency-options" role="group" aria-label="Валюта">
            {currencyOptions.map((option) => {
              const optionConfig = CURRENCY_CONFIG[option];
              return (
                <button
                  key={option}
                  type="button"
                  className={currency === option ? "active" : ""}
                  onClick={() => setCurrency(option)}
                  aria-pressed={currency === option}
                >
                  <span>{optionConfig.shortLabel}</span>
                  <small>{optionConfig.code}</small>
                </button>
              );
            })}
          </div>
          <p className="currency-rate-note">
            Курс модели: $1 = {moneyFormatter.format(usdModelRate)} сом · {formatMoney(MIN_AMOUNT, "KGS")} = {formatMoney(MIN_AMOUNT, "USD")}
          </p>
        </section>
      )}

      <section className="product-section" id="top" aria-labelledby="product-title">
        <div className="product-heading">
          <div>
            <p className="section-kicker">Шаг 1</p>
            <h2 id="product-title">Выберите инвестиционный продукт</h2>
          </div>
          <p>Нажмите на один из трёх вариантов.</p>
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
              <strong>Доходный капитал</strong>
              <span>Фиксированная ставка</span>
            </span>
            <span className="product-select">{product === "fixed" ? "Выбрано ✓" : "Выбрать"}</span>
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
              <strong>Доля в клинике</strong>
              <span>Совладение бизнесом</span>
            </span>
            <span className="product-select">{product === "clinic" ? "Выбрано ✓" : "Выбрать"}</span>
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
              <strong>Акции RS Holding</strong>
              <span>Рост вместе с холдингом</span>
            </span>
            <span className="product-select">{product === "equity" ? "Выбрано ✓" : "Выбрать"}</span>
          </button>
        </div>
      </section>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">R.I.C.H. · Ratinov Invest Club of Health</p>
          <h1>Капитал для здоровья, свободы и будущего.</h1>
          <p className="hero-text">
            Ваша персональная стратегия участия в медицине будущего.
          </p>
        </div>
        <div className="hero-principle">
          <span>Experience of R.I.C.H.</span>
          <strong>Инвестиционное мышление и медицина будущего.</strong>
        </div>
      </section>

      <section className="purpose-section" aria-labelledby="purpose-title">
        <div className="purpose-heading">
          <div>
            <p className="section-kicker">Шаг 2</p>
            <h2 id="purpose-title">Зачем вам увеличивать капитал?</h2>
          </div>
          <label className="purpose-name-field">
            <span>Как к вам обращаться?</span>
            <input
              type="text"
              value={clientName}
              maxLength={80}
              placeholder="Имя инвестора"
              onChange={(event) => setClientName(event.target.value)}
            />
          </label>
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
              <Image src={goal.image} width={720} height={420} alt="" aria-hidden="true" />
              <span className="purpose-card-copy">
                <strong>{goal.title}</strong>
                <small>{goal.id === "home" ? "Взнос или квартира" : goal.description}</small>
              </span>
              <span className="purpose-check" aria-hidden="true">✓</span>
            </button>
          ))}
        </div>

        <div className="purpose-compact-footer">
          <strong>{clientName.trim() || "Инвестор"}, цель выбрана: {selectedGoal.title}</strong>
          {goalId !== "preserve" && (
            <label>
              <span>Стоимость цели</span>
              <div className="input-with-unit">
                <input
                  type="number"
                  min={toDisplayedAmount(100_000)}
                  step={toDisplayedAmount(100_000)}
                  value={toDisplayedAmount(goalAmount)}
                  onChange={(event) => setGoalAmount(Math.max(100_000, toBaseAmount(Number(event.target.value))))}
                />
                <span>{currencyConfig.code}</span>
              </div>
            </label>
          )}
          <a href="#calculator">Перейти к сумме <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      {product === "fixed" ? (
      <section className="calculator-grid" id="calculator" aria-label="Калькулятор фиксированного дохода">
        <div className="control-panel">
          <div className="panel-heading">
            <span className="step-number">03</span>
            <div>
              <p className="section-kicker">Доходный капитал</p>
              <h2>Настройте условия — ставка посчитается сама</h2>
            </div>
          </div>

          <div className="field-block">
            <label htmlFor="amount">Сумма инвестиций</label>
            <div className="input-with-unit">
              <input
                id="amount"
                type="number"
                min={toDisplayedAmount(MIN_AMOUNT)}
                max={toDisplayedAmount(MAX_AMOUNT)}
                step={toDisplayedAmount(100_000)}
                value={toDisplayedAmount(amount)}
                onChange={(event) =>
                  setAmount(clamp(toBaseAmount(Number(event.target.value)), MIN_AMOUNT, MAX_AMOUNT))
                }
              />
              <span>{currencyConfig.code}</span>
            </div>
            <input
              className="range-input"
              aria-label={`Сумма инвестиций от ${formatLocalMoney(MIN_AMOUNT)} до ${formatLocalMoney(MAX_AMOUNT)}`}
              type="range"
              min={toDisplayedAmount(MIN_AMOUNT)}
              max={toDisplayedAmount(MAX_AMOUNT)}
              step={toDisplayedAmount(100_000)}
              value={toDisplayedAmount(amount)}
              onChange={(event) => setAmount(toBaseAmount(Number(event.target.value)))}
            />
            <div className="range-labels">
              <span>{formatLocalMoney(MIN_AMOUNT)}</span>
              <span>{formatLocalMoney(MAX_AMOUNT)}</span>
            </div>
            <div className="amount-marks" role="group" aria-label="Быстрый выбор суммы">
              {AMOUNT_MARKS.map((mark) => (
                <button
                  key={mark}
                  type="button"
                  className={amount === mark ? "active" : ""}
                  onClick={() => setAmount(mark)}
                  aria-pressed={amount === mark}
                >
                  {formatLocalMoney(mark)}
                </button>
              ))}
            </div>
          </div>

          <fieldset className="field-block payout-period-field">
            <legend>Как часто получать доход?</legend>
            <p className="mode-lead">
              Чем реже выплата, тем выше бонус к базовой ставке. Сначала выберите период — итоговую ставку увидите ниже.
            </p>
            <div className="mode-options compact-payout-options">
              {MODES.map((item, index) => {
                const itemBonus = getAutomaticRate(months, item.id).retentionBonus;
                const maturityBonusLocked = item.id === "maturity" && months <= 24;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`mode-card ${mode === item.id ? "active" : ""}`}
                    onClick={() => setMode(item.id)}
                    aria-pressed={mode === item.id}
                  >
                    <span className="radio-dot" aria-hidden="true" />
                    <span className="mode-copy">
                      <span className="mode-order">Период {index + 1}</span>
                      <strong>{item.short}</strong>
                      <small>{item.description}</small>
                      <span className="mode-result-label">Бонус к ставке</span>
                      <span className="mode-result">
                        {maturityBonusLocked ? "0% сейчас" : `+${itemBonus}%`}
                      </span>
                      {maturityBonusLocked && (
                        <span className="mode-extra">+6% откроется при сроке 3 года</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="field-block term-first-block">
            <legend>На какой срок оставить капитал?</legend>
            <div className="term-options">
              {TERMS.map((term) => (
                <button
                  key={term}
                  type="button"
                  className={months === term ? "active" : ""}
                  onClick={() => setMonths(term)}
                  aria-pressed={months === term}
                >
                  <span>{termLabel(term)}</span>
                  <strong>{TERM_RATES[term]}% база</strong>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="field-block automatic-rate-block">
            <div className="automatic-rate-heading">
              <div>
                <span>Ваша конечная ставка</span>
                <strong>{annualRate}% годовых</strong>
              </div>
              <span className="locked-rate">Рассчитана автоматически</span>
            </div>
            <div className="rate-breakdown">
              <div>
                <span>За срок</span>
                <strong>{rateDetails.baseRate}%</strong>
                <small>{termLabel(months)}</small>
              </div>
              <span className="rate-plus">+</span>
              <div>
                <span>За период выплаты</span>
                <strong>{rateDetails.retentionBonus}%</strong>
                <small>{selectedMode.short.toLowerCase()}</small>
              </div>
              <span className="rate-equals">=</span>
              <div className="rate-total">
                <span>Итого</span>
                <strong>{annualRate}%</strong>
                <small>зафиксировано расчётом</small>
              </div>
            </div>
            <p className="rate-hint">
              {mode === "maturity" && months <= 24
                ? "Бонус +6% за выплату в конце доступен только при сроке больше 2 лет. Выберите 3 года — и ставка вырастет автоматически."
                : `Ваш бонус за вариант «${selectedMode.short}» — +${rateDetails.retentionBonus}%. Максимальная ставка 36% доступна на 3 года с выплатой в конце.`}
            </p>
          </div>

          <fieldset className="field-block mode-field">
            <legend>Когда получить доход?</legend>
            <p className="mode-lead">
              Забрать сейчас — ставка только по сроку. Оставить в капитале — ещё +6 п.п.
              и проценты начинают приносить новые проценты.
            </p>

            <div className="retention-comparison">
              <div className="withdraw-now-card">
                <span>Получать проценты сейчас</span>
                <strong>{formatLocalMoney(standard.total)}</strong>
                <small>
                  {formatLocalMoney(amount)} ваших денег + {formatLocalMoney(standard.profit)} дохода
                </small>
              </div>
              <div className="retain-income-card">
                <span>Оставить проценты работать</span>
                <strong>{formatLocalMoney(maxGrowth.total)}</strong>
                <small>
                  {formatLocalMoney(amount)} ваших денег + {formatLocalMoney(maxGrowth.profit)} дохода
                </small>
              </div>
            </div>

            <div className="retention-message">
              <span aria-hidden="true">+</span>
              <p>
                Простая разница: если подождать, вы получите ещё
                <strong> {formatLocalMoney(retentionGain)}</strong>. Эти деньги появляются,
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
                const itemRate = comparisons.find((entry) => entry.id === item.id)!.rate;
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
                      <small>{itemRate}% годовых · {item.description}</small>
                      <span className="mode-result-label">Вы получите всего</span>
                      <span className="mode-result">{formatLocalMoney(itemResult.total)}</span>
                      <span className="mode-profit">Ваш доход: +{formatLocalMoney(itemResult.profit)}</span>
                      {extraIncome > 1 && (
                        <span className="mode-extra">На {formatLocalMoney(extraIncome)} больше варианта 1</span>
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
            <span>Ваш результат</span>
            <span>{termLabel(months)} · {selectedMode.short.toLowerCase()}</span>
          </div>

          <div className="primary-result">
            <p>{clientName.trim() ? `${clientName.trim()}, ваш итог` : "Ваш итоговый капитал"}</p>
            <strong>{formatLocalMoney(result.total)}</strong>
            <span>
              Тело {formatShortMoney(amount)} + доход {formatShortMoney(result.profit)}
            </span>
          </div>

          <div className="result-stats">
            <div>
              <span>Чистый доход</span>
              <strong>+{formatLocalMoney(result.profit)}</strong>
            </div>
            <div>
              <span>Ставка предложения</span>
              <strong>{annualRate}%</strong>
            </div>
            <div>
              <span>Эффективно с капитализацией</span>
              <strong>{percentFormatter.format(result.effectiveAnnualRate)}%</strong>
            </div>
            <div>
              <span>Коэффициент роста</span>
              <strong>×{(result.total / amount).toFixed(2)}</strong>
            </div>
          </div>

          <div className="bank-advantage-note">
            <span>Выше ориентира 14%</span>
            <strong>+{percentFormatter.format(bankRateAdvantage)} п.п.</strong>
            <small>Сравнение с банковским ориентиром модели, не с конкретным вкладом.</small>
          </div>

          {mode === "monthly" ? (
            <div className="payment-note">
              <span>Ежемесячная выплата</span>
              <strong>{formatLocalMoney(result.monthlyPayment)}</strong>
              <small>
                За срок выплачено {formatLocalMoney(result.interimIncome)}, в конце
                возвращается тело {formatLocalMoney(result.endPayment)}.
              </small>
            </div>
          ) : (
            <div className="payment-note accent-note">
              <span>
                {mode === "quarterly"
                  ? "Капитализация раз в квартал"
                  : mode === "yearly"
                    ? "Капитализация раз в год"
                    : "Единая выплата в конце"}
              </span>
              <strong>{formatLocalMoney(result.endPayment)}</strong>
              <small>Проценты увеличивают тело капитала, итог выплачивается при завершении срока.</small>
            </div>
          )}

          <div className="benefit-note">
            <span aria-hidden="true">↗</span>
            <p>
              {result.total >= maxGrowth.total - 1 ? (
                <>
                  Вы выбрали самый сильный вариант для этого срока. Он даёт на
                  <strong> {formatLocalMoney(retentionGain)}</strong> больше ежемесячных выплат.
                </>
              ) : (
                <>
                  Самый сильный вариант сейчас — «{bestComparison.short.toLowerCase()}».
                  Итог будет выше ещё на <strong>{formatLocalMoney(maxGrowth.profit - result.profit)}</strong>.
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
              <strong>{formatLocalMoney(clinicInvestment)}</strong>
              <small>1% = {formatLocalMoney(CLINIC_SHARE_PRICE)}</small>
            </div>
          </div>

          <fieldset className="field-block clinic-scenario-field">
            <legend>Какой сценарий прибыли посмотреть?</legend>
            <div className="clinic-scenario-options">
              {CLINIC_SCENARIOS.map((scenario) => {
                const profitYearSom = scenario.netProfitYearUsd * usdToLocalRate;
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
                    <strong>{formatLocalMoney(investorIncome)} / год</strong>
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
            <span>Стоимость приобретения — {formatLocalMoney(clinicInvestment)}</span>
          </div>

          <div className="clinic-income-hero">
            <span>Расчётный доход за {termLabel(months)}</span>
            <strong>+{formatLocalMoney(clinicTermIncome)}</strong>
            <small>из 100% чистой прибыли ОП4, пропорционально вашей доле</small>
          </div>

          <div className="result-stats clinic-result-stats">
            <div>
              <span>В среднем в месяц</span>
              <strong>{formatLocalMoney(clinicAnnualIncome / 12)}</strong>
            </div>
            <div>
              <span>В год</span>
              <strong>{formatLocalMoney(clinicAnnualIncome)}</strong>
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
      <section className="calculator-grid equity-calculator" id="calculator" aria-label="Калькулятор акций RS Holding">
        <div className="control-panel">
          <div className="panel-heading">
            <span className="step-number">01</span>
            <div>
              <p className="section-kicker">Акции RS Holding</p>
              <h2>Ваш пакет и его рост по годам</h2>
            </div>
          </div>

          <div className="field-block equity-investment-field">
            <label htmlFor="equity-investment">Сколько привилегированных акций купить?</label>
            <div className="input-with-unit equity-usd-input">
              <input
                id="equity-investment"
                type="number"
                min={MIN_EQUITY_SHARES}
                max={PREFERRED_SHARES_FOR_SALE}
                step={1}
                value={equityShareCount}
                onChange={(event) => {
                  const shares = clamp(
                    Math.round(Number(event.target.value)),
                    MIN_EQUITY_SHARES,
                    PREFERRED_SHARES_FOR_SALE,
                  );
                  setEquityInvestmentUsd(shares * CURRENT_SHARE_PRICE_USD);
                }}
              />
              <span>акций</span>
            </div>
            <div className="equity-quick-values">
              {[1_000, 5_000, 10_000, 50_000].map((shares) => (
                <button
                  key={shares}
                  type="button"
                  className={equityShareCount === shares ? "active" : ""}
                  onClick={() => setEquityInvestmentUsd(shares * CURRENT_SHARE_PRICE_USD)}
                >{moneyFormatter.format(shares)} акций</button>
              ))}
            </div>
            <p className="equity-kgs-equivalent">
              Стоимость пакета: <strong>{formatUsd(equityExactInvestmentUsd)}</strong> · текущая цена {formatUsd(CURRENT_SHARE_PRICE_USD)} за акцию
            </p>
            <div className="equity-entry-rule">
              <span>Минимальный вход</span>
              <strong>{moneyFormatter.format(MIN_EQUITY_SHARES)} акций = {formatUsd(MIN_EQUITY_SHARES * CURRENT_SHARE_PRICE_USD)}</strong>
              <small>В продаже 300 000 привилегированных акций из общего выпуска 1 000 000.</small>
            </div>
          </div>

          <div className="equity-chronology" aria-label="Хронология роста RS Holding">
            <div>
              <span>Сегодня</span>
              <strong>{formatUsd(holdingCurrentValuationUsd)} оценка · {formatUsd(CURRENT_SHARE_PRICE_USD)} за акцию</strong>
              <small>1 000 000 акций в общем выпуске.</small>
            </div>
            <div>
              <span>1-й год</span>
              <strong>{moneyFormatter.format(YEAR_ONE_CLINICS)} клиник · {formatUsd(YEAR_ONE_VALUATION_USD)} оценка</strong>
              <small>{formatUsd(yearOneSharePriceUsd)} за акцию · ваш дивиденд {formatUsd(equityDividendYear1Usd)}.</small>
            </div>
            <div>
              <span>2-й год</span>
              <strong>{moneyFormatter.format(FRANCHISE_CLINICS)} франшиз · {formatUsd(holdingYear2ValuationUsd)} оценка</strong>
              <small>{formatUsd(yearTwoSharePriceUsd)} за акцию · повторяющийся доход холдинга {formatUsd(holdingRecurringIncomeYear2Usd)} в год.</small>
            </div>
            <div>
              <span>3-й год</span>
              <strong>1 000 зрелых франшиз · {formatUsd(holdingYear3ValuationUsd)} оценка</strong>
              <small>{formatUsd(yearThreeSharePriceUsd)} за акцию · доход сети вырос на 25%, новые клиники не учитываются.</small>
            </div>
          </div>

          <div className="equity-assumption-note">
            <strong>Формула переоценки — простыми словами</strong>
            <p>
              Во 2-й год 1 000 франшиз приносят холдингу минимум $5 000 в месяц каждая:
              $60 млн повторяющегося дохода в год. Для расчёта берём осторожный коэффициент 2× —
              получаем оценку $120 млн. В 3-й год доход каждой франшизы растёт на 25%,
              годовой поток достигает $75 млн, а расчётная оценка — $150 млн.
            </p>
          </div>
        </div>

        <aside className="result-panel equity-result-panel" aria-live="polite">
          <div className="result-topline">
            <span>Привилегированные акции RS Holding</span>
            <span>Хронология · {equityYears} года</span>
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
              По {formatUsd(equityDividendYear1Usd)} ежегодно на выбранный пакет.
              Возможный рост дивидендов в базовый расчёт не включён.
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
              <strong>{formatUsd(CURRENT_SHARE_PRICE_USD)} → {formatUsd(yearThreeSharePriceUsd)}</strong>
            </div>
          </div>

          <div className="equity-growth-engine">
            <p>Оценка холдинга и пакет акций</p>
            <div>
              <span>Текущая оценка: 1 млн × $25</span>
              <strong>{formatUsd(holdingCurrentValuationUsd)}</strong>
            </div>
            <div>
              <span>1-й год: 50 клиник × $1 млн оценки</span>
              <strong>{formatUsd(YEAR_ONE_VALUATION_USD)}</strong>
            </div>
            <div>
              <span>2-й год: $60 млн повторяющегося дохода × 2</span>
              <strong>{formatUsd(holdingYear2ValuationUsd)}</strong>
            </div>
            <div>
              <span>3-й год: $75 млн повторяющегося дохода × 2</span>
              <strong>{formatUsd(holdingYear3ValuationUsd)}</strong>
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
              <span>Оборудование для 1 000 франшиз</span>
              <strong>{formatUsd(holdingEquipmentRevenueUsd)}</strong>
            </div>
            <div>
              <span>60% ЧП оборудования</span>
              <strong>{formatUsd(holdingEquipmentProfitUsd)}</strong>
            </div>
            <div>
              <span>Доход сети в 3-й год</span>
              <strong>{formatUsd(holdingRecurringIncomeYear3Usd)}</strong>
            </div>
          </div>

          <div className="clinic-risk-note equity-risk-note">
            <span aria-hidden="true">i</span>
            <p>
              Оценки $50, $120 и $150 за акцию — расчётные ориентиры, а не гарантированная цена продажи.
              Модель предполагает, что $5 000 — ежемесячный доход RS Holding с одной франшизы.
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
            <p className="section-kicker">Ваше персональное предложение готово</p>
            <h2>{clientName.trim() ? `${clientName.trim()}, посмотрите ваш путь к цели` : "Посмотрите ваш путь к цели"}</h2>
            <p>Ниже — итог, понятный график, три шага роста и документ для обсуждения условий.</p>
          </div>
        </div>

        <article className={`proposal-sheet ${product === "fixed" ? "fixed-proposal" : ""}`}>
          <header className="proposal-header">
            <div className="proposal-brand">
              <Image src="/brand/rich-logo-gold.png" width={453} height={270} alt="R.I.C.H." />
              <span>
                <strong>R.I.C.H.</strong>
                <small>
                  {product === "fixed"
                    ? "Предложение: капитал с фиксированным доходом"
                    : product === "clinic"
                      ? "Предложение: доля в клинике"
                      : "Предложение: акции RS Holding"}
                </small>
              </span>
            </div>
            <span className="proposal-status">Предварительный расчёт</span>
          </header>

          <div className="proposal-title">
            <p>{clientName.trim() ? `Для ${clientName.trim()}` : "Для будущего инвестора"}</p>
            <h2>
              {product === "equity" ? formatUsd(equityExactInvestmentUsd) : formatLocalMoney(activeAmount)} начинают работать на цель «{selectedGoal.title}»
            </h2>
            <span>
              {product === "fixed"
                ? `Срок ${termLabel(months)}, фиксированная ставка ${annualRate}% годовых, выбранный способ — ${selectedMode.short.toLowerCase()}.`
                : product === "clinic"
                  ? `${clinicShare}% доли клиники, сценарий «${clinicScenario.title}», горизонт расчёта — ${termLabel(months)}.`
                  : `Пакет из ${moneyFormatter.format(equityShareCount)} привилегированных акций RS Holding по $25, базовый дивиденд ${EQUITY_MIN_RETURN}% годовых в USD, расчётная цена через 3 года — ${formatUsd(yearThreeSharePriceUsd)}.`}
            </span>
          </div>

          {product === "fixed" && (
            <div className="congratulations-card">
              <span>Персональные условия</span>
              <h3>Поздравляем{clientName.trim() ? `, ${clientName.trim()}` : ""}: ваша ставка — {annualRate}% годовых</h3>
              <p>
                Это на <strong>{percentFormatter.format(bankRateAdvantage)} процентного пункта выше</strong> банковского
                ориентира модели 14%. При выбранной капитализации эффективный рост за год —
                <strong> {percentFormatter.format(result.effectiveAnnualRate)}%</strong>, что на
                <strong> {percentFormatter.format(inflationRateAdvantage)} п.п.</strong> выше инфляционного ориентира модели.
              </p>
            </div>
          )}

          <div className="proposal-metrics">
            <div>
              <span>Вложение</span>
              <strong>{product === "equity" ? formatUsd(equityExactInvestmentUsd) : formatLocalMoney(activeAmount)}</strong>
            </div>
            <div>
              <span>{product === "equity" ? "Рост цены + дивиденды" : "Расчётный доход"}</span>
              <strong>+{product === "equity" ? formatUsd(equityProfitUsd) : formatLocalMoney(activeProfit)}</strong>
            </div>
            <div>
              <span>
                {product === "fixed"
                  ? "Итоговый капитал"
                  : product === "clinic"
                    ? "Доля + расчётный доход"
                    : "Плановая стоимость пакета"}
              </span>
              <strong>{product === "equity" ? formatUsd(equityTotalUsd) : formatLocalMoney(activeTotal)}</strong>
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

          {product === "fixed" && (
            <div className={`fixed-goal-pitch ${goalDifference >= 0 ? "goal-reached" : "goal-in-progress"}`}>
              <div>
                <p className="proposal-label">Что это даёт лично вам</p>
                {goalId === "preserve" ? (
                  <>
                    <h3>{clientName.trim() ? `${clientName.trim()}, ваш капитал не просто сохраняется — он растёт` : "Ваш капитал не просто сохраняется — он растёт"}</h3>
                    <p>
                      Через {termLabel(months)} расчётный капитал составит <strong>{formatLocalMoney(activeTotal)}</strong>.
                      Доход <strong>{formatLocalMoney(activeProfit)}</strong> создаёт запас сверх первоначальной суммы и помогает защитить её покупательную способность.
                    </p>
                  </>
                ) : goalDifference >= 0 ? (
                  <>
                    <h3>{clientName.trim() ? `${clientName.trim()}, цель «${selectedGoal.title}» уже достижима` : `Цель «${selectedGoal.title}» уже достижима`}</h3>
                    <p>
                      К концу срока у вас будет <strong>{formatLocalMoney(activeTotal)}</strong> — это на
                      <strong> {formatLocalMoney(goalDifference)}</strong> больше выбранной стоимости цели.
                      Вам не нужно откладывать решение: расчёт уже показывает достаточный капитал и финансовый запас.
                    </p>
                  </>
                ) : (
                  <>
                    <h3>{clientName.trim() ? `${clientName.trim()}, вы уже закрываете ${percentFormatter.format(goalProgress)}% цели` : `Вы уже закрываете ${percentFormatter.format(goalProgress)}% цели`}</h3>
                    <p>
                      До цели «{selectedGoal.title}» остаётся <strong>{formatLocalMoney(Math.abs(goalDifference))}</strong>.
                      Добавляйте по <strong>{formatLocalMoney(suggestedMonthlyTopUp)} в месяц</strong> в течение первого года — и расчётный итог вырастет до <strong>{formatLocalMoney(projectedGoalTotal)}</strong>.
                    </p>
                  </>
                )}
              </div>
              <strong className="fixed-goal-action">Следующий шаг: зафиксировать условия и подготовить основной договор.</strong>
            </div>
          )}

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
              <span>Итог: {formatLocalMoney(activeTotal)}</span>
              <span>{goalId === "preserve" ? "Было" : "Цель"}: {formatLocalMoney(effectiveGoalAmount)}</span>
            </div>
          </div>

          <div className="goal-offer-section">
            <div className="goal-offer-copy">
              <p className="proposal-label">{goalOffer.eyebrow}</p>
              <h3>{goalOffer.headline}</h3>
              <p>{goalOffer.description}</p>
              {goalId === "preserve" && currency === "KGS" && (
                <a
                  href="https://www.nbkr.kg/newsout.jsp?item=31&lang=RUS&material=132131"
                  target="_blank"
                  rel="noreferrer"
                >
                  Ориентир: годовая инфляция 10,9% по данным НБКР на 15 мая 2026 года
                </a>
              )}
              {goalId === "preserve" && currency !== "KGS" && (
                <small className="currency-model-note">
                  10,9% — единый модельный ориентир калькулятора, а не официальный прогноз инфляции для {currencyConfig.label.toLowerCase()}.
                </small>
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
                  Цель «{selectedGoal.title}» покрыта. Запас — {formatLocalMoney(goalDifference)}.
                </h3>
              ) : (
                <h3>
                  Расчёт формирует {percentFormatter.format(goalProgress)}% цели.
                  Останется {formatLocalMoney(Math.abs(goalDifference))}.
                </h3>
              )}
              <p>
                {product === "equity"
                  ? `За 3 года пакет приносит ${formatUsd(equityTotalDividendsUsd)} дивидендов, а плановая стоимость самих акций составляет ${formatUsd(equityTargetShareValueUsd)}.`
                  : goalId === "preserve"
                  ? `Расчётный доход составляет ${formatLocalMoney(activeProfit)} и работает вместе с основной суммой.`
                  : `Один только доход создаёт ${percentFormatter.format(profitGoalShare)}% стоимости выбранной цели.`}
              </p>
            </div>
            <ul>
              {product === "fixed" ? (
                <>
                  <li><span>Ставка</span><strong>{annualRate}% годовых</strong></li>
                  <li><span>Срок</span><strong>{termLabel(months)}</strong></li>
                  <li><span>Выплата</span><strong>{selectedMode.short}</strong></li>
                  <li><span>Итог</span><strong>{formatLocalMoney(activeTotal)}</strong></li>
                </>
              ) : product === "clinic" ? (
                <>
                  <li><span>Доля</span><strong>{clinicShare}%</strong></li>
                  <li><span>Сценарий</span><strong>{clinicScenario.title}</strong></li>
                  <li><span>Доход в год</span><strong>{formatLocalMoney(clinicAnnualIncome)}</strong></li>
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

          {product === "fixed" && (
            <>
              <div className="acceleration-section">
                <div className="acceleration-heading">
                  <p className="proposal-label">Три шага к цели быстрее</p>
                  <h3>
                    {goalDifference >= 0
                      ? "Закрепите достигнутый результат"
                      : `Сейчас расчёт закрывает ${percentFormatter.format(goalProgress)}% цели «${selectedGoal.title}»`}
                  </h3>
                </div>
                <ol>
                  <li>
                    <span>01</span>
                    <div>
                      <strong>{mode === "maturity" && months === 36 ? "Сохранить выплату в конце срока" : "Выбрать выплату в конце на 3 года"}</strong>
                      <p>{mode === "maturity" && months === 36 ? "Так сохраняется бонус +6% и максимальная ставка 36%." : "Это открывает бонус +6% и максимальную ставку 36%."}</p>
                    </div>
                  </li>
                  <li>
                    <span>02</span>
                    <div>
                      <strong>Добавить {formatLocalMoney(plannedTopUpTotal)} за первый год</strong>
                      <p>Ориентир — по {formatLocalMoney(suggestedMonthlyTopUp)} в месяц.</p>
                    </div>
                  </li>
                  <li>
                    <span>03</span>
                    <div>
                      <strong>Зафиксировать условия</strong>
                      <p>Подписать протокол намерений и перейти к подготовке основного договора.</p>
                    </div>
                  </li>
                </ol>
              </div>

              <div className="schedule-section">
                <div className="schedule-heading">
                  <div>
                    <p className="proposal-label">График роста</p>
                    <h3>{mode === "monthly" ? "Тело остаётся в работе, доход выплачивается" : "Проценты увеличивают тело капитала"}</h3>
                  </div>
                  <strong>{formatLocalMoney(result.total)} в конце</strong>
                </div>
                <div className="schedule-chart" aria-label="График роста капитала по кварталам">
                  {fixedSchedule.slice(1).map((point) => (
                    <div className="schedule-bar-row" key={point.month}>
                      <span>{point.month} мес.</span>
                      <div><i style={{ width: `${Math.max(8, (point.total / scheduleMaximum) * 100)}%` }} /></div>
                      <strong>{formatLocalMoney(point.total)}</strong>
                    </div>
                  ))}
                </div>
                <div className="schedule-table-wrap">
                  <table className="schedule-table">
                    <thead>
                      <tr>
                        <th>Период</th>
                        <th>Капитал в работе</th>
                        <th>{mode === "monthly" ? "Получено процентов" : "Проценты в капитале"}</th>
                        <th>Общий результат</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fixedSchedule.map((point) => (
                        <tr key={point.month}>
                          <td>{point.month === 0 ? "Старт" : `${point.month} мес.`}</td>
                          <td>{formatLocalMoney(point.capitalAtWork)}</td>
                          <td>+{formatLocalMoney(point.profit)}</td>
                          <td>{formatLocalMoney(point.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

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
                      ? `Приобретите ещё ${clinicSuggestedExtraShares}% доли за ${formatLocalMoney(clinicSuggestedInvestment)}.`
                      : `Добавьте ещё 1% доли за ${formatLocalMoney(CLINIC_SHARE_PRICE)}.`}
                  </strong>
                  <p>
                    Тогда доля вместе с расчётным доходом за {termLabel(months)} составит
                    <strong> {formatLocalMoney(clinicProjectedTotal)}</strong>.
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
                    С базовыми дивидендами {EQUITY_MIN_RETURN}% в год и расчётной ценой {formatUsd(yearThreeSharePriceUsd)} за акцию стоимость пакета через 3 года составит
                    <strong> {formatUsd(equityProjectedTotalUsd)}</strong>.
                    {equityGoalGap > 0
                      ? equityPlanReachesGoal
                        ? ` Этого достаточно для цели «${selectedGoal.title}» по курсу модели.`
                        : " Доступного остатка выпуска недостаточно, чтобы полностью закрыть выбранную цель."
                      : " Чем больше пакет, тем больше сумма дивидендов и потенциальный результат от роста цены."}
                  </p>
                  <small>
                    Переоценка до {formatUsd(yearThreeSharePriceUsd)} за акцию — прогноз, а не гарантия.
                    Она рассчитана как 2× повторяющийся годовой доход RS Holding; фактическая цена зависит от результатов бизнеса.
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
                    Переоценка до {formatUsd(yearThreeSharePriceUsd)} за акцию — прогноз, а не гарантия.
                    Она рассчитана как 2× повторяющийся годовой доход RS Holding; фактическая цена зависит от результатов бизнеса.
                  </small>
                </>
              ) : bestScenarioGap > 0 ? (
                <>
                  <strong className="topup-headline">
                    Внесите ещё {formatLocalMoney(plannedTopUpTotal)} в течение {contributionMonths === 12 ? "первого года" : `первых ${contributionMonths} месяцев`}.
                  </strong>
                  <p>
                    Это по <strong>{formatLocalMoney(suggestedMonthlyTopUp)} в месяц</strong>.
                    Если оставить все проценты работать до конца срока, расчётный итог составит
                    <strong> {formatLocalMoney(projectedGoalTotal)}</strong> — выбранная цель будет достигнута за {termLabel(months)}.
                  </p>
                </>
              ) : (
                <>
                  <strong className="topup-headline">
                    Цель уже достижима. Добавьте ещё {formatLocalMoney(plannedTopUpTotal)} в течение {contributionMonths === 12 ? "года" : `${contributionMonths} месяцев`}.
                  </strong>
                  <p>
                    Это по <strong>{formatLocalMoney(suggestedMonthlyTopUp)} в месяц</strong>.
                    Не забирая проценты, вы увеличите расчётный итог до
                    <strong> {formatLocalMoney(projectedGoalTotal)}</strong> и создадите дополнительный запас для цели.
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

          <div className="proposal-closing compact-closing intent-agreement">
            <div className="intent-title">
              <p className="proposal-label">Документ для обсуждения и подписи</p>
              <h3>Протокол инвестиционных намерений</h3>
            </div>
            <div className="intent-terms">
              <div><span>Инвестор</span><strong>{clientName.trim() || "________________"}</strong></div>
              <div><span>Продукт</span><strong>{product === "fixed" ? "Доходный капитал" : product === "clinic" ? "Доля в клинике" : "Акции RS Holding"}</strong></div>
              <div><span>Сумма</span><strong>{product === "equity" ? formatUsd(equityExactInvestmentUsd) : formatLocalMoney(activeAmount)}</strong></div>
              <div><span>Цель</span><strong>{selectedGoal.title}</strong></div>
              {product === "fixed" && <div><span>Срок и ставка</span><strong>{termLabel(months)} · {annualRate}% годовых</strong></div>}
              {product === "fixed" && <div><span>Получение дохода</span><strong>{selectedMode.short}</strong></div>}
              <div><span>Расчётный итог</span><strong>{product === "equity" ? formatUsd(equityTotalUsd) : formatLocalMoney(activeTotal)}</strong></div>
            </div>
            <p className="intent-copy">
              Стороны фиксируют выбранные параметры для подготовки основного договора. Протокол является предварительным и не заменяет основной договор.
            </p>
            <div className="proposal-signatures">
              <span>Инвестор ____________________ / {clientName.trim() || "Ф. И. О."}</span>
              <span>Представитель R.I.C.H. ____________________</span>
              <span>Дата «____» __________ 20____ г.</span>
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
        <span>Валюта расчёта: {currencyConfig.label} ({currencyConfig.code})</span>
      </footer>
    </main>
  );
}
