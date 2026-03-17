import { submitContact } from "@/lib/actions/contact";
import { ContactForm } from "./ContactForm";
import { ContactHeroSlider } from "@/components/public/ContactHeroSlider";
import { getBusinessInfoFromDb } from "@/lib/business-settings";

export const metadata = {
  title: "Contact Us - Susu System",
  description: "Get in touch with us",
};

export default async function ContactPage() {
  const businessInfo = await getBusinessInfoFromDb();
  return (
    <div>
      <ContactHeroSlider />

      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Get In Touch
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Have questions? We&apos;d love to hear from you. Send us a message
              and we&apos;ll respond as soon as possible.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Send us a Message
              </h3>
              <ContactForm submitAction={submitContact} />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Contact Information
              </h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <i className="fas fa-map-marker-alt" aria-hidden />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Head Office
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {businessInfo.headOfficeAddress}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <i className="fas fa-phone" aria-hidden />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Phone Numbers
                    </h4>
                    <div className="text-gray-600 dark:text-gray-400 text-sm space-y-1">
                      {businessInfo.phone && (
                        <p>
                          <a
                            href={`tel:${businessInfo.phone.replace(/\s/g, "")}`}
                            className="hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            {businessInfo.phone}
                          </a>
                        </p>
                      )}
                      {businessInfo.supportPhone && (
                        <p>
                          <a
                            href={`tel:${businessInfo.supportPhone.replace(/\s/g, "")}`}
                            className="hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            {businessInfo.supportPhone}
                          </a>
                        </p>
                      )}
                      {businessInfo.emergencyPhone && (
                        <p>
                          <a
                            href={`tel:${businessInfo.emergencyPhone.replace(/\s/g, "")}`}
                            className="hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            {businessInfo.emergencyPhone}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <i className="fas fa-envelope" aria-hidden />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Email Addresses
                    </h4>
                    <div className="text-gray-600 dark:text-gray-400 text-sm space-y-1">
                      <p>
                        <a
                          href={`mailto:${businessInfo.email}`}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          {businessInfo.email}
                        </a>
                      </p>
                      <p>
                        <a
                          href={`mailto:${businessInfo.supportEmail}`}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          {businessInfo.supportEmail}
                        </a>
                      </p>
                      <p>
                        <a
                          href={`mailto:${businessInfo.loansEmail}`}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          {businessInfo.loansEmail}
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <i className="fas fa-clock" aria-hidden />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      Office Hours
                    </h4>
                    <ul className="text-gray-600 dark:text-gray-400 text-sm space-y-1 list-none">
                      <li>{businessInfo.officeHours.weekdays}</li>
                      <li>{businessInfo.officeHours.saturday}</li>
                      <li>{businessInfo.officeHours.sunday}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
