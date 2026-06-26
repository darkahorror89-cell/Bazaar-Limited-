import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Sparkles, Copy, Check } from "lucide-react";
import { useToast } from "../context/ToastContext";

interface PromoSlide {
  id: string;
  titleBn: string;
  titleEn: string;
  subtitleBn: string;
  subtitleEn: string;
  bgUrl: string;
  badgeBn: string;
  badgeEn: string;
  couponCode: string;
  accentColor: string;
}

const PROMO_SLIDES: PromoSlide[] = [
  {
    id: "slide-1",
    titleBn: "মেগা ইলেকট্রনিক্স কার্নিভাল!",
    titleEn: "Mega Electronics Carnival!",
    subtitleBn: "মেকানিক্যাল কিবোর্ড এবং স্টুডিও হেডফোনে আকর্ষণীয় ছাড়!",
    subtitleEn: "Get premium tactile keyboards and Studio headphones with amazing discount!",
    bgUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
    badgeBn: "২০% ক্যাশব্যাক অফার",
    badgeEn: "20% Discount Offer",
    couponCode: "BAZAR20",
    accentColor: "from-blue-600 to-indigo-600"
  },
  {
    id: "slide-2",
    titleBn: "ফ্যাশন এবং ফুটওয়্যার উৎসব!",
    titleEn: "Step Into Style: Footwear Fest!",
    subtitleBn: "নতুন ডিজাইনের প্রিমিয়াম স্নিকার্স কিনুন আকর্ষণীয় মূল্যে!",
    subtitleEn: "Upgrade your lifestyle with futuristic high-impact sneakers today!",
    bgUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1200&q=80",
    badgeBn: "১০% ফ্ল্যাট ডিসকাউন্ট",
    badgeEn: "10% Flat Discount",
    couponCode: "WELCOME10",
    accentColor: "from-pink-600 to-rose-600"
  },
  {
    id: "slide-3",
    titleBn: "লাইফস্টাইল এবং হোম সাজসজ্জা",
    titleEn: "Cozy Life & Premium Decor",
    subtitleBn: "হোম এক্সেসরিজ এবং সুগন্ধি মোমবাতি কালেকশন কিনুন ফ্রি ডেলিভারিতে!",
    subtitleEn: "Scented candles, luxury oakwood items & vacuum flasks with free delivery!",
    bgUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80",
    badgeBn: "ফ্রি ডেলিভারি স্পেশাল",
    badgeEn: "Free Shipping Coupon",
    couponCode: "FREESHIP",
    accentColor: "from-teal-600 to-emerald-600"
  }
];

interface PromoCarouselProps {
  language: "bn" | "en";
}

export default function PromoCarousel({ language }: PromoCarouselProps) {
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % PROMO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + PROMO_SLIDES.length) % PROMO_SLIDES.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % PROMO_SLIDES.length);
  };

  const copyCoupon = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast(
      language === "bn"
        ? `কুপন কোড "${code}" কপি করা হয়েছে! চেকআউটে ব্যবহার করুন।`
        : `Coupon code "${code}" copied to clipboard! Use at checkout.`,
      { type: "success", title: language === "bn" ? "কুপন কপিড" : "Coupon Copied" }
    );
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const slide = PROMO_SLIDES[currentIndex];

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-lg group bg-gray-900 border border-gray-850 h-[300px] md:h-[400px] w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 w-full h-full"
        >
          {/* Background image with overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-900/80 to-transparent z-10" />
          <img
            src={slide.bgUrl}
            alt="Promotion Banner"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-60"
          />

          {/* Banner text & call to action */}
          <div className="absolute inset-0 z-20 flex flex-col justify-center px-6 md:px-16 text-white max-w-xl md:max-w-2xl space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-1.5 self-start"
            >
              <span className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-bold font-sans tracking-wide text-white uppercase bg-gradient-to-r ${slide.accentColor} shadow-md flex items-center gap-1`}>
                <Sparkles className="h-3 w-3" />
                {language === "bn" ? slide.badgeBn : slide.badgeEn}
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl md:text-4xl font-extrabold tracking-tight font-sans text-white leading-tight drop-shadow-sm"
            >
              {language === "bn" ? slide.titleBn : slide.titleEn}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xs md:text-sm text-gray-200 font-sans font-medium line-clamp-2 leading-relaxed"
            >
              {language === "bn" ? slide.subtitleBn : slide.subtitleEn}
            </motion.p>

            {/* Promo Code Copy Strip */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-2 self-start bg-white/10 backdrop-blur-md rounded-2xl p-1.5 pl-4 border border-white/15"
            >
              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase tracking-wider text-gray-300 font-sans font-semibold">Promo Coupon</span>
                <span className="font-mono text-sm font-extrabold text-white tracking-widest leading-none mt-0.5">{slide.couponCode}</span>
              </div>
              <button
                id={`copy-coupon-${slide.couponCode}`}
                onClick={(e) => copyCoupon(e, slide.couponCode)}
                className="bg-white hover:bg-gray-100 text-gray-900 rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                {copiedCode === slide.couponCode ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3px]" />
                    <span className="text-emerald-700">{language === "bn" ? "কপিড" : "Copied"}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>{language === "bn" ? "কোড কপি" : "Copy Code"}</span>
                  </>
                )}
              </button>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Manual Left/Right Arrow Navigation (Hidden on small screens, appears on hover) */}
      <button
        id="promo-carousel-prev-btn"
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full border border-white/10 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hidden md:flex items-center justify-center active:scale-90"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        id="promo-carousel-next-btn"
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-black/30 hover:bg-black/60 text-white p-2 rounded-full border border-white/10 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hidden md:flex items-center justify-center active:scale-90"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Slide Index Dot Indicators */}
      <div className="absolute bottom-4 right-6 z-30 flex items-center gap-1.5">
        {PROMO_SLIDES.map((_, idx) => (
          <button
            id={`promo-carousel-dot-${idx}`}
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
              idx === currentIndex ? "w-6 bg-white" : "w-1.5 bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
