import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./GoogleAuthSuccess.css";

export default function GoogleAuthSuccess() {
  const navigate = useNavigate();
  const { syncAuthFromServer } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const syncAndRedirect = async () => {
      const result = await syncAuthFromServer();

      if (!isMounted) {
        return;
      }

      if (result.success) {
        navigate("/dashboard", { replace: true });
        return;
      }

      navigate("/login?error=google_sync_failed", { replace: true });
    };

    syncAndRedirect();

    return () => {
      isMounted = false;
    };
  }, [navigate, syncAuthFromServer]);

  return (
    <div className="googleSuccessPage">
      <div className="googleSuccessCard">
        <h2>Signing you in with Google</h2>
        <p>Please wait while we finish your login.</p>
      </div>
    </div>
  );
}
