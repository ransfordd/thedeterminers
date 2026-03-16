"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

const SLIDES = [
  {
    src: "/assets/images/Home-side/hero -  man (1).jpg",
    quote:
      "The Determiners has transformed how I save money. The digital Susu system is so convenient, and I love getting notifications about my contributions. It's like having a personal financial advisor!",
    name: "Akosua Mensah",
    role: "Small Business Owner",
  },
  {
    src: "/assets/images/Home-side/hero -  man.jpg",
    quote:
      "Getting a loan was so easy with The Determiners. The application process was straightforward, and I received my funds within 24 hours. The interest rates are very competitive too!",
    name: "Kwame Asante",
    role: "Teacher",
  },
  {
    src: "/assets/images/Home-side/hero -  mechanic.jpg",
    quote:
      "The mobile app is fantastic! I can check my account balance, make payments, and even apply for loans right from my phone. It's made managing my finances so much easier.",
    name: "Efua Adjei",
    role: "Nurse",
  },
  {
    src: "/assets/images/Home-side/hero -  mechanic_1.jpg",
    quote:
      "As a mechanic, I needed quick access to funds for my business. The Determiners made it possible for me to get the equipment I needed without the usual banking hassles. Highly recommended!",
    name: "Kofi Osei",
    role: "Auto Mechanic",
  },
  {
    src: "/assets/images/Home-side/hero - market women.jpg",
    quote:
      "We market women have been saving together for years, but The Determiners has made it so much easier and safer. Our money is secure and we can track everything on our phones!",
    name: "Adwoa Serwaa",
    role: "Market Woman",
  },
];

export function WhyChooseGallery() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  const slide = SLIDES[index];
  return (
    <div className="relative rounded-xl overflow-hidden shadow-lg aspect-[4/3] max-h-[400px]">
      <Image
        src={slide.src}
        alt=""
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-6 text-white">
        <div className="max-w-xl">
          <i className="fas fa-quote-left text-2xl opacity-80 mb-2" aria-hidden />
          <p className="text-lg font-medium mb-4">&ldquo;{slide.quote}&rdquo;</p>
          <div>
            <h4 className="font-bold">{slide.name}</h4>
            <span className="text-white/90 text-sm">{slide.role}</span>
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          type="button"
          onClick={() => setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length)}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition"
          aria-label="Previous"
        >
          <i className="fas fa-chevron-left" />
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => (i + 1) % SLIDES.length)}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition"
          aria-label="Next"
        >
          <i className="fas fa-chevron-right" />
        </button>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={`w-2 h-2 rounded-full transition ${
              i === index ? "bg-white scale-125" : "bg-white/50"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
