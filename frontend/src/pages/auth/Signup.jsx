import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../../services/api";
import { Button, Input } from "../../components/ui";

const SOCIAL_PROVIDERS = [
  { id: "google", label: "Google", mark: "G" },
  { id: "microsoft", label: "Microsoft", mark: "M" },
  { id: "github", label: "GitHub", mark: "GH" },
];

const FIELDS = [
  { key: "name",       label: "Full Name",        type: "text",     placeholder: "Aarav Kulkarni" },
  { key: "email",      label: "Email Address",    type: "email",    placeholder: "you@tatamotors.com" },
  { key: "employeeId", label: "Employee ID",      type: "text",     placeholder: "TM-XXXX-XXXX" },
  { key: "designation",label: "Role / Designation", type: "text",   placeholder: "Software Engineer" },
  { key: "department", label: "Department",       type: "text",     placeholder: "Engineering" },
  { key: "location",   label: "Plant Location",   type: "text",     placeholder: "Pune Plant" },
  { key: "joiningDate",label: "Joining Date",     type: "date",     placeholder: "" },
  { key: "password",   label: "Password",         type: "password", placeholder: "Min 8 chars, upper, number, symbol" },
];

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({});
  const [accountType, setAccountType] = useState("employee");
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading]   = useState(false);
  const [socialLoading, setSocialLoading] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (socialLoading) return;
    setApiError("");
    const nextErrors = {};
    if ((form.password ?? "").length < 6) nextErrors.password = "Use at least 6 characters.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setLoading(true);
    try {
      await authApi.signup({ ...form, accountType });
      navigate("/");
    } catch (err) {
      setApiError(err?.response?.data?.message ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignup = (provider) => {
    if (loading || socialLoading) return;
    setApiError("");
    setSocialLoading(provider.id);
    window.location.assign(authApi.oauthStartUrl(provider.id, accountType, "signup"));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-white text-xl font-bold">Create your account</h2>
        <p className="text-gray-400 text-sm mt-1">Set up your pre-onboarding profile</p>
      </div>

      <div className="inline-flex bg-gray-800 rounded-lg p-1">
        {[
          ["employee", "Employee"],
          ["hr", "HR"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setAccountType(value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              accountType === value ? "bg-brand-700 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {apiError && (
        <div className="bg-red-950/60 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-lg">
          {apiError}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {SOCIAL_PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => handleSocialSignup(provider)}
            disabled={loading || Boolean(socialLoading)}
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-gray-800 bg-gray-950/70 px-2 py-2.5 text-sm font-medium text-gray-300 transition hover:border-gray-700 hover:bg-gray-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={`Sign up with ${provider.label}`}
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-gray-700 bg-gray-900 text-[10px] font-bold text-white">
              {provider.mark}
            </span>
            <span className="truncate">
              {socialLoading === provider.id ? "Opening" : provider.label}
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-800" />
        <span className="text-xs text-gray-500">or use email</span>
        <div className="h-px flex-1 bg-gray-800" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FIELDS.map(({ key, label, type, placeholder }) => (
          <Input
            key={key}
            label={label}
            type={type}
            placeholder={placeholder}
            value={form[key] ?? ""}
            onChange={set(key)}
            error={errors[key]}
            disabled={loading || Boolean(socialLoading)}
            required
          />
        ))}
      </div>

      <Button type="submit" loading={loading} disabled={Boolean(socialLoading)} className="w-full justify-center mt-2">
        Create Account
      </Button>

      <p className="text-center text-sm text-gray-400">
        Already registered?{" "}
        <Link to="/" className="text-brand-400 hover:text-brand-300 font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );
}
