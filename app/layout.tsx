import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ИнвестКапитал — персональный расчёт доходности",
  description:
    "Автоматическая ставка 18–36% по сумме и сроку, сравнение капитализации и персональное предложение с целью инвестора.",
  openGraph: {
    title: "ИнвестКапитал — деньги работают на вашу цель",
    description:
      "Рассчитайте доход, выберите цель и сохраните персональное предложение.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
