import React from "react";
import { X, ShoppingCart, Trash2, Star, CheckCircle2 } from "lucide-react";
import { Product } from "../types";
import { motion } from "motion/react";

interface ProductComparisonProps {
  compareList: Product[];
  onRemoveFromCompare: (p: Product) => void;
  onAddToCart: (p: Product) => void;
  onClose: () => void;
  language: "bn" | "en";
}

export default function ProductComparison({
  compareList,
  onRemoveFromCompare,
  onAddToCart,
  onClose,
  language
}: ProductComparisonProps) {
  
  // Specs finder helpers
  const getSpecs = (p: Product) => {
    switch (p.category) {
      case "Electronics":
        return {
          brand: language === "bn" ? "প্রো-টেক এভিয়েশন" : "ProTech Aviation",
          material: language === "bn" ? "প্লাস্টিক ও সিলিকন" : "ABS Plastic & Silicone",
          warranty: language === "bn" ? "১ বছর অফিসিয়াল" : "1 Year Official",
          features: language === "bn" ? "আরজিবি লাইটিং, ব্লুটুথ ৫.২" : "Tactile Switches, RGB, Bluetooth 5.2"
        };
      case "Footwear":
        return {
          brand: language === "bn" ? "গিয়ার রানিং কোং" : "Gear Running Co.",
          material: language === "bn" ? "নিটেড মেশ ও কুশনড সোল" : "Knit Mesh & Cushioned Sole",
          warranty: language === "bn" ? "৬ মাসের পেস্ট গ্যারান্টি" : "6 Months Sole Warranty",
          features: language === "bn" ? "হাই ইমপ্যাক্ট শোষণ, আল্ট্রা লাইট" : "Impact Absorption, Ultra Light"
        };
      case "Accessories":
        return {
          brand: language === "bn" ? "নর্ডিক আরবান লজিস্টিক" : "Nordic Urban Logistics",
          material: language === "bn" ? "স্টেইনলেস স্টিল / প্রিমিয়াম নাইলন" : "Stainless Steel / Premium Nylon",
          warranty: language === "bn" ? "২ বছরের থার্মাল কাভার" : "2 Years Transit Cover",
          features: language === "bn" ? "ভ্যাকুয়াম ইনসুলেশন, ওয়াটারপ্রুফ" : "Vacuum Insulated, Water-resistant"
        };
      default:
        return {
          brand: language === "bn" ? "অর্গানিক বোটানিক্যালস" : "Organic Botanicals Co.",
          material: language === "bn" ? "প্রাকৃতিক সয় মোম" : "Eco-Friendly Organic Soy Wax",
          warranty: language === "bn" ? "ড্যামেজ ট্রানজিট কাভার" : "Damage Transit Cover",
          features: language === "bn" ? "৫০ ঘণ্টা দীর্ঘ জ্বালানি, স্মোকড ওক" : "50h Burn Time, Smoked Oak infusion"
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/65 backdrop-blur-md overflow-y-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.98 }}
        className="relative bg-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl z-10 border border-gray-100 flex flex-col my-8"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
          <div className="text-left">
            <h2 className="font-sans font-black text-lg md:text-xl text-gray-900 tracking-tight">
              {language === "bn" ? "পণ্যের বিবরণ তুলনা করুন" : "Side-by-Side Product Comparison"}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {language === "bn" 
                ? "পাশাপাশি রেখে পণ্যের স্পেসিফিকেশন ও মূল্য তুলনা করুন।" 
                : "Compare visual details, pricing tiers, stock capacity, and official warranty parameters side-by-side."}
            </p>
          </div>
          <button
            id="close-compare-modal-btn"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors border border-gray-50 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Compare Table */}
        <div className="p-6 overflow-x-auto">
          {compareList.length === 0 ? (
            <div className="text-center py-16 space-y-3 font-sans">
              <Trash2 className="h-10 w-10 text-gray-200 mx-auto" />
              <p className="text-gray-400 text-xs">
                {language === "bn" ? "তুলনা করার জন্য কোনো পণ্য সিলেক্ট করা নেই।" : "No items selected to compare yet."}
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[600px] border-collapse text-left text-xs text-gray-600 font-sans">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-4 px-3 font-bold text-gray-400 uppercase tracking-wider w-1/4">
                    {language === "bn" ? "বৈশিষ্ট্যসমূহ" : "Specifications"}
                  </th>
                  {compareList.map((product) => (
                    <th key={product.id} className="py-4 px-3 w-1/4 relative group">
                      <button
                        id={`remove-compare-${product.id}`}
                        onClick={() => onRemoveFromCompare(product)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-150 shadow-xs cursor-pointer opacity-0 group-hover:opacity-100"
                        title={language === "bn" ? "তুলনা থেকে সরান" : "Remove from Compare"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <div className="space-y-3 pr-4">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-32 object-cover rounded-2xl bg-gray-50 border border-gray-100 shadow-sm"
                        />
                        <div>
                          <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">{product.category}</span>
                          <h4 className="font-extrabold text-gray-900 text-xs mt-0.5 line-clamp-2 leading-tight h-8">
                            {product.name}
                          </h4>
                        </div>
                      </div>
                    </th>
                  ))}
                  {/* Fill empty cells to preserve 4 column layout */}
                  {Array.from({ length: Math.max(0, 3 - compareList.length) }).map((_, i) => (
                    <th key={`empty-th-${i}`} className="py-4 px-3 w-1/4 bg-gray-50/20 border border-dashed border-gray-100 rounded-3xl text-center text-gray-300">
                      <div className="flex flex-col items-center justify-center py-8">
                        <PlusCell language={language} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* 1. Price */}
                <tr className="hover:bg-gray-50/50">
                  <td className="py-3 px-3 font-bold text-gray-700 bg-gray-50/30">
                    {language === "bn" ? "মূল্য" : "Price"}
                  </td>
                  {compareList.map((p) => (
                    <td key={`price-${p.id}`} className="py-3 px-3 font-mono font-extrabold text-sm text-gray-950">
                      ₹ {p.price.toLocaleString("en-BD")}
                    </td>
                  ))}
                  {Array.from({ length: Math.max(0, 3 - compareList.length) }).map((_, i) => (
                    <td key={`empty-price-${i}`} className="bg-gray-50/10" />
                  ))}
                </tr>

                {/* 2. Rating */}
                <tr className="hover:bg-gray-50/50">
                  <td className="py-3 px-3 font-bold text-gray-700 bg-gray-50/30">
                    {language === "bn" ? "রেটিং" : "Rating"}
                  </td>
                  {compareList.map((p) => (
                    <td key={`rating-${p.id}`} className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-gray-800">{p.rating}</span>
                        <span className="text-[10px] text-gray-400">/ 5.0</span>
                      </div>
                    </td>
                  ))}
                  {Array.from({ length: Math.max(0, 3 - compareList.length) }).map((_, i) => (
                    <td key={`empty-rating-${i}`} className="bg-gray-50/10" />
                  ))}
                </tr>

                {/* 3. Brand */}
                <tr className="hover:bg-gray-50/50">
                  <td className="py-3 px-3 font-bold text-gray-700 bg-gray-50/30">
                    {language === "bn" ? "ব্র্যান্ড" : "Brand / Seller"}
                  </td>
                  {compareList.map((p) => (
                    <td key={`brand-${p.id}`} className="py-3 px-3 font-medium text-gray-800">
                      {getSpecs(p).brand}
                    </td>
                  ))}
                  {Array.from({ length: Math.max(0, 3 - compareList.length) }).map((_, i) => (
                    <td key={`empty-brand-${i}`} className="bg-gray-50/10" />
                  ))}
                </tr>

                {/* 4. Material */}
                <tr className="hover:bg-gray-50/50">
                  <td className="py-3 px-3 font-bold text-gray-700 bg-gray-50/30">
                    {language === "bn" ? "উপাদান" : "Material Construction"}
                  </td>
                  {compareList.map((p) => (
                    <td key={`material-${p.id}`} className="py-3 px-3 text-gray-650">
                      {getSpecs(p).material}
                    </td>
                  ))}
                  {Array.from({ length: Math.max(0, 3 - compareList.length) }).map((_, i) => (
                    <td key={`empty-mat-${i}`} className="bg-gray-50/10" />
                  ))}
                </tr>

                {/* 5. Key Features */}
                <tr className="hover:bg-gray-50/50">
                  <td className="py-3 px-3 font-bold text-gray-700 bg-gray-50/30">
                    {language === "bn" ? "প্রধান ফিচারস" : "Key Integration features"}
                  </td>
                  {compareList.map((p) => (
                    <td key={`features-${p.id}`} className="py-3 px-3 text-gray-650">
                      {getSpecs(p).features}
                    </td>
                  ))}
                  {Array.from({ length: Math.max(0, 3 - compareList.length) }).map((_, i) => (
                    <td key={`empty-feat-${i}`} className="bg-gray-50/10" />
                  ))}
                </tr>

                {/* 6. Warranty */}
                <tr className="hover:bg-gray-50/50">
                  <td className="py-3 px-3 font-bold text-gray-700 bg-gray-50/30">
                    {language === "bn" ? "ওয়ারেন্টি" : "Official Warranty"}
                  </td>
                  {compareList.map((p) => (
                    <td key={`warranty-${p.id}`} className="py-3 px-3 text-gray-850 font-semibold">
                      {getSpecs(p).warranty}
                    </td>
                  ))}
                  {Array.from({ length: Math.max(0, 3 - compareList.length) }).map((_, i) => (
                    <td key={`empty-warr-${i}`} className="bg-gray-50/10" />
                  ))}
                </tr>

                {/* 7. Stock status */}
                <tr className="hover:bg-gray-50/50">
                  <td className="py-3 px-3 font-bold text-gray-700 bg-gray-50/30">
                    {language === "bn" ? "স্টক পরিমাপ" : "Inventory Status"}
                  </td>
                  {compareList.map((p) => (
                    <td key={`stock-${p.id}`} className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        p.stock > 5 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      }`}>
                        {p.stock > 0 ? (language === "bn" ? `${p.stock} টি মজুদ` : `${p.stock} in Stock`) : (language === "bn" ? "স্টকআউট" : "Out of stock")}
                      </span>
                    </td>
                  ))}
                  {Array.from({ length: Math.max(0, 3 - compareList.length) }).map((_, i) => (
                    <td key={`empty-stock-${i}`} className="bg-gray-50/10" />
                  ))}
                </tr>

                {/* 8. Purchase trigger */}
                <tr>
                  <td className="py-4 px-3 bg-gray-50/20" />
                  {compareList.map((p) => (
                    <td key={`action-${p.id}`} className="py-4 px-3">
                      <button
                        id={`compare-add-cart-${p.id}`}
                        onClick={() => onAddToCart(p)}
                        disabled={p.stock === 0}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold py-2.5 px-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-wide cursor-pointer"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        <span>{language === "bn" ? "কার্ট" : "Buy Now"}</span>
                      </button>
                    </td>
                  ))}
                  {Array.from({ length: Math.max(0, 3 - compareList.length) }).map((_, i) => (
                    <td key={`empty-act-${i}`} className="bg-gray-50/10" />
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function PlusCell({ language }: { language: "bn" | "en" }) {
  return (
    <div className="flex flex-col items-center text-gray-300 gap-1.5">
      <div className="p-3 border-2 border-dashed border-gray-250 rounded-full">
        <CheckCircle2 className="h-5 w-5 text-gray-250" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">
        {language === "bn" ? "খালি স্লট" : "Empty Slot"}
      </span>
    </div>
  );
}
