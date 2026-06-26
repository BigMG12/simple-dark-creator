import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  PartyPopper,
  AlertCircle,
  X,
} from "lucide-react";
import confetti from "canvas-confetti";
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from "@/lib/auth";

type Step = "email" | "password" | "confirmPassword";
type ModalStatus = "closed" | "loading" | "error" | "success";
type Mode = "signin" | "signup";

interface AuthComponentProps {
  logo?: React.ReactNode;
  brandName?: string;
  onAuthenticated?: () => void;
  defaultMode?: Mode;
}

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 48 48" width="18" height="18" {...props}>
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
  </svg>
);

const fireConfetti = () => {
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100, particleCount: 60 };
  confetti({ ...defaults, origin: { x: 0, y: 1 }, angle: 60 });
  confetti({ ...defaults, origin: { x: 1, y: 1 }, angle: 120 });
};

const GradientBackground = () => (
  <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
    <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/30 blur-3xl animate-pulse" />
    <div
      className="absolute top-1/3 -right-40 h-[28rem] w-[28rem] rounded-full bg-accent/30 blur-3xl animate-pulse"
      style={{ animationDelay: "1.5s" }}
    />
    <div
      className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-secondary/30 blur-3xl animate-pulse"
      style={{ animationDelay: "3s" }}
    />
  </div>
);

const inputCls =
  "relative z-10 h-full w-0 flex-grow bg-transparent text-foreground placeholder:text-foreground/50 focus:outline-none px-3 py-2";

const glassRow =
  "flex w-full items-center gap-1 rounded-full border border-foreground/10 bg-background/40 backdrop-blur-md p-1 shadow-[inset_0_1px_0_hsl(var(--background)/0.6),0_8px_24px_-8px_hsl(var(--foreground)/0.15)]";

const glassButton =
  "relative isolate inline-flex items-center justify-center rounded-full px-6 py-3 font-medium tracking-tight " +
  "border border-foreground/10 bg-background/50 backdrop-blur-md text-foreground " +
  "shadow-[inset_0_1px_0_hsl(var(--background)/0.6),0_6px_20px_-6px_hsl(var(--foreground)/0.2)] " +
  "transition-all duration-200 hover:scale-[0.98] hover:bg-background/70 active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none";

