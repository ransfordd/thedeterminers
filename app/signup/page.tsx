import Link from "next/link";
import { prisma } from "@/lib/db";
import { SignupForm } from "./SignupForm";

/** Prevent static prerender at build time (requires DATABASE_URL at request time). */
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const agents = await prisma.agent.findMany({
    where: { status: "active" },
    include: { user: true },
    orderBy: { agentCode: "asc" },
  });
  const agentOptions = agents.map((a) => ({
    id: a.id,
    label: `${a.agentCode} - ${a.user.firstName} ${a.user.lastName}`,
  }));

  return (
    <div className="min-h-screen w-full bg-[#667eea] flex flex-col items-center py-8 px-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3Cpattern id='g' width='100' height='100' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='25' cy='25' r='1' fill='rgba(255,255,255,0.1)'/%3E%3Ccircle cx='75' cy='75' r='1' fill='rgba(255,255,255,0.1)'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23g)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="absolute top-8 left-8 z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/15 border border-white/30 text-white text-sm font-semibold hover:bg-white/25 transition-all shadow-lg"
        >
          <i className="fas fa-arrow-left" /> Back to Home
        </Link>
      </div>

      <div className="w-full max-w-2xl relative z-[1] mt-4">
        <div className="bg-white rounded-[20px] shadow-xl overflow-hidden">
          <div className="bg-[#667eea] text-white px-8 py-8 text-center">
            <div className="text-4xl mb-4 opacity-95">
              <i className="fas fa-user-plus" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Create Client Account</h2>
            <p className="text-white/95 text-lg font-light">Join The Determiners Susu System</p>
          </div>

          <div className="p-6 bg-[#fafbfc]">
            <SignupForm agentOptions={agentOptions} />
          </div>

          <div className="py-5 px-6 text-center border-t border-[#e9ecef]" style={{ background: "#f8f9fa" }}>
            <p className="text-[#6c757d] text-[0.95rem]">
              Already have an account?{" "}
              <Link href="/login" className="text-[#667eea] hover:text-[#764ba2] font-semibold inline-flex items-center gap-1.5 hover:underline">
                <i className="fas fa-sign-in-alt" /> Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
