import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Handle Protected Routes
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");
  const isOnboardingRoute = request.nextUrl.pathname.startsWith("/onboarding");
  const isAuthRoute = request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup";

  if (!user) {
    if (isDashboardRoute || isOnboardingRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } else {
    // User is authenticated
    if (isAuthRoute || request.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Fetch tenant and onboarding status
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profile?.tenant_id) {
       // Attach tenant_id to headers for use in server components/actions
       response.headers.set('x-tenant-id', profile.tenant_id);

       const { data: tenant } = await supabase
         .from('tenants')
         .select('onboarding_complete')
         .eq('id', profile.tenant_id)
         .single();

       if (tenant) {
         if (!tenant.onboarding_complete && !isOnboardingRoute && !request.nextUrl.pathname.startsWith('/api')) {
           return NextResponse.redirect(new URL("/onboarding", request.url));
         }
         if (tenant.onboarding_complete && isOnboardingRoute) {
           return NextResponse.redirect(new URL("/dashboard", request.url));
         }
       }
    }
  }

  return response;
}
