import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../../services/api";
import { Button, Input } from "../../components/ui";

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState("");
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.forgotPassword({ identifier });
      setSent(true);
    } catch (err) {
      setError(err?.response?.data?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="text-4xl">📧</div>
        <h2 className="text-white font-bold text-xl">Check your email</h2>
        <p className="text-gray-400 text-sm">
          If an account exists for <strong>{identifier}</strong>, you'll receive a reset link shortly.
        </p>
        <Link to="/" className="text-brand-300 hover:text-brand-200 text-sm">
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-white text-xl font-bold">Reset your password</h2>
        <p className="text-gray-400 text-sm mt-1">Enter your email or Employee ID</p>
      </div>

      {error && (
        <div className="bg-red-950/60 border border-red-800 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Input
        label="Email or Employee ID"
        type="text"
        placeholder="you@tatamotors.com or TM-XXXX"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        required
      />

      <Button type="submit" loading={loading} className="w-full justify-center">
        Send Reset Link
      </Button>

      <p className="text-center text-sm text-gray-400">
        <Link to="/" className="text-brand-300 hover:text-brand-200">← Back to sign in</Link>
      </p>
    </form>
  );
}
