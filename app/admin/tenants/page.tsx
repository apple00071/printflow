"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TenantsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the unified admin dashboard where all management now lives
    router.replace('/admin');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}
