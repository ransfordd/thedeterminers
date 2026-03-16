import Link from "next/link";
import { businessInfo } from "@/lib/public-business";
import { ServicesHeroSlider } from "@/components/public/ServicesHeroSlider";

export const metadata = {
  title: "Our Services - Susu System",
  description: "Comprehensive financial solutions designed for your success",
};

const SERVICES = [
  {
    id: "susu",
    icon: "fa-piggy-bank",
    title: "Digital Susu Management",
    desc: "Experience the traditional Susu system with modern digital convenience. Our platform makes it easy to join, contribute, and receive your Susu payout.",
    features: [
      "Flexible contribution schedules",
      "Real-time tracking and notifications",
      "Secure digital transactions",
      "Multiple Susu cycles support",
      "Automated payout calculations",
    ],
    cta: "Get Started",
    href: "/login",
  },
  {
    id: "loans",
    icon: "fa-hand-holding-usd",
    title: "Flexible Loan Services",
    desc: "Access quick and affordable loans with competitive interest rates. Our loan products are designed to help you achieve your financial goals.",
    features: [
      "Quick loan approval process",
      "Competitive interest rates",
      "Flexible repayment options",
      "No hidden fees",
      "Online loan management",
    ],
    cta: "Apply Now",
    href: "/login",
  },
  {
    id: "savings",
    icon: "fa-university",
    title: "High-Yield Savings Accounts",
    desc: "Grow your money with our high-yield savings accounts. Earn competitive interest rates while keeping your funds secure and accessible.",
    features: [
      "High interest rates",
      "No minimum balance requirements",
      "24/7 account access",
      "Mobile banking features",
      "Automatic savings plans",
    ],
    cta: "Open Account",
    href: "/login",
  },
  {
    id: "investment",
    icon: "fa-chart-line",
    title: "Investment Opportunities",
    desc: "Build long-term wealth with our diverse investment options. From conservative to aggressive strategies, we have options for every risk tolerance.",
    features: [
      "Diversified investment options",
      "Professional portfolio management",
      "Regular performance reports",
      "Risk assessment tools",
      "Tax-efficient strategies",
    ],
    cta: "Start Investing",
    href: "/login",
  },
  {
    id: "business",
    icon: "fa-briefcase",
    title: "Business Banking Solutions",
    desc: "Comprehensive banking services for businesses of all sizes. From startup accounts to corporate lending, we support your business growth.",
    features: [
      "Business checking accounts",
      "Commercial lending",
      "Merchant services",
      "Cash management tools",
      "Dedicated business support",
    ],
    cta: "Learn More",
    href: "/login",
  },
  {
    id: "financial-planning",
    icon: "fa-calculator",
    title: "Financial Planning & Advisory",
    desc: "Get personalized financial advice from our certified financial planners. We help you create a roadmap to achieve your financial goals.",
    features: [
      "Personalized financial plans",
      "Retirement planning",
      "Education funding strategies",
      "Insurance recommendations",
      "Regular plan reviews",
    ],
    cta: "Get Advice",
    href: "/login",
  },
];

const PROCESS_STEPS = [
  {
    step: 1,
    title: "Create Account",
    desc: "Sign up for a free account in minutes with just your basic information and valid ID.",
  },
  {
    step: 2,
    title: "Choose Service",
    desc: "Select the financial service that best fits your needs - Susu, loans, savings, or investments.",
  },
  {
    step: 3,
    title: "Get Approved",
    desc: "Our quick approval process ensures you can start using your account within 24 hours.",
  },
  {
    step: 4,
    title: "Start Managing",
    desc: "Begin managing your finances with our user-friendly platform and mobile app.",
  },
];

const BENEFITS = [
  {
    icon: "fa-shield-alt",
    title: "Bank-Level Security",
    desc: "Your funds and personal information are protected with industry-leading security measures and encryption.",
  },
  {
    icon: "fa-mobile-alt",
    title: "Mobile Banking",
    desc: "Access your accounts anytime, anywhere with our feature-rich mobile banking app.",
  },
  {
    icon: "fa-headset",
    title: "24/7 Customer Support",
    desc: "Get help whenever you need it with our round-the-clock customer support team.",
  },
];

export default function ServicesPage() {
  return (
    <div>
      <ServicesHeroSlider />

      {/* What We Offer */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              What We Offer
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Tailored financial services to meet your unique needs
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {SERVICES.map((s) => (
              <div
                key={s.id}
                id={s.id}
                className="scroll-mt-24 bg-white dark:bg-gray-800 rounded-xl p-6 sm:p-8 border-2 border-indigo-200 dark:border-indigo-900 hover:border-indigo-500 dark:hover:border-indigo-600 hover:shadow-lg transition-all"
              >
                <div className="w-14 h-14 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 text-2xl mb-4">
                  <i className={`fas ${s.icon}`} aria-hidden />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {s.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  {s.desc}
                </p>
                <ul className="space-y-2 mb-6">
                  {s.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                    >
                      <i className="fas fa-check text-green-600 dark:text-green-400 flex-shrink-0" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={s.href}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-700 transition"
                >
                  {s.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 sm:px-6 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              How It Works
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Simple steps to get started with our services
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {PROCESS_STEPS.map((p) => (
              <div
                key={p.step}
                className="text-center bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {p.step}
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {p.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Why Choose Us
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              The advantages of banking with {businessInfo.name}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="flex gap-4 items-start bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                  <i className={`fas ${b.icon}`} aria-hidden />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {b.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {b.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
