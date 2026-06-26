import React, { useState, useEffect } from "react";
import { Flame, ShoppingBag, Clock, Sparkles } from "lucide-react";
import { Product } from "../types";
import { motion } from "motion/react";

interface FlashSaleBannerProps {
  products: Product[];
  onAddToCart: (p: Product) => void;
  onSelect: (p: Product) => void;
  language: "bn" | "en";
}

export default function FlashSaleBanner({
  products,
  onAddToCart,
  onSelect,
  language
}: FlashSaleBannerProps) {
  // Timer countdown values: 2 hours 45 minutes and 12 seconds remaining initially
  const [timeLeft, setTimeLeft] = useState({
    hours: 2,
    minutes: 45,
    seconds: 12
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          // Reset timer to mock infinite expiration loop for review
          return { hours: 3, minutes: 0, seconds: 0 };
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format with leading zero
  const format = (num: number) => String(num).padStart(2, "0");

  // Filter 2 high-value products for Flash Sale
  const flashSaleIds = ["prod-1", "prod-4", "prod-2"];
  const flashSaleItems = products.filter((p) => flashSaleIds.includes(p.id));

  if (flashSaleItems.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-3xl bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 p-6 md:p-8 text-white shadow-xl overflow-hidden border border-orange-400/20"
    >
      {/* Abstract Background Design */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -mr-24 -mt-24" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-16 -mb-16" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Grid: Flash Sale Badge, Clock & Title */}
        <div className="lg:col-span-4 text-left space-y-4">
          <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-full w-fit border border-white/10 animate-bounce">
            <Flame className="h-4.5 w-4.5 text-yellow-300 fill-yellow-300" />
            <span className="text-[10px] md:text-xs font-black uppercase tracking-wider font-sans">
              {language === "bn" ? "সীমিত সময়ের অফার" : "Lightning Deal"}
            </span>
          </div>

          <div>
            <h2 className="font-sans font-black text-2xl md:text-3.5xl tracking-tight leading-none text-white">
              {language === "bn" ? "মেগা ফ্ল্যাশ সেল!" : "MEGA FLASH SALE!"}
            </h2>
            <p className="text-white/85 text-xs font-medium leading-relaxed mt-2 font-sans">
              {language === "bn" 
                ? "আমাদের সেরা গ্যাজেট ও ফ্যাশন আইটেমগুলোতে পেয়ে যান ৩০-৪০% পর্যন্ত ফ্ল্যাট ড্যামেজ ডিল ছাড়!" 
                : "Grab exclusive 30-40% lightning discounts on our high-demand footwear and premium gadgets."}
            </p>
          </div>

          {/* Countdown Clock Panel */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-white/70 uppercase font-black tracking-widest flex items-center gap-1 font-sans">
              <Clock className="h-3.5 w-3.5 text-yellow-300" />
              {language === "bn" ? "অফারের বাকি সময়" : "Ends In"}
            </span>
            <div className="flex items-center gap-2 font-mono">
              <div className="bg-black/25 backdrop-blur-md p-3.5 rounded-2xl border border-white/5 text-center min-w-[55px] shadow-inner">
                <span className="text-xl md:text-2xl font-black text-yellow-300 block leading-none">{format(timeLeft.hours)}</span>
                <span className="text-[8px] text-white/60 uppercase font-bold tracking-wider mt-1 block">Hrs</span>
              </div>
              <span className="text-xl font-bold text-white/50 animate-pulse">:</span>
              <div className="bg-black/25 backdrop-blur-md p-3.5 rounded-2xl border border-white/5 text-center min-w-[55px] shadow-inner">
                <span className="text-xl md:text-2xl font-black text-yellow-300 block leading-none">{format(timeLeft.minutes)}</span>
                <span className="text-[8px] text-white/60 uppercase font-bold tracking-wider mt-1 block">Min</span>
              </div>
              <span className="text-xl font-bold text-white/50 animate-pulse">:</span>
              <div className="bg-black/25 backdrop-blur-md p-3.5 rounded-2xl border border-white/5 text-center min-w-[55px] shadow-inner">
                <span className="text-xl md:text-2xl font-black text-yellow-300 block leading-none">{format(timeLeft.seconds)}</span>
                <span className="text-[8px] text-white/60 uppercase font-bold tracking-wider mt-1 block">Sec</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Grid: Products Showcased */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {flashSaleItems.map((p) => {
            const salePrice = Math.round(p.price * 0.75); // 25% discount
            return (
              <div
                id={`flash-item-${p.id}`}
                key={p.id}
                onClick={() => onSelect(p)}
                className="bg-white/10 backdrop-blur-lg border border-white/10 hover:border-white/20 p-4 rounded-3xl text-left flex flex-col justify-between hover:shadow-xl transition-all cursor-pointer relative group h-[190px]"
              >
                {/* Sale Discount Sticker */}
                <span className="absolute top-3 left-3 bg-yellow-400 text-gray-900 font-sans font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm">
                  {language === "bn" ? "২৫% ছাড়" : "25% OFF"}
                </span>

                <div className="flex gap-4 items-start">
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    referrerPolicy="no-referrer"
                    className="h-20 w-20 rounded-2xl object-cover bg-white/5 border border-white/15 shrink-0 shadow-md"
                  />
                  <div className="space-y-1">
                    <span className="text-[9px] text-white/60 uppercase tracking-widest font-black font-sans">{p.category}</span>
                    <h4 className="font-extrabold text-sm text-white line-clamp-2 leading-tight">
                      {p.name}
                    </h4>
                    
                    {/* Price with Discount */}
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="font-mono font-black text-base text-yellow-300">₹ {salePrice.toLocaleString("en-BD")}</span>
                      <span className="font-mono text-[11px] line-through text-white/50">₹ {p.price.toLocaleString("en-BD")}</span>
                    </div>
                  </div>
                </div>

                {/* Stock Left Progress Indicator */}
                <div className="space-y-1 mt-3">
                  <div className="flex items-center justify-between text-[10px] text-white/80 font-bold font-sans">
                    <span>{language === "bn" ? "মাত্র কয়েকটি বাকি!" : "Almost Sold Out!"}</span>
                    <span className="text-yellow-200">5 {language === "bn" ? "টি স্টক" : "left"}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full w-1/4 animate-pulse" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
