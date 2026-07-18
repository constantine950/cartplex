"use client";

import { useState } from "react";
import { useMutation, gql } from "@apollo/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";

const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        email
        name
        role
        vendor {
          id
          name
          slug
        }
      }
    }
  }
`;

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const [login, { loading }] = useMutation(LOGIN, {
    onCompleted: (data) => {
      localStorage.setItem("cartplex_token", data.login.token);
      localStorage.setItem("cartplex_user", JSON.stringify(data.login.user));
      toast(`Welcome back, ${data.login.user.name}!`, "success");

      if (data.login.user.role === "ADMIN") {
        router.push("/admin");
      } else if (data.login.user.role === "VENDOR") {
        router.push("/vendor-dashboard");
      } else {
        router.push("/");
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    await login({ variables: { input: form } });
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold">
            Cart<span className="text-gray-400">Plex</span>
          </Link>
          <h1 className="text-2xl font-bold mt-6 mb-2">Welcome back</h1>
          <p className="text-gray-500 text-sm">Sign in to your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              required
              placeholder="you@example.com"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              required
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              {error === "Invalid credentials"
                ? "Incorrect email or password."
                : error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white font-semibold py-3 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <div className="text-center text-sm text-gray-500 pt-2">
            Don't have an account?{" "}
            <Link
              href="/account/register"
              className="text-gray-900 font-medium hover:underline"
            >
              Create one
            </Link>
          </div>
        </form>

        {/* Demo accounts */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
            Demo accounts
          </p>
          <div className="space-y-2">
            {[
              {
                label: "Buyer",
                email: "buyer@cartplex.dev",
                password: "buyer123",
              },
              {
                label: "Vendor (TechGear)",
                email: "techgear@cartplex.dev",
                password: "vendor123",
              },
              {
                label: "Admin",
                email: "admin@cartplex.dev",
                password: "admin123",
              },
            ].map((acc) => (
              <button
                key={acc.email}
                onClick={() =>
                  setForm({ email: acc.email, password: acc.password })
                }
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors flex items-center justify-between group"
              >
                <span className="font-medium text-gray-700">{acc.label}</span>
                <span className="text-xs text-gray-400 group-hover:text-gray-600">
                  {acc.email}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
