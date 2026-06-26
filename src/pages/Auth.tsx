import { useNavigate, useSearchParams } from "react-router-dom";
import { Flame } from "lucide-react";
import { AuthComponent } from "@/components/ui/sign-up";

const Auth = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const defaultMode = params.get("mode") === "signup" ? "signup" : "signin";

  return (
    <AuthComponent
      brandName="Big Speaking"
      logo={
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg">
          <Flame className="h-5 w-5" />
        </div>
      }
      defaultMode={defaultMode}
      onAuthenticated={() => navigate("/welcome")}
    />
  );
};

export default Auth;
