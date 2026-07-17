import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "R.I.C.H. — калькулятор в сумах и рублях",
  description: "Инвестиционный калькулятор R.I.C.H. для расчётов в узбекских сумах и российских рублях.",
};

export default function UzbekistanRussiaLayout({ children }: { children: ReactNode }) {
  return children;
}
