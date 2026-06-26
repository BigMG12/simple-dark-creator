import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendPasswordResetEmail } from "@/lib/auth";

const schema = z.object({
  email: z.string().trim().email({ message: "Wprowadź poprawny email" }).max(255),
});
type Values = z.infer<typeof schema>;

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: Values) => {
    setLoading(true);
    const ok = await sendPasswordResetEmail(v.email);
    setLoading(false);
    if (ok) setSent(true);
  };

  return (
    <AuthShell>
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Zresetuj hasło</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Wprowadź swój email, a wyślemy Ci link resetujący.
        </p>
      </div>

      {sent ? (
        <p className="mt-6 rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">
          Sprawdź swoją skrzynkę — link resetujący jest w drodze.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder="you@domain.com"
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <Button type="submit" variant="fire" size="lg" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : null}
            {loading ? "Wysyłanie…" : "Wyślij link resetujący"}
          </Button>
        </form>
      )}

      <Link
        to="/auth"
        className="mt-6 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-3 w-3" /> Powrót do logowania
      </Link>
    </AuthShell>
  );
};

export default ForgotPassword;
