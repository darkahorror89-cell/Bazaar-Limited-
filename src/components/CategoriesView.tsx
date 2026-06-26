import { useState } from "react";
import { Product } from "../types";
import ProductCard from "./ProductCard";
import { 
  Laptop, 
  Smartphone, 
  ShoppingBag, 
  Home, 
  Compass, 
  ChevronRight, 
  ChevronLeft,
  Flame,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CategoriesViewProps {
  products: Product[];
  onAddToCart: (p: Product) => void;
  selectedCategory: string | null;
  setSelectedCategory: (cat: string | null) => void;
  language: "bn" | "en";
  wishlist: Product[];
  onToggleWishlist: (p: Product) => void;
  onSelect?: (p: Product) => void;
  compareList?: Product[];
  onToggleCompare?: (p: Product) => void;
}

interface CategoryMetaData {
  id: string;
  nameEn: string;
  nameBn: string;
  descriptionEn: string;
  descriptionBn: string;
  gradient: string;
  icon: any;
  itemCount: number;
}

export default function CategoriesView({
  products,
  onAddToCart,
  selectedCategory,
  setSelectedCategory,
  language,
  wishlist,
  onToggleWishlist,
  onSelect,
  compareList = [],
  onToggleCompare
}: CategoriesViewProps) {
  const [catSearchQuery, setCatSearchQuery] = useState("");

  // Get dynamic count of items in each category
  const getCount = (cat: string) => {
    return products.filter(p => p.category.toLowerCase() === cat.toLowerCase()).length;
  };

  const CATEGORY_LIST: CategoryMetaData[] = [
    {
      id: "Electronics",
      nameEn: "Electronics & Gadgets",
      nameBn: "ইলেকট্রনিক্স ও গ্যাজেটস",
      descriptionEn: "Mechanical keyboards, headphones, chargers, smart devices.",
      descriptionBn: "মেকানিক্যাল কিবোর্ড, হাই-ফাই হেডফোন ও নিত্যনতুন গ্যাজেট।",
      gradient: "from-purple-500 via-indigo-500 to-blue-600",
      icon: Laptop,
      itemCount: getCount("Electronics")
    },
    {
      id: "Footwear",
      nameEn: "Premium Footwear",
      nameBn: "প্রিমিয়াম জুতো ও স্নিকার্স",
      descriptionEn: "Sneakers, running shoes, and sports footwear.",
      descriptionBn: "স্টাইলিশ রানিং সু, স্নিকার্স এবং ক্যাজুয়াল জুতো।",
      gradient: "from-amber-500 via-orange-500 to-red-600",
      icon: Flame,
      itemCount: getCount("Footwear")
    },
    {
      id: "Accessories",
      nameEn: "Fashion Accessories",
      nameBn: "ফ্যাশন এক্সেসরিজ",
      descriptionEn: "Water flasks, minimalist backpacks, smart wearables.",
      descriptionBn: "ব্যাকপ্যাক, ওয়াটার ফ্লাস্ক ও মেটাল রিং এক্সেসরিজ।",
      gradient: "from-pink-500 via-rose-500 to-red-500",
      icon: ShoppingBag,
      itemCount: getCount("Accessories")
    },
    {
      id: "Home & Living",
      nameEn: "Home & Living Essentials",
      nameBn: "গৃহসজ্জা ও লাইফস্টাইল",
      descriptionEn: "Scented candles, minimalist room decors, organizers.",
      descriptionBn: "অ্যারোমা সুগন্ধি মোমবাতি ও আকর্ষণীয় হোম ডেকর আইটেম।",
      gradient: "from-teal-500 via-emerald-500 to-green-600",
      icon: Home,
      itemCount: getCount("Home & Living")
    }
  ];

  // Also extract any other dynamic category that is not in the list
  const activeProductCategories = Array.from(new Set(products.map(p => p.category)));
  const dynamicCategories = activeProductCategories.filter(
    cat => !CATEGORY_LIST.some(staticCat => staticCat.id.toLowerCase() === cat.toLowerCase())
  );

  // Append dynamic categories with default styling
  const finalCategories = [...CATEGORY_LIST];
  dynamicCategories.forEach(cat => {
    finalCategories.push({
      id: cat,
      nameEn: cat,
      nameBn: cat,
      descriptionEn: `Browse premium products in ${cat}.`,
      descriptionBn: `${cat} বিভাগের সেরা পণ্যসমূহ ব্রাউজ করুন।`,
      gradient: "from-blue-500 via-sky-500 to-indigo-500",
      icon: Compass,
      itemCount: getCount(cat)
    });
  });

  const filteredCategories = finalCategories.filter(cat => {
    const term = catSearchQuery.toLowerCase();
    return (
      cat.nameEn.toLowerCase().includes(term) ||
      cat.nameBn.toLowerCase().includes(term) ||
      cat.id.toLowerCase().includes(term)
    );
  });

  const activeCategoryData = finalCategories.find(
    c => c.id.toLowerCase() === (selectedCategory || "").toLowerCase()
  );

  const categoryProducts = selectedCategory
    ? products.filter(p => p.category.toLowerCase() === selectedCategory.toLowerCase())
    : [];

  return (
    <div id="categories-view-container" className="space-y-6">
      <AnimatePresence mode="wait">
        {!selectedCategory ? (
          /* CATEGORIES GRID OVERVIEW */
          <motion.div
            key="cat-grid"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <h2 className="font-sans font-bold text-2xl text-gray-900 tracking-tight flex items-center gap-2">
                  <Compass className="h-6 w-6 text-indigo-600 animate-pulse" />
                  {language === "bn" ? "ক্যাটাগরি সমূহ" : "Explore Categories"}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {language === "bn" 
                    ? "আপনার পছন্দের ক্যাটাগরি বেছে নিয়ে সহজেই কেনাকাটা করুন।" 
                    : "Find exactly what you need sorted into beautifully organized spaces."}
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  id="category-search-input"
                  type="text"
                  placeholder={language === "bn" ? "ক্যাটাগরি খুঁজুন..." : "Search categories..."}
                  value={catSearchQuery}
                  onChange={(e) => setCatSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition-all"
                />
              </div>
            </div>

            {/* Category Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCategories.map((cat, idx) => {
                const IconComponent = cat.icon;
                return (
                  <motion.div
                    id={`category-card-${cat.id}`}
                    key={cat.id}
                    whileHover={{ scale: 1.02, y: -4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    onClick={() => setSelectedCategory(cat.id)}
                    className="relative rounded-3xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all cursor-pointer p-6 flex flex-col justify-between min-h-[180px]"
                  >
                    {/* Background Subtle Gradient overlay */}
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-tr ${cat.gradient} opacity-5 blur-2xl rounded-full`} />
                    
                    <div className="flex items-start justify-between">
                      <div className={`bg-gradient-to-tr ${cat.gradient} text-white p-3.5 rounded-2xl shadow-lg`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <span className="bg-gray-100 text-gray-600 text-[10px] font-bold font-mono px-2.5 py-1 rounded-full uppercase">
                        {cat.itemCount} {language === "bn" ? "পণ্য" : "Items"}
                      </span>
                    </div>

                    <div className="mt-4">
                      <h3 className="font-sans font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {language === "bn" ? cat.nameBn : cat.nameEn}
                      </h3>
                      <p className="text-xs text-gray-500 leading-relaxed mt-1 line-clamp-2">
                        {language === "bn" ? cat.descriptionBn : cat.descriptionEn}
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-indigo-600 font-semibold text-xs">
                      <span>{language === "bn" ? "পণ্যগুলো দেখুন" : "Browse Products"}</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          /* CATEGORY PRODUCTS LISTING */
          <motion.div
            key="cat-list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Header Panel with Category Gradient */}
            <div className={`rounded-3xl bg-gradient-to-r ${activeCategoryData?.gradient || "from-indigo-600 to-blue-700"} text-white p-6 md:p-8 shadow-xl relative overflow-hidden`}>
              {/* Abstract visual decorations */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-8 -mb-8" />
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <button
                    id="back-to-categories-btn"
                    onClick={() => setSelectedCategory(null)}
                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/35 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border border-white/10 w-fit"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {language === "bn" ? "ক্যাটাগরি তালিকায় ফিরুন" : "Back to Categories"}
                  </button>

                  <h1 className="font-sans font-bold text-2xl md:text-3xl tracking-tight mt-2">
                    {language === "bn" ? activeCategoryData?.nameBn : activeCategoryData?.nameEn}
                  </h1>
                  <p className="text-white/80 text-xs md:text-sm max-w-lg leading-relaxed">
                    {language === "bn" ? activeCategoryData?.descriptionBn : activeCategoryData?.descriptionEn}
                  </p>
                </div>

                <div className="bg-white/25 backdrop-blur-lg px-4 py-3 rounded-2xl border border-white/20 text-center md:text-right w-fit">
                  <span className="text-[10px] text-white/70 uppercase tracking-widest font-bold">Total Stocked</span>
                  <p className="font-sans font-extrabold text-2xl md:text-3xl mt-0.5">{categoryProducts.length}</p>
                </div>
              </div>
            </div>

            {/* Product Feed */}
            {categoryProducts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 space-y-3">
                <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto" />
                <p className="text-gray-500 font-medium text-sm">
                  {language === "bn" ? "এই ক্যাটাগরিতে কোনো পণ্য নেই।" : "No items found in this category yet."}
                </p>
                <button
                  id="reset-category-empty-btn"
                  onClick={() => setSelectedCategory(null)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-xl text-xs"
                >
                  {language === "bn" ? "অন্য ক্যাটাগরি দেখুন" : "View Other Categories"}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {categoryProducts.map(product => (
                  <ProductCard
                    key={`cat-prod-${product.id}`}
                    product={product}
                    onAddToCart={onAddToCart}
                    isWishlisted={wishlist.some(w => w.id === product.id)}
                    onToggleWishlist={onToggleWishlist}
                    onSelect={onSelect}
                    isComparing={compareList.some(item => item.id === product.id)}
                    onToggleCompare={onToggleCompare}
                    language={language}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
