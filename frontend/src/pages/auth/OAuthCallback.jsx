import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../services/api";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const status = searchParams.get("status");
    const message = searchParams.get("message");

    if (status !== "success") {
      setError(message || "Provider sign-in could not be completed.");
      return;
    }

    authApi
      .me()
      .then((res) => {
        const user = res.data.user ?? res.data;
        setUser(user);
        navigate(user?.userType === "hr" || user?.user_type === "hr" || user?.role === "hr" ? "/hr" : "/dashboard", {
          replace: true,
        });
      })
      .catch(() => setError("Your provider sign-in finished, but the app session could not be loaded."));
  }, [navigate, searchParams, setUser]);

  return (
    <div className="space-y-5 text-center">
      <div>
        <p className="text-sm font-medium text-brand-300">Secure sign-in</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          {error ? "Sign-in needs attention" : "Completing your sign-in"}
        </h2>
      </div>

      {error ? (
        <>
          <div role="alert" className="rounded-lg border border-red-800 bg-red-950/70 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
          <Link
            to="/"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Back to sign in
          </Link>
        </>
      ) : (
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-gray-700 border-t-brand-400" />
      )}
    </div>
  );
}
