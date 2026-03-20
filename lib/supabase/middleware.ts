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
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isDebugRoute = request.nextUrl.pathname.startsWith("/debug");

  if (!user) {
    if (isDashboardRoute || isOnboardingRoute || isAdminRoute) {
      // All unauthenticated users go to regular login
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } else {
    // User is authenticated
    if (isAuthRoute || (request.nextUrl.pathname === "/" && !isDashboardRoute)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    try {
      // Fetch user profile to check role and tenant using regular client
      // RLS on profiles table already allows users to see their own profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

      if (!profile) {
        // No profile yet, likely needs onboarding
        if (!isOnboardingRoute && isDashboardRoute) {
          return NextResponse.redirect(new URL("/onboarding", request.url));
        }
        return response;
      }

      // Super admin logic (ADMIN role with no tenant_id)
      if (profile.role === 'ADMIN' && !profile.tenant_id) {
        if (isAdminRoute) return response;
        if (isDashboardRoute || isOnboardingRoute || request.nextUrl.pathname === "/") {
          return NextResponse.redirect(new URL("/admin", request.url));
        }
      }

      // Tenant admin logic (ADMIN role with tenant_id)
      if (profile.role === 'ADMIN' && profile.tenant_id) {
        if (isAdminRoute) {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
        if (isDashboardRoute) return response;
        // Default redirect to dashboard if not already there
        if (request.nextUrl.pathname === "/" || isOnboardingRoute) {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
      }

      // Regular tenant user logic (WORKER role with tenant_id)
      if (profile.role === 'WORKER' && profile.tenant_id) {
         if (isAdminRoute) {
           return NextResponse.redirect(new URL("/dashboard", request.url));
         }
         
         // Attach tenant_id to headers for use in server components/actions
         response.headers.set('x-tenant-id', profile.tenant_id);

         // Check onboarding status
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
    } catch (error) {
      console.error("Middleware Error:", error);
      // In case of error fetching profile, allow request to proceed to avoid 500
      // RLS will protect actual data even if middleware fails
      return response;
    }
  }

  return response;
}
