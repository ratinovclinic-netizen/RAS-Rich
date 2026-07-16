import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "R.I.C.H. — Ratinov Invest Club of Health",
  description:
    "Три инвестиционных продукта в сфере здоровья: доходный капитал, доля в клинике и акции медицинского холдинга.",
  openGraph: {
    title: "R.I.C.H. — инвестируем в здоровье, умножаем капитал",
    description:
      "Выберите продукт, рассчитайте доход и сохраните персональное предложение.",
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
