import AuthForm from "../../components/AuthForm"

export default function LoginPage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>Meditation Lab</h1>
      <p>Sign in or create an account</p>
      <AuthForm />
    </main>
  )
}