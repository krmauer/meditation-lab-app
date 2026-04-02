import AuthForm from "../../components/AuthForm"

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="text-center space-y-1 px-6 pt-6 pb-4">
          <h1 className="text-xl font-semibold text-gray-900">
            Meditation Lab
          </h1>
          <p className="text-sm text-gray-500">
            Sign in or create an account
          </p>
        </div>

        <div className="px-6 pb-6">
          <AuthForm />
        </div>
      </div>
    </main>
  )
}