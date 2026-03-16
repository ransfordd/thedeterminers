import Image from "next/image";
import { businessInfo } from "@/lib/public-business";
import { AboutHeroSlider } from "@/components/public/AboutHeroSlider";

export const metadata = {
  title: "About Us - Susu System",
  description:
    "Your trusted partner in financial growth and community development",
};

const VALUES = [
  {
    icon: "fa-shield-alt",
    title: "Trust & Security",
    desc: "We prioritize the security of our clients' funds and personal information, using bank-level encryption and security protocols to ensure complete peace of mind.",
  },
  {
    icon: "fa-users",
    title: "Community Focus",
    desc: "We believe in the power of community and work to strengthen social bonds through our Susu programs, bringing people together for mutual financial growth.",
  },
  {
    icon: "fa-lightbulb",
    title: "Innovation",
    desc: "We continuously innovate to provide cutting-edge financial solutions that make managing money easier, more accessible, and more rewarding for our clients.",
  },
  {
    icon: "fa-handshake",
    title: "Transparency",
    desc: "We maintain complete transparency in all our operations, providing clear information about fees, terms, and processes to build lasting trust with our clients.",
  },
  {
    icon: "fa-heart",
    title: "Empathy",
    desc: "We understand the financial challenges our clients face and approach every interaction with empathy, patience, and a genuine desire to help them succeed.",
  },
  {
    icon: "fa-chart-line",
    title: "Growth",
    desc: "We're committed to helping our clients achieve their financial goals, whether it's saving for the future, starting a business, or building wealth for their families.",
  },
];

const TEAM = [
  {
    photo: "/assets/images/About-side/man1.jpg",
    name: "Kwame Asante",
    role: "Chief Executive Officer",
    bio: "With over 15 years in financial services, Kwame leads our vision of making financial inclusion a reality for all Ghanaians.",
  },
  {
    photo: "/assets/images/About-side/man2.jpg",
    name: "Ama Serwaa",
    role: "Chief Technology Officer",
    bio: "Ama brings her expertise in fintech innovation to ensure our platform remains secure, user-friendly, and cutting-edge.",
  },
  {
    photo: "/assets/images/About-side/man3.jpg",
    name: "Kofi Mensah",
    role: "Head of Operations",
    bio: "Kofi ensures our operations run smoothly, maintaining the highest standards of service delivery and client satisfaction.",
  },
  {
    photo: "/assets/images/About-side/man4.jpg",
    name: "Efua Adjei",
    role: "Community Relations Manager",
    bio: "Efua builds and maintains relationships with our community partners, ensuring we stay connected to the people we serve.",
  },
];

const STATS = [
  { value: "10,000+", label: "Active Clients" },
  { value: "GHS 50M+", label: "Total Transactions" },
  { value: "16", label: "Regions Served" },
  { value: "24/7", label: "Customer Support" },
];

const JOURNEY = [
  { year: "2018", title: "Foundation", desc: "The Determiners was founded with a vision to revolutionize financial services in Ghana through technology and community-focused solutions." },
  { year: "2019", title: "First 1000 Clients", desc: "We reached our first milestone of 1000 active clients, proving the demand for our innovative financial services." },
  { year: "2020", title: "Digital Transformation", desc: "Launched our mobile banking platform, making financial services accessible to clients anywhere in Ghana." },
  { year: "2021", title: "GHS 10M Transactions", desc: "Processed over GHS 10 million in transactions, demonstrating the trust and confidence of our growing client base." },
  { year: "2022", title: "National Expansion", desc: "Expanded our services to all 16 regions of Ghana, bringing financial inclusion to rural and urban communities alike." },
  { year: "2023", title: "AI Integration", desc: "Introduced AI-powered financial advisory services, helping clients make informed decisions about their money." },
  { year: "2024", title: "10,000+ Clients", desc: "Reached over 10,000 active clients and processed over GHS 50 million in transactions, solidifying our position as a leading financial services provider." },
];

