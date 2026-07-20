import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "R.I.C.H. — Ratinov Invest Club of Health",
  description:
    "Персональный инвестиционный расчёт R.I.C.H.: доходный капитал, доля в клинике и акции медицинского холдинга.",
  openGraph: {
    title: "R.I.C.H. — Инвестируй в медицину будущего",
    description: "Инвестиционные продукты R.I.C.H.",
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
