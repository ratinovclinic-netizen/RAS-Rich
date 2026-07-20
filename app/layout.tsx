import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "R.I.C.H. — Ratinov Invest Club of Health",
  description:
    "Персональный инвестиционный расчёт R.I.C.H.: доходный капитал, доля в клинике и акции медицинского холдинга.",
  openGraph: {
    title: "R.I.C.H. — капитал для здоровья, свободы и будущего",
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
