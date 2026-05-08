import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import Header from "@/app/Header";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  asideEyebrow: string;
  asideTitle: string;
  asideDescription: string;
  highlights: Array<{
    title: string;
    description: string;
  }>;
  footer?: ReactNode;
};

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
  asideEyebrow,
  asideTitle,
  asideDescription,
  highlights,
  footer,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[#E3E6E6] pb-10">
      <Header />

      <div className="mx-auto max-w-[1180px] px-4 py-6 md:py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <section className="rounded-[32px] border border-[#d5d9d9] bg-white p-6 shadow-sm md:p-8">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#CC0C39]">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-[clamp(2rem,3vw,2.75rem)] font-black tracking-tight text-[#0F1111]">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#565959] md:text-[15px]">
              {description}
            </p>

            <div className="mt-6">{children}</div>
          </section>

          <aside className="overflow-hidden rounded-[32px] border border-[#0f172a] bg-[#0F1111] text-white shadow-[0_24px_80px_rgba(15,17,17,0.28)]">
            <div className="border-b border-white/10 px-6 py-6 md:px-7 md:py-7">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#FFD814]">
                {asideEyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-white">{asideTitle}</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/72">{asideDescription}</p>
            </div>

            <div className="space-y-4 px-6 py-6 md:px-7">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFD814] text-[#0F1111]">
                      <ShieldCheck className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-white/72">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {footer ? <div className="border-t border-white/10 px-6 py-6 md:px-7">{footer}</div> : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
