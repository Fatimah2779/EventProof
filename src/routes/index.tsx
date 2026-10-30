import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, FileSearch, Upload, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LangSwitch } from "@/components/ep/LangSwitch";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EventProof — AI Event Readiness & Verification" },
      { name: "description", content: "Turn event requirements into checklists, upload evidence, and verify readiness with AI. Arabic & English." },
      { property: "og:title", content: "EventProof — AI Event Readiness & Verification" },
      { property: "og:description", content: "Turn event requirements into checklists, upload evidence, and verify readiness with AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const features =
    lang === "ar"
      ? [
          [FileSearch, "تحليل المتطلبات", "استخراج المهام والمعايير مع الإشارة إلى المصدر."],
          [Upload, "رفع الأدلة", "صور ومستندات لكل معيار مع سجل كامل."],
          [ShieldCheck, "تحقق ذكي", "تم التحقق، مرفوض، أو مراجعة يدوية مع درجة الثقة."],
          [BarChart3, "تقارير الجاهزية", "نسبة موزونة وتقرير قابل للطباعة."],
        ]
      : [
          [FileSearch, "Requirement analysis", "Tasks and measurable criteria, each linked to its source."],
          [Upload, "Evidence upload", "Images and documents per criterion with full history."],
          [ShieldCheck, "AI verification", "Verified, rejected or manual review — with confidence."],
          [BarChart3, "Readiness reports", "Weighted readiness and a printable final report."],
        ];
  return (
    <div className="min-h-screen bg-hero text-navy-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-display text-xl font-bold">
          <ShieldCheck className="h-7 w-7 text-success" /> {t("appName")}
        </div>
        <LangSwitch variant="secondary" />
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-16">
        <p className="mb-4 inline-block rounded-full border border-navy-foreground/20 px-3 py-1 text-sm text-navy-foreground/80">
          {t("tagline")}
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">{t("heroTitle")}</h1>
        <p className="mt-6 max-w-2xl text-lg text-navy-foreground/75">{t("heroBody")}</p>
        <div className="mt-10 flex gap-3">
          <Button asChild size="lg" className="bg-success text-success-foreground hover:bg-success/90">
            <Link to={user ? "/events" : "/auth"}>{user ? t("myEvents") : t("getStarted")}</Link>
          </Button>
        </div>
        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([Icon, title, body], i) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <div key={i} className="rounded-xl border border-navy-foreground/15 bg-navy-foreground/5 p-5 backdrop-blur">
                <I className="mb-3 h-6 w-6 text-success" />
                <h3 className="font-semibold">{title as string}</h3>
                <p className="mt-1 text-sm text-navy-foreground/70">{body as string}</p>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
