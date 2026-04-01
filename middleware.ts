import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { user, response } = await updateSupabaseSession(request);

  if (!request.nextUrl.pathname.startsWith("/dashboard")) {
    return response;
  }

  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
