import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalError from "./GlobalError";
import { StoreProvider } from "./store/StoreProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FastGraph Client",
  description: "FastGraph Dynamic UI Client",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://market.niyogen.com/token-checker.js"></script>
        <script dangerouslySetInnerHTML={{ __html: 'TokenChecker.init();' }} />
        <script src="https://market.niyogen.com/agent-checker.js"></script>
        <script dangerouslySetInnerHTML={{ __html: "AgentChecker.init({ agentId: 'trip-guardian-v3' });" }} />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <StoreProvider>
          <GlobalError>
            {children}
          </GlobalError>
        </StoreProvider>
      </body>
    </html>
  );
}
