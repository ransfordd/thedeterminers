import Link from "next/link";
import Image from "next/image";
import { getBusinessInfoFromDb } from "@/lib/business-settings";
import { NewsHeroSlider } from "@/components/public/NewsHeroSlider";

export const metadata = {
  title: "News & Updates - Susu System",
  description: "Latest news and updates from Susu System",
};

const articles = [
  {
    id: "financial-planning",
    image: "/assets/images/Home-side/growth.jpg",
    date: "December 15, 2024",
    title: "5 Tips for Better Financial Planning in 2025",
    excerpt:
      "Discover simple strategies to improve your financial health and achieve your savings goals.",
    content: (
      <>
        <p className="mb-4">
          As we approach the new year, it&apos;s the perfect time to reassess
          your financial goals and create a solid plan for 2025. Here are five
          essential tips to help you build a stronger financial foundation:
        </p>
        <h4 className="font-semibold text-gray-900 dark:text-white mt-4 mb-2">
          1. Create a Realistic Budget
        </h4>
        <p className="mb-4">
          Start by tracking your income and expenses for at least one month. Use
          this data to create a budget that accounts for your essential needs,
          savings goals, and some discretionary spending. Remember, a budget
          that&apos;s too restrictive is likely to fail.
        </p>
        <h4 className="font-semibold text-gray-900 dark:text-white mt-4 mb-2">
          2. Build an Emergency Fund
        </h4>
        <p className="mb-4">
          Aim to save 3–6 months&apos; worth of living expenses in a separate
          savings account. This fund will protect you from unexpected expenses
          like medical bills, car repairs, or job loss.
        </p>
        <h4 className="font-semibold text-gray-900 dark:text-white mt-4 mb-2">
          3. Automate Your Savings
        </h4>
        <p className="mb-4">
          Set up automatic transfers from your checking account to your savings
          account. This &quot;pay yourself first&quot; approach ensures you save
          money before you have a chance to spend it.
        </p>
        <h4 className="font-semibold text-gray-900 dark:text-white mt-4 mb-2">
          4. Review and Optimize Your Debts
        </h4>
        <p className="mb-4">
          List all your debts with their interest rates and minimum payments.
          Consider strategies like the debt avalanche method (paying highest
          interest debts first) or debt consolidation if it makes sense for your
          situation.
        </p>
        <h4 className="font-semibold text-gray-900 dark:text-white mt-4 mb-2">
          5. Set SMART Financial Goals
        </h4>
        <p className="mb-4">
          Make your financial goals Specific, Measurable, Achievable, Relevant,
          and Time-bound. Whether it&apos;s saving for a house, retirement, or
          your children&apos;s education, having clear goals will keep you
          motivated.
        </p>
        <p>
          Remember, financial planning is a journey, not a destination. Start
          with small steps and gradually build momentum toward your financial
          goals. {businessInfo.name} is here to support you every step of the
          way with our Susu collections and loan services.
        </p>
      </>
    ),
  },
  {
    id: "mobile-app",
    image: "/assets/images/Home-side/phone.jpg",
    date: "December 10, 2024",
    title: "New Mobile App Features Coming Soon",
    excerpt:
      "Exciting updates to our mobile app including biometric login and instant notifications.",
    content: (
      <>
        <p className="mb-4">
          We&apos;re excited to announce major updates coming to {businessInfo.name}{" "}
          mobile app in early 2025. These new features will make managing your
          finances even more convenient and secure.
        </p>
        <h4 className="font-semibold text-gray-900 dark:text-white mt-4 mb-2">
          Biometric Authentication
        </h4>
        <p className="mb-4">
          Your security is our priority. The new app will support fingerprint
          and face recognition login, making it faster and more secure to access
          your account while ensuring your financial data remains protected.
        </p>
        <h4 className="font-semibold text-gray-900 dark:text-white mt-4 mb-2">
          Real-Time Notifications
        </h4>
        <p className="mb-4">
          Stay informed with instant push notifications for: Susu collection
          reminders, loan payment due dates, account balance updates, transaction
          confirmations, and important announcements.
        </p>
        <h4 className="font-semibold text-gray-900 dark:text-white mt-4 mb-2">
          Enhanced Susu Tracking
        </h4>
        <p className="mb-4">
          Get detailed insights into your Susu cycle progress with interactive
          charts and progress indicators. You&apos;ll be able to see exactly how
          much you&apos;ve saved and how close you are to your payout date.
        </p>
        <h4 className="font-semibold text-gray-900 dark:text-white mt-4 mb-2">
          Quick Loan Application
        </h4>
        <p className="mb-4">
          Apply for loans directly through the app with our streamlined
          application process. Upload documents, track your application status,
          and receive instant approval notifications.
        </p>
        <p>
          The updated app will be available for download on both iOS and Android
          devices in January 2025. Existing users will receive an automatic
          update notification when the new version is ready.
        </p>
      </>
    ),
  },
  {
    id: "bank-licensing",
    image: "/assets/images/Home-side/badge.png",
    date: "December 5, 2024",
    title: "We're Now Licensed by Bank of Ghana",
    excerpt: `${businessInfo.name} has received official licensing, ensuring your funds are protected.`,
    content: (
      <>
        <p className="mb-4">
          We&apos;re proud to announce that {businessInfo.name} has officially
          received our license from the Bank of Ghana, marking a significant
          milestone in our journey to provide secure and reliable financial
          services to Ghanaians.
        </p>
        <h4 className="font-semibold text-gray-900 dark:text-white mt-4 mb-2">
          What This Means for You
        </h4>
        <p className="mb-4">This licensing ensures that:</p>
        <ul className="list-disc pl-6 mb-4 space-y-1 text-gray-600 dark:text-gray-400">
          <li>Your funds are protected under Ghana&apos;s banking regulations</li>
          <li>We operate under strict oversight and compliance requirements</li>
          <li>Your deposits are secured and insured</li>
          <li>We maintain the highest standards of financial security</li>
        </ul>
        <h4 className="font-semibold text-gray-900 dark:text-white mt-4 mb-2">
          Enhanced Security Measures
        </h4>
        <p className="mb-4">
          As a licensed financial institution, we&apos;ve implemented additional
          security measures including enhanced data encryption, regular security
          audits, strict internal controls, and professional liability insurance
          coverage.
        </p>
        <p>
          Thank you for trusting {businessInfo.name} with your financial needs.
          We look forward to continuing to serve you with even greater
          confidence and security as we grow together.
        </p>
      </>
    ),
  },
];

export default async function NewsPage() {
  const businessInfo = await getBusinessInfoFromDb();
  return (
    <div>
      <NewsHeroSlider />

      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Latest Articles
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Financial insights and company updates
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-16">
          {articles.map((article) => (
            <article
              key={article.id}
              id={article.id}
              className="scroll-mt-24 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
            >
              <div className="relative aspect-video w-full">
                <Image
                  src={article.image}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 896px) 100vw, 896px"
                />
              </div>
              <div className="p-6 sm:p-8">
                <p className="text-sm text-indigo-600 dark:text-indigo-400 mb-2">
                  {article.date}
                </p>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {article.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {article.excerpt}
                </p>
                <div className="text-gray-600 dark:text-gray-400 prose prose-sm dark:prose-invert max-w-none">
                  {article.content}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 text-center">
          <Link
            href="/"
            className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline inline-flex items-center gap-1"
          >
            <i className="fas fa-arrow-left" aria-hidden /> Back to Home
          </Link>
        </div>
      </section>
    </div>
  );
}