export const AuthComponent = ({
  logo,
  brandName = "EaseMize",
  onAuthenticated,
  defaultMode = "signin",
}: AuthComponentProps) => {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authStep, setAuthStep] = useState<Step>("email");
  const [modalStatus, setModalStatus] = useState<ModalStatus>("closed");
  const [modalErrorMessage, setModalErrorMessage] = useState("");

  const isEmailValid = /\S+@\S+\.\S+/.test(email);
  const isPasswordValid = password.length >= 6;
  const isConfirmPasswordValid = confirmPassword.length >= 6;

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authStep === "password") setTimeout(() => passwordInputRef.current?.focus(), 300);
    else if (authStep === "confirmPassword")
      setTimeout(() => confirmPasswordInputRef.current?.focus(), 300);
  }, [authStep]);

  useEffect(() => {
    if (modalStatus === "success") fireConfetti();
  }, [modalStatus]);

  const closeModal = () => {
    setModalStatus("closed");
    setModalErrorMessage("");
  };

  const doSignIn = async () => {
    setModalStatus("loading");
    const ok = await signInWithEmail(email, password);
    if (ok) {
      setModalStatus("success");
      setTimeout(() => {
        closeModal();
        onAuthenticated?.();
      }, 1200);
    } else {
      setModalStatus("closed");
    }
  };

  const doSignUp = async () => {
    if (password !== confirmPassword) {
      setModalErrorMessage("Hasła nie są takie same!");
      setModalStatus("error");
      return;
    }
    setModalStatus("loading");
    const ok = await signUpWithEmail(email, password, email.split("@")[0]);
    if (ok) {
      setModalStatus("success");
      setTimeout(() => {
        closeModal();
        onAuthenticated?.();
      }, 1500);
    } else {
      setModalStatus("closed");
    }
  };

  const handleProgress = () => {
    if (authStep === "email" && isEmailValid) setAuthStep("password");
    else if (authStep === "password" && isPasswordValid) {
      if (mode === "signin") doSignIn();
      else setAuthStep("confirmPassword");
    } else if (authStep === "confirmPassword" && isConfirmPasswordValid) {
      doSignUp();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleProgress();
    }
  };

  const goBack = () => {
    if (authStep === "confirmPassword") {
      setAuthStep("password");
      setConfirmPassword("");
    } else if (authStep === "password") {
      setAuthStep("email");
      setPassword("");
    }
  };

  const switchMode = () => {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setAuthStep("email");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-background px-6 py-10">
      <GradientBackground />

      <div className="flex items-center gap-3 mb-10">
        {logo}
        <span className="text-xl font-semibold tracking-tight text-foreground">{brandName}</span>
      </div>

      <div className="w-full max-w-md space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${mode}-${authStep}`}
            initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
            transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
            className="space-y-2 text-center"
          >
            {authStep === "email" && (
              <>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  {mode === "signin" ? "Witaj ponownie" : "Zaczynamy"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {mode === "signin"
                    ? "Zaloguj się do swojego konta"
                    : "Stwórz konto w kilka sekund"}
                </p>
              </>
            )}
            {authStep === "password" && (
              <>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  {mode === "signin" ? "Wpisz hasło" : "Stwórz hasło"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {mode === "signin"
                    ? `Kontynuuj jako ${email}`
                    : "Minimum 6 znaków"}
                </p>
              </>
            )}
            {authStep === "confirmPassword" && (
              <>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  Ostatni krok
                </h1>
                <p className="text-sm text-muted-foreground">Potwierdź hasło, by kontynuować</p>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {authStep === "email" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              className={cn(glassButton, "w-full gap-2")}
            >
              <GoogleIcon /> Kontynuuj z Google
            </button>
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-foreground/10" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">lub</span>
              <div className="h-px flex-1 bg-foreground/10" />
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleProgress();
          }}
          className="space-y-3"
        >
          {authStep === "email" && (
            <div className={glassRow}>
              <Mail className="ml-3 h-4 w-4 text-foreground/60" />
              <input
                type="email"
                placeholder="ty@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="email"
                className={inputCls}
                maxLength={255}
              />
              <button
                type="submit"
                disabled={!isEmailValid}
                className="mr-1 grid h-10 w-10 place-items-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30"
                aria-label="Dalej"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {authStep === "password" && (
            <>
              <div className={glassRow}>
                <Lock className="ml-3 h-4 w-4 text-foreground/60" />
                <input
                  ref={passwordInputRef}
                  type={showPassword ? "text" : "password"}
                  placeholder="Hasło"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className={inputCls}
                  maxLength={72}
                />
                {password.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="rounded-full p-2 text-foreground/70 hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!isPasswordValid}
                  className="mr-1 grid h-10 w-10 place-items-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30"
                  aria-label="Dalej"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3 w-3" /> Wróć
              </button>
            </>
          )}

          {authStep === "confirmPassword" && (
            <>
              <div className={glassRow}>
                <Lock className="ml-3 h-4 w-4 text-foreground/60" />
                <input
                  ref={confirmPasswordInputRef}
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Potwierdź hasło"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="new-password"
                  className={inputCls}
                  maxLength={72}
                />
                {confirmPassword.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="rounded-full p-2 text-foreground/70 hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!isConfirmPasswordValid}
                  className="mr-1 grid h-10 w-10 place-items-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-30"
                  aria-label="Zarejestruj"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3 w-3" /> Wróć
              </button>
            </>
          )}
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "signin" ? "Nie masz konta?" : "Masz już konto?"}{" "}
          <button
            type="button"
            onClick={switchMode}
            className="font-medium text-foreground hover:underline"
          >
            {mode === "signin" ? "Zarejestruj się" : "Zaloguj się"}
          </button>
        </p>
      </div>

      <AnimatePresence>
        {modalStatus !== "closed" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-background/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-[90%] max-w-sm rounded-2xl border border-foreground/10 bg-card p-8 text-center shadow-xl"
            >
              {(modalStatus === "error" || modalStatus === "success") && (
                <button
                  onClick={closeModal}
                  className="absolute top-3 right-3 rounded-full p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Zamknij"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {modalStatus === "loading" && (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-foreground">Przetwarzanie…</p>
                </div>
              )}
              {modalStatus === "error" && (
                <div className="flex flex-col items-center gap-3">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <p className="text-sm text-foreground">{modalErrorMessage}</p>
                  <button onClick={closeModal} className={cn(glassButton, "mt-2 px-5 py-2")}>
                    Spróbuj ponownie
                  </button>
                </div>
              )}
              {modalStatus === "success" && (
                <div className="flex flex-col items-center gap-3">
                  <PartyPopper className="h-8 w-8 text-primary" />
                  <p className="text-sm text-foreground">Witaj na pokładzie!</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
