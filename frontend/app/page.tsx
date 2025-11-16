import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-6 animate-fade-in-up">
        <div className="rounded-2xl p-8 bg-white/85 backdrop-blur border border-[color:var(--nord9)]/30 shadow-xl hover-lift hover-press">
          <div className="text-4xl font-extrabold tracking-tight">AERAS</div>
          <p className="mt-2">Accessible E-Rickshaw Automation System</p>
        </div>
        <div className="bg-white/90 backdrop-blur border border-[color:var(--nord10)]/25 rounded-2xl p-6 shadow-lg hover-lift hover-press">
          <div className="text-lg">
            <Link
              href="/login"
              className="inline-block px-4 py-2 rounded-lg font-bold text-white bg-[color:var(--nord10)] hover:bg-[color:var(--nord9)] transition-colors duration-200 mr-2"
            >
              Login
            </Link>
            <span className="mx-1">or</span>
            <Link
              href="/signup"
              className="inline-block px-4 py-2 rounded-lg font-bold text-white bg-[color:var(--nord8)] hover:bg-[color:var(--nord7)] transition-colors duration-200 ml-2"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
