"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"

export default function AuthForm() {
  const router = useRouter()

  const [mode, setMode] = useState("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.")
      setLoading(false)
      return
    }

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      setMessage("Account created. You can now sign in.")
      setMode("signin")
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push("/dashboard")
  }

  return (
    <div style={{ maxWidth: "420px" }}>
      <div style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          onClick={() => {
            setMode("signin")
            setError("")
            setMessage("")
          }}
          style={{
            marginRight: "0.5rem",
            padding: "0.5rem 1rem",
            cursor: "pointer",
          }}
        >
          Sign In
        </button>

        <button
          type="button"
          onClick={() => {
            setMode("signup")
            setError("")
            setMessage("")
          }}
          style={{
            padding: "0.5rem 1rem",
            cursor: "pointer",
          }}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem" }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ padding: "0.6rem 1rem", cursor: "pointer" }}
        >
          {loading
            ? "Working..."
            : mode === "signup"
            ? "Create Account"
            : "Sign In"}
        </button>
      </form>

      {message && (
        <p style={{ color: "green", marginTop: "1rem" }}>{message}</p>
      )}

      {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}
    </div>
  )
}