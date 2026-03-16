import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { businessInfo } from "@/lib/public-business";
import { HomeHeroSlider } from "@/components/public/HomeHeroSlider";
import { WhyChooseGallery } from "@/components/public/WhyChooseGallery";
import { PartnersCarousel } from "@/components/public/PartnersCarousel";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return (
    <>
      <HomeHeroSlider />

      {/* Our Services */}
      <section className="py-16 px-4 sm:px-6 bg-gray-50 dark:bg-gray-900/50" id="services">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-2 text-gray-900 dark:text-white">
            Our Services
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            Comprehensive financial solutions designed to meet your needs
          </p>
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="relative aspect-video">
                <Image
                  src="/assets/images/Home-side/susu collections.jpg"
                  alt="Susu Collections"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  Susu Collections
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Join our rotating savings scheme and build your financial
                  future. Regular contributions with guaranteed payouts.
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="relative aspect-video">
                <Image
                  src="/assets/images/Home-side/quick loans.jpg"
                  alt="Quick Loans"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  Quick Loans
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Get access to fast, affordable loans with flexible repayment
                  terms. No hidden fees, transparent rates.
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="relative aspect-video">
                <Image
                  src="/assets/images/Home-side/digital banking.jpg"
                  alt="Digital Banking"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                  Digital Banking
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage your finances on the go with our secure mobile platform.
                  24/7 access to your accounts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 sm:px-6" id="how-it-works">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-2 text-gray-900 dark:text-white">
            How It Works
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-12">
            It&apos;s Easy To Join With Us
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Open an Account
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm max-w-[200px]">
                  To be an account holder you have to open an account first.
                </p>
              </div>
            </div>
            <i className="fas fa-arrow-right text-indigo-600 hidden sm:block flex-shrink-0" aria-hidden />
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Verification
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm max-w-[200px]">
                  After registration you need to verify your Email and Mobile
                  Number.
                </p>
              </div>
            </div>
            <i className="fas fa-arrow-right text-indigo-600 hidden sm:block flex-shrink-0" aria-hidden />
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Start Saving
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm max-w-[200px]">
                  Begin your Susu savings journey with our secure digital
                  platform.
                </p>
              </div>
            </div>
            <i className="fas fa-arrow-right text-indigo-600 hidden sm:block flex-shrink-0" aria-hidden />
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Get Service
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm max-w-[200px]">
                  Now you can access all our services as our registered
                  account-holder.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose */}
      <section className="py-16 px-4 sm:px-6 bg-gray-50 dark:bg-gray-900/50" id="about">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-2 text-gray-900 dark:text-white">
            Why Choose {businessInfo.name}?
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            Experience the future of community banking with cutting-edge
            technology
          </p>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-gray-700 dark:text-gray-300 mb-8">
                At {businessInfo.name}, we&apos;re transforming how Ghanaians
                save, borrow, and invest. Our innovative digital platform
                combines the trust and community spirit of traditional Susu with
                the convenience and security of modern banking technology.
              </p>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <i className="fas fa-shield-alt" aria-hidden />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Bank-Level Security
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your funds are protected with military-grade encryption and
                      security protocols
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <i className="fas fa-mobile-alt" aria-hidden />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Mobile Banking
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Manage your finances anywhere, anytime with our user-friendly
                      mobile app
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <i className="fas fa-chart-line" aria-hidden />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Smart Analytics
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Get insights into your spending and savings patterns with
                      AI-powered analytics
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <i className="fas fa-users" aria-hidden />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Community Support
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Join a supportive community of savers and borrowers with
                      24/7 customer service
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
                >
                  Learn More About Us
                </Link>
              </div>
            </div>
            <WhyChooseGallery />
          </div>
        </div>
      </section>

      {/* Compare Our Services */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-2 text-gray-900 dark:text-white">
            Compare Our Services
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-10">
            See how we stack up against traditional banking
          </p>
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-100 dark:bg-gray-800 font-semibold text-gray-900 dark:text-white">
              <div className="p-4 border-b border-r border-gray-200 dark:border-gray-700">
                Features
              </div>
              <div className="p-4 border-b border-r border-gray-200 dark:border-gray-700">
                Traditional Banks
              </div>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                {businessInfo.name}
              </div>
            </div>
            {[
              ["Account Opening", "3-5 days", "Instant"],
              ["Savings Interest Rate", "2-4%", "Up to 12%"],
              ["Loan Processing", "7-14 days", "24 hours"],
              ["Mobile Banking", "Basic", "Advanced"],
              ["Customer Support", "Business hours", "24/7"],
              ["Susu Management", "Not available", "Full service"],
            ].map(([feature, traditional, our], i) => (
              <div
                key={feature}
                className={`grid grid-cols-3 text-gray-700 dark:text-gray-300 ${
                  i % 2 === 0 ? "bg-gray-50 dark:bg-gray-900/50" : ""
                }`}
              >
                <div className="p-4 border-b border-r border-gray-200 dark:border-gray-700 font-medium">
                  {feature}
                </div>
                <div className="p-4 border-b border-r border-gray-200 dark:border-gray-700">
                  {traditional}
                </div>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  {our}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest News */}
      <section className="py-16 px-4 sm:px-6 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-2 text-gray-900 dark:text-white">
            Latest News & Financial Tips
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-12">
            Stay updated with financial insights and company news
          </p>
          <div className="grid sm:grid-cols-3 gap-8">
            <article className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="relative aspect-video">
                <Image
                  src="/assets/images/Home-side/growth.jpg"
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="p-6">
                <div className="text-sm text-indigo-600 dark:text-indigo-400 mb-2">
                  Dec 15, 2024
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  5 Tips for Better Financial Planning in 2025
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Discover simple strategies to improve your financial health and
                  achieve your savings goals.
                </p>
                <Link
                  href="/news#financial-planning"
                  className="text-indigo-600 dark:text-indigo-400 font-medium text-sm inline-flex items-center gap-1 hover:underline"
                >
                  Read More <i className="fas fa-arrow-right text-xs" />
                </Link>
              </div>
            </article>
            <article className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="relative aspect-video">
                <Image
                  src="/assets/images/Home-side/phone.jpg"
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="p-6">
                <div className="text-sm text-indigo-600 dark:text-indigo-400 mb-2">
                  Dec 10, 2024
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  New Mobile App Features Coming Soon
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Exciting updates to our mobile app including biometric login
                  and instant notifications.
                </p>
                <Link
                  href="/news#mobile-app"
                  className="text-indigo-600 dark:text-indigo-400 font-medium text-sm inline-flex items-center gap-1 hover:underline"
                >
                  Read More <i className="fas fa-arrow-right text-xs" />
                </Link>
              </div>
            </article>
            <article className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="relative aspect-video">
                <Image
                  src="/assets/images/Home-side/badge.png"
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="p-6">
                <div className="text-sm text-indigo-600 dark:text-indigo-400 mb-2">
                  Dec 5, 2024
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  We&apos;re Now Licensed by Bank of Ghana
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  {businessInfo.name} has received official licensing, ensuring
                  your funds are protected.
                </p>
                <Link
                  href="/news#bank-licensing"
                  className="text-indigo-600 dark:text-indigo-400 font-medium text-sm inline-flex items-center gap-1 hover:underline"
                >
                  Read More <i className="fas fa-arrow-right text-xs" />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Trusted Partners */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-2 text-gray-900 dark:text-white">
            Trusted Partners
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-10">
            We work with leading financial institutions and technology partners
          </p>
          <PartnersCarousel />
        </div>
      </section>
    </>
  );
}
