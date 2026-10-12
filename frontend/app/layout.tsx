import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";
import { AppProvider } from "./context/AppContext";
import { Web3Provider } from "./providers/Web3Provider";
import { PageTransition } from "./providers/PageTransition";


export const metadata: Metadata = {
  title: "Export License Registry — DID-bound ERC-721",
  description: "Issue export licenses only to registered DIDs. Transfers to unregistered wallets revert. Auditor feed with indexer lag.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Web3Provider>
          <AppProvider>
            <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
              <Navbar />
              <main style={{ flex: 1, paddingBottom: "60px" }}>
                <PageTransition>{children}</PageTransition>
              </main>

            <footer
              style={{
                borderTop: "1px solid var(--border)",
                padding: "24px 0",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "0.85rem",
                fontFamily: "var(--font-mono)",
              }}
            >
              <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>Export licenses • DID-bound transfers • indexer lag is visible</div>
                <div style={{ display: "flex", gap: "16px" }}>
                  <span>Solidity 0.8.24</span>
                  <span>JWT auditor feed</span>
                </div>
              </div>
            </footer>
          </div>
        </AppProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
