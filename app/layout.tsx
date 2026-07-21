import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "R.I.C.H. — командный центр инвест-отдела",
  description: "Автономный контроль показателей инвестиционного отдела по данным Bitrix24 и Google Sheets.",
  openGraph: {
    title: "R.I.C.H. — командный центр инвест-отдела",
    description: "Деньги, конверсии, менеджеры, узкие места и качество данных в одном центре.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
