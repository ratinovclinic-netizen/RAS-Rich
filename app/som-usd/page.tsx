import { InvestmentCalculator } from "../InvestmentCalculator";

export default function SomDollarCalculator() {
  return (
    <InvestmentCalculator
      initialCurrency="KGS"
      currencyOptions={["KGS", "USD"]}
      usdModelRate={100}
    />
  );
}
