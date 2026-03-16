"use client";

import Image from "next/image";

const PARTNERS = [
  { src: "/assets/images/icons/Bank of Ghana logo.png", name: "Bank of Ghana" },
  { src: "/assets/images/icons/GCB-logo.png", name: "Ghana Commercial Bank" },
  { src: "/assets/images/icons/mtn-logo.jpg", name: "MTN Mobile Money" },
  { src: "/assets/images/icons/Telecel-Cash-Logo.jpg", name: "Telecel Cash" },
  { src: "/assets/images/icons/airteltigo-icon.png", name: "AirtelTigo Money" },
  {
    src: "/assets/images/icons/cybersecurity-logo.png",
    name: "Cybersecurity Partners",
  },
];

export function PartnersCarousel() {
  const duplicated = [...PARTNERS, ...PARTNERS];
  return (
    <div className="overflow-hidden">
      <div className="flex animate-scroll gap-12 py-6">
        {duplicated.map((p, i) => (
          <div
            key={`${p.name}-${i}`}
            className="flex-shrink-0 flex flex-col items-center gap-2 min-w-[140px]"
          >
            <div className="relative w-24 h-24 grayscale hover:grayscale-0 transition">
              <Image
                src={p.src}
                alt={p.name}
                fill
                className="object-contain"
                sizes="96px"
              />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium text-center">
              {p.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
