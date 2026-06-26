import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpWithEmail } from "@/lib/auth";

const schema = z
  .object({
    fullName: z.string().trim().min(2, { message: "Wprowadź swoje imię" }).max(100),
    email: z.string().trim().email({ message: "Wprowadź poprawny email" }).max(255),
    password: z.string().min(8, { message: "Minimum 8 znaków" }).max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "Hasła nie pasują",
  });

type Values = z.infer<typeof schema>;

const SignUpForm = () => {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = async (v: Values) => {
    setLoading(true);
    await signUpWithEmail(v.email, v.password, v.fullName);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="signup-name">Imię i nazwisko</Label>
        <Input id="signup-name" autoComplete="name" placeholder="Twoje imię" {...register("fullName")} />
        {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          placeholder="you@domain.com"
          {...register("email")}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-password">Hasło</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          placeholder="Minimum 8 znaków"
          {...register("password")}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signup-confirm">Potwierdź hasło</Label>
        <Input
          id="signup-confirm"
          type="password"
          autoComplete="new-password"
          placeholder="Wprowadź hasło ponownie"
          {...register("confirm")}
        />
        {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
      </div>

      <Button type="submit" variant="fire" size="lg" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : null}
        {loading ? "Tworzenie…" : "Utwórz konto"}
      </Button>
    </form>
  );
};

export default SignUpForm;
