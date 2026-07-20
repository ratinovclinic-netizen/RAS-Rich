import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "A.R.K. — персональный ИИ-ассистент",
  description: "Ваш личный онлайн-ассистент с голосом, памятью и режимами работы.",
  openGraph: {
    title: "A.R.K. — персональный ИИ-ассистент",
    description: "Думает вместе с вами. Помнит контекст. Всегда на связи.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
