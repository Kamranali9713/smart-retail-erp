import "./globals.css";
import Providers from "@/components/Providers";

export const metadata = {
  title: "Smart Retail ERP & POS System",
  description: "Complete Retail Shop Management & POS System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
