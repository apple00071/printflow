import { NextResponse, type NextRequest } from "next/server";

// ponytail: Supabase removed temporarily — passthrough only.
// Re-add auth when Supabase project is restored.
export async function updateSession(request: NextRequest) {
  return NextResponse.next();
}
