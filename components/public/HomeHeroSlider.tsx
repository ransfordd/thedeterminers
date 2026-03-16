"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

const HERO_SLIDES = [
  "/assets/images/Home-side/hero -  man (1).jpg",
  "/assets/images/Home-side/hero -  man.jpg",
  "/assets/images/Home-side/hero -  mechanic_1.jpg",
  "/assets/images/Home-side/hero -  mechanic.jpg",
  "/assets/images/Home-side/hero - market women.jpg",
];

export function HomeHeroSlider() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setActiveIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden" id="home">
      <div className="absolute inset-0">
        {HERO_SLIDES.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === activeIndex ? "opacity-100 z-0" : "opacity-0 z-0"
            }`}
          >
            <Image
              src={src}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
              priority={i === 0}
            />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-black/50 z-[1]" />
      <div className="relative z-[2] text-center text-white px-4 max-w-4xl mx-auto pt-[140px] pb-20">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight">
          Welcome to your trusted
          <br />
          <span className="text-amber-300">Susu & Loan</span>
          <br />
          Solutions
        </h1>
        <p className="text-lg sm:text-xl text-white/95 mb-10 max-w-2xl mx-auto">
          Empowering communities through innovative financial solutions. Join
          thousands of satisfied customers who trust us with their savings and
          loan needs.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition uppercase tracking-wide"
          >
            CREATE AN ACCOUNT
          </Link>
          <Link
            href="/services"
            className="px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition uppercase tracking-wide"
          >
            EXPLORE SERVICES
          </Link>
        </div>
      </div>
    </section>
  );
}
