import type { MetadataRoute } from "next";
import { buildAbsoluteUrl } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/entrar",
        "/cadastro",
        "/esqueci-senha",
        "/redefinir-senha",
        "/verificar-email",
        "/minha-conta/",
      ],
    },
    sitemap: buildAbsoluteUrl("/sitemap.xml"),
    host: buildAbsoluteUrl("/"),
  };
}
