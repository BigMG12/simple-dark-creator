import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithEmail } from "@/lib/auth";

const schema = z.object({
  email: z.string().trim().email({ message: "Wprowadź poprawny email" }).max(255),
  password: z.string().min(8, { message: "Minimum 8 znaków" }).max(72),
});

type Values = z.infer<typeof schema>;

const SignInForm = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: Values) => {
    setLoading(true);
    const ok = await signInWithEmail(v.email, v.password);
    setLoading(false);
    if (ok) navigate("/welcome");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          placeholder="you@domain.com"
          {...register("email")}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signin-password">Hasło</Label>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...register("password")}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <div className="flex justify-end">
        <Link
          to="/forgot-password"
          className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
        >
          Zapomniałeś hasła?
        </Link>
      </div>

      <Button type="submit" variant="fire" size="lg" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : null}
        {loading ? "Logowanie…" : "Zaloguj się"}
      </Button>
    </form>
  );
};

export default SignInForm;
