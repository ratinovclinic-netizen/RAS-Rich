import { InvestmentCalculator } from "../InvestmentCalculator";

export default function SomDollarCalculator() {
  return (
    <InvestmentCalculator
      initialCurrency="KGS"
      currencyOptions={["KGS"]}
      usdModelRate={100}
    />
  );
}
