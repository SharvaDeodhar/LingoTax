import Link from "next/link";
import { FileText, MessageSquare, CheckSquare, Shield, Zap, Globe } from "lucide-react";

const LANGUAGE_PILLS = [
  "Español", "中文", "हिन्दी", "한국어", "Tiếng Việt", "Português", "العربية", "日本語",
];

const STATS = [
  { value: "18", label: "Languages" },
  { value: "100%", label: "Secure" },
  { value: "AI", label: "Powered" },
  { value: "Free", label: "to Start" },
];

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Multilingual AI Chat",
    body: "Ask questions about your tax documents in your native language and get clear, accurate answers — no tax jargon.",
  },
  {
    icon: FileText,
    title: "Document Analysis",
    body: "Upload W-2s, 1099s, and other tax forms. Our AI reads and explains every line so you always know what you're signing.",
  },
  {
    icon: CheckSquare,
    title: "Task Tracking",
    body: "Stay on top of filing deadlines with a personalized checklist of everything you need to do before April 15.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-extrabold bg-gradient-to-r from-[#2F8AE5] to-[#7DB3E8] bg-clip-text text-transparent">
            LinguaTax
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-[#64748B] hover:text-[#0F172A] rounded-lg transition-colors duration-200"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="ct-btn-primary px-4 py-2 text-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#F8FAFC] py-24 px-6">
        {/* Blur orbs */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#2F8AE5]/8 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full bg-[#7DB3E8]/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left — copy */}
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-[#2F8AE5]/10 text-[#2F8AE5] text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6">
                <Globe className="w-3.5 h-3.5" />
                Trusted by immigrants &amp; international students
              </div>

              <h1 className="text-4xl sm:text-5xl font-extrabold text-[#0F172A] leading-tight mb-4">
                Your US Taxes,{" "}
                <span className="bg-gradient-to-r from-[#2F8AE5] to-[#7DB3E8] bg-clip-text text-transparent">
                  In Your Language.
                </span>
              </h1>

              <p className="text-lg text-[#64748B] max-w-lg mb-8 leading-relaxed">
                Upload your tax documents, chat with our AI in your native language, and file with confidence — no accountant required.
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                <Link
                  href="/signup"
                  className="ct-btn-primary px-6 py-3 text-base"
                >
                  Get Started Free
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-3 text-base font-semibold text-[#2F8AE5] border border-[#2F8AE5]/30 rounded-lg hover:bg-[#2F8AE5]/5 transition-all duration-200"
                >
                  Sign in
                </Link>
              </div>

              {/* Language pills */}
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_PILLS.map((lang) => (
                  <span
                    key={lang}
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-white border border-[#E2E8F0] text-[#64748B] shadow-ct-sm"
                  >
                    {lang}
                  </span>
                ))}
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white border border-[#E2E8F0] text-[#64748B] shadow-ct-sm">
                  +10 more
                </span>
              </div>
            </div>

            {/* Right — floating card mockup */}
            <div className="hidden lg:flex items-center justify-center">
              <div
                className="w-80 bg-white rounded-2xl border border-[#E2E8F0] shadow-ct-hover p-5 space-y-4"
                style={{ transform: "perspective(1200px) rotateY(-10deg) rotateX(4deg)" }}
              >
                {/* Mock header */}
                <div className="flex items-center gap-2 pb-3 border-b border-[#E2E8F0]">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2F8AE5] to-[#7DB3E8]" />
                  <div>
                    <p className="text-xs font-semibold text-[#0F172A]">W-2 Form</p>
                    <p className="text-xs text-[#64748B]">Ask anything about this document</p>
                  </div>
                </div>
                {/* Mock user bubble */}
                <div className="flex justify-end">
                  <div className="bg-gradient-to-br from-[#2F8AE5] to-[#7DB3E8] text-white text-xs font-medium px-4 py-2.5 rounded-2xl rounded-br-sm shadow-ct-card max-w-[80%]">
                    ¿Cuánto impuesto retuvieron de mi salario?
                  </div>
                </div>
                {/* Mock assistant bubble */}
                <div className="flex justify-start">
                  <div className="bg-white border border-[#E2E8F0] text-[#0F172A] text-xs px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-ct-card max-w-[85%]">
                    Tu empleador retuvo <span className="font-bold text-[#2F8AE5]">$4,832</span> en impuestos federales durante el año fiscal 2024.
                  </div>
                </div>
                {/* Mock typing dots */}
                <div className="flex justify-start">
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-2.5 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-[#2F8AE5]/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-[#2F8AE5]/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-[#2F8AE5]/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ──────────────────────────────────────────────────── */}
      <section className="bg-white border-y border-[#E2E8F0] py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold bg-gradient-to-r from-[#2F8AE5] to-[#7DB3E8] bg-clip-text text-transparent">
                {s.value}
              </p>
              <p className="text-sm text-[#64748B] mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-3">
              Everything you need to file{" "}
              <span className="bg-gradient-to-r from-[#2F8AE5] to-[#7DB3E8] bg-clip-text text-transparent">
                with confidence
              </span>
            </h2>
            <p className="text-[#64748B] max-w-xl mx-auto">
              From document upload to final submission, LinguaTax guides you every step of the way — in your language.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="ct-card ct-card-hover p-6"
                >
                  <div className="h-12 w-12 rounded-xl bg-[#2F8AE5]/10 text-[#2F8AE5] flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-[#0F172A] mb-2">{f.title}</h3>
                  <p className="text-[#64748B] text-sm leading-relaxed">{f.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 to-blue-950 py-24 px-6 text-center">
        {/* Blur orbs */}
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full bg-blue-400/15 blur-3xl pointer-events-none" />

        <div className="relative max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Start understanding your taxes today
          </h2>
          <p className="text-blue-200 text-lg mb-8">
            Join thousands of immigrants and international students who file with confidence.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white text-[#2F8AE5] font-bold rounded-full px-8 py-3 hover:bg-blue-50 transition-colors duration-200 shadow-ct-hover"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-[#E2E8F0] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-lg font-extrabold bg-gradient-to-r from-[#2F8AE5] to-[#7DB3E8] bg-clip-text text-transparent">
            LinguaTax
          </span>
          <div className="flex items-center gap-6 text-sm text-[#64748B]">
            <Link href="/privacy" className="hover:text-[#2F8AE5] transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#2F8AE5] transition-colors">
              Terms
            </Link>
            <Link href="mailto:support@linguatax.com" className="hover:text-[#2F8AE5] transition-colors">
              Contact
            </Link>
          </div>
          <p className="text-xs text-[#64748B]">
            &copy; {new Date().getFullYear()} LinguaTax. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
