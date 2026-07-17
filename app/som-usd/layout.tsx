import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "R.I.C.H. — калькулятор в сомах и долларах",
  description: "Инвестиционный калькулятор R.I.C.H. для расчётов в кыргызских сомах и долларах США.",
};

export default function SomDollarLayout({ children }: { children: ReactNode }) {
  return children;
}
