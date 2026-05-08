import "./globals.css";

export const metadata = {
  title: "AI Ops Monitor",
  description: "Real-time observability platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}