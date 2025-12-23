import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protege apenas rotas /admin
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Admin Area"',
      },
    });
  }

  const base64Credentials = authHeader.replace("Basic ", "");
  const credentials = Buffer.from(base64Credentials, "base64").toString();
  const [username, password] = credentials.split(":");

  // Usuário fixo + senha do .env
  if (
    username === "admin" &&
    password === process.env.ADMIN_PASSWORD
  ) {
    return NextResponse.next();
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin Area"',
    },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
