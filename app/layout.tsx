import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ИнвестКапитал — калькулятор сложного процента",
  description:
    "Сравнение ежемесячных выплат и капитализации для инвестиций от 500 000 до 10 000 000 сом по ставке 18–36% годовых.",
  openGraph: {
    title: "ИнвестКапитал — сила сложного процента",
    description:
      "Рассчитайте доход инвестора и сравните стратегии капитализации.",
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