const AWARDS = [
  { icon: "fa-trophy", title: "Best Digital Bank 2023", org: "Ghana Banking Awards", year: "2023" },
  { icon: "fa-medal", title: "Financial Inclusion Excellence", org: "African Fintech Awards", year: "2023" },
  { icon: "fa-star", title: "Customer Service Excellence", org: "Ghana Customer Service Awards", year: "2022" },
  { icon: "fa-certificate", title: "Innovation in Banking", org: "West Africa Banking Innovation Awards", year: "2022" },
];

export default function AboutPage() {
  return (
    <div>
      <AboutHeroSlider />

      {/* Our Story */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Our Story
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Building stronger communities through innovative financial solutions
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Empowering Communities Through Financial Inclusion
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Founded in 2020, {businessInfo.name} has been at the forefront of
                transforming traditional Susu and loan management through digital
                innovation. We believe that everyone deserves access to reliable
                financial services, regardless of their background or location.
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Our journey began with a simple vision: to make financial
                services accessible, transparent, and efficient for all Ghanaians.
                We&apos;ve since grown to serve thousands of clients across the
                country, helping them achieve their financial goals through our
                innovative digital platform.
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Today, we&apos;re proud to be one of Ghana&apos;s leading digital
                financial service providers, combining the trust and community
                spirit of traditional Susu with the convenience and security of
                modern technology.
              </p>
            </div>
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
              <Image
                src="/assets/images/About-side/about - first.jpg"
                alt="The Determiners Team"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 px-4 sm:px-6 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Our Values
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              The principles that guide everything we do
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 mb-4">
                  <i className={`fas ${v.icon}`} aria-hidden />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {v.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet Our Team */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Meet Our Team
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              The dedicated professionals behind {businessInfo.name}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {TEAM.map((m) => (
              <div
                key={m.name}
                className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 text-center"
              >
                <div className="relative aspect-square">
                  <Image
                    src={m.photo}
                    alt={m.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                </div>
                <div className="p-4">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {m.name}
                  </div>
                  <div className="text-sm text-indigo-600 dark:text-indigo-400 mb-2">
                    {m.role}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {m.bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Impact */}
      <section className="py-16 px-4 sm:px-6 bg-indigo-600 dark:bg-indigo-800 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Our Impact</h2>
            <p className="text-indigo-100">
              Numbers that tell our story of growth and success
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold mb-1">
                  {s.value}
                </div>
                <div className="text-indigo-200 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Our Mission & Vision
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Guiding principles that drive everything we do
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
              <div className="w-14 h-14 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 mb-4">
                <i className="fas fa-bullseye text-xl" aria-hidden />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Our Mission
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                To democratize financial services in Ghana by providing
                accessible, affordable, and innovative banking solutions that
                empower individuals and communities to achieve their financial
                goals.
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
              <div className="w-14 h-14 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 mb-4">
                <i className="fas fa-eye text-xl" aria-hidden />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Our Vision
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                To become Ghana&apos;s leading digital financial services
                platform, fostering economic growth and financial inclusion across
                all communities by 2030.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Journey */}
      <section className="py-16 px-4 sm:px-6 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Our Journey
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Key milestones in our growth and development
            </p>
          </div>
          <div className="space-y-0">
            {JOURNEY.map((j, i) => (
              <div
                key={j.year}
                className="flex gap-6 pb-8 last:pb-0 relative"
              >
                {i < JOURNEY.length - 1 && (
                  <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-indigo-200 dark:bg-indigo-900" />
                )}
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 z-10">
                  {j.year.slice(-2)}
                </div>
                <div className="flex-1 pt-0.5">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {j.title}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                    {j.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Awards */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Awards & Recognition
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Industry recognition for our commitment to excellence
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {AWARDS.map((a) => (
              <div
                key={a.title}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center"
              >
                <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-3">
                  <i className={`fas ${a.icon}`} aria-hidden />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {a.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {a.org}
                </p>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 inline-block">
                  {a.year}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
