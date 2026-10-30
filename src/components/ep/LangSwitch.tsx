import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function LangSwitch({ variant = "outline" }: { variant?: "outline" | "ghost" | "secondary" }) {
  const { lang, setLang, t } = useI18n();
  return (
    <Button variant={variant} size="sm" onClick={() => setLang(lang === "en" ? "ar" : "en")}>
      <Languages className="h-4 w-4" />
      {t("language")}
    </Button>
  );
}
