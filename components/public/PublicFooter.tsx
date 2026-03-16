import Link from "next/link";
import { businessInfo } from "@/lib/public-business";

export function PublicFooter() {
  return (
    <footer className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-3">
              {businessInfo.name}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your trusted partner in financial growth. We&apos;re committed to
              helping you achieve your financial goals through innovative Susu
              and loan solutions.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-3">
              Quick Links
            </h4>
            <div className="space-y-2 text-sm">
              <p>
                <Link
                  href="/"
                  className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Home
                </Link>
              </p>
              <p>
                <Link
                  href="/services"
                  className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Services
                </Link>
              </p>
              <p>
                <Link
                  href="/about"
                  className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  About Us
                </Link>
              </p>
              <p>
                <Link
                  href="/contact"
                  className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Contact
                </Link>
              </p>
              <p>
                <Link
                  href="/news"
                  className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  News
                </Link>
              </p>
            </div>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-3">
              Services
            </h4>
            <div className="space-y-2 text-sm">
              <p>
                <Link
                  href="/services#susu"
                  className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Susu Collections
                </Link>
              </p>
              <p>
                <Link
                  href="/services#loans"
                  className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Personal Loans
                </Link>
              </p>
              <p>
                <Link
                  href="/services#loans"
                  className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Business Loans
                </Link>
              </p>
              <p>
                <Link
                  href="/services#investment"
                  className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Financial Planning
                </Link>
              </p>
            </div>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white mb-3">
              Contact Info
            </h4>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>
                <i className="fas fa-phone w-4 mr-2" aria-hidden />
                <a
                  href={`tel:${businessInfo.phone.replace(/\s/g, "")}`}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  {businessInfo.phone}
                </a>
              </p>
              <p>
                <i className="fas fa-envelope w-4 mr-2" aria-hidden />
                <a
                  href={`mailto:${businessInfo.email}`}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  {businessInfo.email}
                </a>
              </p>
              <p>
                <i className="fas fa-map-marker-alt w-4 mr-2" aria-hidden />
                {businessInfo.address}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>&copy; 2025 {businessInfo.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
