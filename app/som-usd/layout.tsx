import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "R.I.C.H. — инвестиционный калькулятор в сомах",
  description: "Персональный инвестиционный расчёт R.I.C.H. в кыргызских сомах.",
};

export default function SomDollarLayout({ children }: { children: ReactNode }) {
  return children;
}
