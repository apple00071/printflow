import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Log in to your PrintFlow account to manage your print shop, track orders, and send WhatsApp receipts.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
