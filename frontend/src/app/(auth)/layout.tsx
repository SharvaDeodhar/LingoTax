export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#F8FAFC]">
      {/* Atmospheric blur orbs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#2F8AE5]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full bg-[#7DB3E8]/10 blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[#2F8AE5] to-[#7DB3E8] bg-clip-text text-transparent">
            LinguaTax
          </h1>
          <p className="text-sm text-[#64748B] font-medium mt-1">
            Multilingual US tax assistant
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-ct-card border border-[#E2E8F0] p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
