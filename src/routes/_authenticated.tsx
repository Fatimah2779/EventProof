import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ShieldCheck, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LangSwitch } from "@/components/ep/LangSwitch";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: Layout,
});

function Layout() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);
  if (loading || !user)
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-success" /></div>;
  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-30 bg-navy text-navy-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/events" className="flex items-center gap-2 font-display text-lg font-bold">
            <ShieldCheck className="h-6 w-6 text-success" /> {t("appName")}
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-navy-foreground/70 sm:inline">{user.email}</span>
            <LangSwitch variant="secondary" />
            <Button variant="ghost" size="sm" className="hover:bg-navy-foreground/10 hover:text-navy-foreground" onClick={() => supabase.auth.signOut()}>
              <LogOut className="h-4 w-4" /><span className="hidden sm:inline">{t("signOut")}</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8"><Outlet /></main>
    </div>
  );
}
