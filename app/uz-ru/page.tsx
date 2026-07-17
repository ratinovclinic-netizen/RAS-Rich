import { InvestmentCalculator } from "../InvestmentCalculator";

export default function UzbekistanRussiaCalculator() {
  return (
    <InvestmentCalculator
      initialCurrency="UZS"
      currencyOptions={["UZS", "RUB"]}
    />
  );
}
