import type { Metadata } from "next";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function CalculatorLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
