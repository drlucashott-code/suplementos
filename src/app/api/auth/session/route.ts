import { NextResponse } from "next/server";
import { getCurrentSiteUser } from "@/lib/siteAuth";

export async function GET() {
  const user = await getCurrentSiteUser();

  return NextResponse.json({
    authenticated: Boolean(user),
    user,
  });
}
