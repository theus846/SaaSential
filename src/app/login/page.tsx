import { LoginForm } from "@/app/_components/login-form"
import Header from "../_components/header"

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-neutral-900">
      <Header />
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="w-full max-w-md px-6 py-6 bg-black rounded-lg">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}