import { InvestmentCalculator } from "./InvestmentCalculator";

export default function Home() {
  return (
    <InvestmentCalculator
      initialCurrency="KGS"
      currencyOptions={["KGS"]}
      usdModelRate={87.5}
    />
  );
}
