"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { businessInfo } from "@/lib/public-business";

const SLIDES = [
  "/assets/images/About-side/about - first.jpg",
  "/assets/images/About-side/about - second.jpg",
  "/assets/images/About-side/about - third.jpg",
  "/assets/images/About-side/about - fourth.jpg",
];

export function AboutHeroSlider() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative h-[280px] sm:h-[320px] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        {SLIDES.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === index ? "opacity-100 z-0" : "opacity-0 z-0"
            }`}
          >
            <Image
              src={src}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-black/50 z-[1]" />
      <div className="relative z-[2] text-center text-white px-4 pt-[140px]">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          About {businessInfo.name}
        </h1>
        <p className="text-lg text-white/95">
          Your trusted partner in financial growth and community development
        </p>
      </div>
    </section>
  );
}
