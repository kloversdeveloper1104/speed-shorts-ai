import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/youtube/oauth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/setup?auth_error=${encodeURIComponent(error)}`, req.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL(`/setup?auth_error=no_code`, req.url));
  }

  try {
    await exchangeCodeForTokens(code);
    return NextResponse.redirect(new URL(`/setup?auth_success=1`, req.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(new URL(`/setup?auth_error=${encodeURIComponent(message)}`, req.url));
  }
}
