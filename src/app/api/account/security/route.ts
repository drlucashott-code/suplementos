import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSiteUser } from "@/lib/siteAuth";

export async function DELETE() {
  const user = await getCurrentSiteUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "SiteUser"
      WHERE "id" = ${user.id}
    `);

    const response = NextResponse.json({ ok: true });
    response.cookies.set("amazonpicks_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error("account_delete_failed", error);
    return NextResponse.json({ ok: false, error: "account_delete_failed" }, { status: 500 });
  }
}
