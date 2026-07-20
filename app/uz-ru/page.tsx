import { InvestmentCalculator } from "../InvestmentCalculator";

export default function SomDollarCalculatorAlias() {
  return (
    <InvestmentCalculator
      initialCurrency="KGS"
      currencyOptions={["KGS"]}
      usdModelRate={100}
    />
  );
}
