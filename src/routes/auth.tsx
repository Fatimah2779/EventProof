import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LangSwitch } from "@/components/ep/LangSwitch";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — EventProof" },
      { name: "description", content: "Sign in to EventProof to manage event readiness." },
      { property: "og:title", content: "Sign in — EventProof" },
      { property: "og:description", content: "Sign in to EventProof to manage event readiness." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) nav({ to: "/events" });
  }, [user, nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        toast.success(t("checkEmail"));
        setMode("in");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(String((r.error as Error).message ?? r.error));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-4">
      <div className="absolute end-4 top-4"><LangSwitch variant="secondary" /></div>
      <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-card">
        <Link to="/" className="mb-6 flex items-center gap-2 font-display text-xl font-bold text-primary">
          <ShieldCheck className="h-6 w-6 text-success" /> {t("appName")}
        </Link>
        <h1 className="mb-6 text-2xl font-bold">{mode === "in" ? t("signIn") : t("signUp")}</h1>
        <Button variant="outline" className="w-full" onClick={google} type="button">{t("continueGoogle")}</Button>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />{t("or")}<div className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label>{t("email")}</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" /></div>
          <div className="space-y-1.5"><Label>{t("password")}</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" /></div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "in" ? t("signIn") : t("signUp")}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "in" ? t("noAccount") : t("haveAccount")}{" "}
          <button className="font-medium text-success underline-offset-4 hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? t("signUp") : t("signIn")}
          </button>
        </p>
      </div>
    </div>
  );
}
