import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start Free Trial",
  description: "Create your free PrintFlow account. Setup your print shop in 3 minutes. No credit card required.",
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
