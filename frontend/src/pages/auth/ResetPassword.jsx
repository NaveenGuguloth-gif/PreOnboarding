import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { authApi } from "../../services/api";
import { Button, Input } from "../../components/ui";

export default function ResetPassword() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const token      = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.message ?? "Reset failed. Link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-white text-xl font-bold">Set new password</h2>
        <p className="text-gray-400 text-sm mt-1">Choose a strong password for your account</p>
      </div>

      {error && (
        <div className="bg-red-950/60 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Input
        label="New Password"
        type="password"
        placeholder="Min 8 chars, upper, number, symbol"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <Button type="submit" loading={loading} className="w-full justify-center">
        Reset Password
      </Button>

      <p className="text-center text-sm text-gray-400">
        <Link to="/" className="text-brand-400 hover:text-brand-300">← Back to sign in</Link>
      </p>
    </form>
  );
}