import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui";
import { authApi } from "../../services/api";

const REMEMBER_KEY = "preonboarding_remember_email";
const SOCIAL_PROVIDERS = [
  { id: "google", label: "Google", mark: "G" },
  { id: "microsoft", label: "Microsoft", mark: "M" },
  { id: "github", label: "GitHub", mark: "GH" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [role, setRole] = useState("employee");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState("");

  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBER_KEY);
    if (remembered) setForm((current) => ({ ...current, identifier: remembered }));
  }, []);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || socialLoading) return;

    if (!form.identifier.trim() || !form.password.trim()) {
      setError("Enter your email or employee ID and password.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const signedInUser = await login(form.identifier.trim(), form.password, role);
      if (remember) localStorage.setItem(REMEMBER_KEY, form.identifier.trim());
      else localStorage.removeItem(REMEMBER_KEY);
      navigate(signedInUser?.userType === "hr" ? "/hr" : "/dashboard");
    } catch {
      setError("Invalid credentials. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider) => {
    if (loading || socialLoading) return;

    setError("");
    setSocialLoading(provider.id);
    window.location.assign(authApi.oauthStartUrl(provider.id, role, "login"));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div>
        <p className="text-sm font-semibold text-[#ef4d23]">Welcome back</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">Sign in to continue</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Access your secure pre-onboarding workspace.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Account type"
        className="grid grid-cols-2 rounded-lg border border-neutral-200 bg-neutral-100 p-1"
      >
        {[
          ["employee", "Employee"],
          ["hr", "HR"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={role === value}
            onClick={() => setRole(value)}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition-all duration-200 ${
              role === value ? "bg-[#ef4d23] text-white shadow-sm" : "text-neutral-600 hover:text-neutral-950"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="identifier" className="block text-sm font-medium text-neutral-800">
            Email or Employee ID
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
              @
            </span>
            <input
              id="identifier"
              autoComplete="username"
              autoFocus
              className="w-full rounded-lg border border-neutral-300 bg-white py-3 pl-9 pr-3 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#ef4d23] focus:ring-1 focus:ring-[#ef4d23]"
              placeholder="you@tatamotors.com or TM-XXXX"
              type="text"
              value={form.identifier}
              onChange={set("identifier")}
              disabled={loading || Boolean(socialLoading)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-neutral-800">
            Password
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
              Lock
            </span>
            <input
              id="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-neutral-300 bg-white py-3 pl-12 pr-20 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#ef4d23] focus:ring-1 focus:ring-[#ef4d23]"
              placeholder="Enter your password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={set("password")}
              onKeyUp={(event) => setCapsLock(event.getModifierState?.("CapsLock"))}
              disabled={loading || Boolean(socialLoading)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              disabled={loading || Boolean(socialLoading)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {capsLock && <p className="text-xs text-amber-700">Caps Lock is on.</p>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600">
          <input
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            type="checkbox"
            disabled={loading || Boolean(socialLoading)}
            className="h-4 w-4 rounded border-neutral-300 bg-white accent-[#ef4d23]"
          />
          Remember me
        </label>
        <Link to="/forgot-password" className="text-sm font-semibold text-[#ef4d23] hover:text-[#c83f1b]">
          Forgot password?
        </Link>
      </div>

      <Button
        type="submit"
        loading={loading}
        disabled={Boolean(socialLoading)}
        className="w-full min-h-12 justify-center text-base"
      >
        Sign In
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-neutral-200" />
        <span className="text-xs text-neutral-500">or continue with</span>
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {SOCIAL_PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => handleSocialSignIn(provider)}
            disabled={loading || Boolean(socialLoading)}
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-2 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={`Continue with ${provider.label}`}
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-neutral-300 bg-neutral-100 text-[10px] font-bold text-neutral-900">
              {provider.mark}
            </span>
            <span className="truncate">
              {socialLoading === provider.id ? "Signing in" : provider.label}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-950"
      >
        Continue with company SSO
      </button>

      <p className="text-center text-sm text-neutral-600">
        New joiner?{" "}
        <Link to="/signup" className="font-semibold text-[#ef4d23] hover:text-[#c83f1b] hover:underline">
          Create account
        </Link>
      </p>
    </form>
  );
}
