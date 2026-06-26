import { useState } from "react";
import { 
  Search, 
  ShoppingCart, 
  User, 
  Camera, 
  PlusCircle, 
  ShoppingBag, 
  Compass, 
  MapPin, 
  Truck, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Sparkles,
  Bike,
  Tv
} from "lucide-react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { motion, AnimatePresence } from "motion/react";

interface NavbarProps {
  cartCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onImageSearchClick: () => void;
  activeTab: "home" | "categories" | "cart" | "orders" | "profile" | "seller" | "courier" | "live";
  setActiveTab: (tab: "home" | "categories" | "cart" | "orders" | "profile" | "seller" | "courier" | "live") => void;
  language: "bn" | "en";
  user: any;
}

export default function Navbar({
  cartCount,
  searchQuery,
  setSearchQuery,
  onImageSearchClick,
  activeTab,
  setActiveTab,
  language,
  user
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign Out Error:", error);
    }
  };

  const menuItems = [
    { id: "home" as const, labelEn: "Home", labelBn: "হোম", icon: ShoppingBag },
    { id: "categories" as const, labelEn: "Categories", labelBn: "ক্যাটাগরি", icon: Compass },
    { id: "live" as const, labelEn: "Live Shopping", labelBn: "লাইভ শপিং", icon: Tv },
    { id: "cart" as const, labelEn: "Cart", labelBn: "কার্ট", icon: ShoppingCart, count: cartCount },
    { id: "orders" as const, labelEn: "Tracking", labelBn: "ট্র্যাক", icon: Truck },
    { id: "profile" as const, labelEn: "Profile", labelBn: "প্রোফাইল", icon: User },
    { id: "seller" as const, labelEn: "Merchant", labelBn: "সেলার", icon: PlusCircle },
    { id: "courier" as const, labelEn: "Courier", labelBn: "কুরিয়ার", icon: Bike }
  ];

  return (
    <>
      {/* DESKTOP HEADER */}
      <nav id="app-navbar" className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 md:px-8 font-sans">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Brand Logo & Title */}
          <div 
            className="flex items-center gap-2 cursor-pointer shrink-0" 
            onClick={() => {
              setActiveTab("home");
              setSearchQuery("");
            }}
          >
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl text-white shadow-md shadow-blue-200">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-sans font-bold tracking-tight text-lg bg-gradient-to-r from-gray-900 via-indigo-950 to-blue-900 bg-clip-text text-transparent leading-none">
                {language === "bn" ? "বাজার লিমিটেড" : "Bazar Limited"}
              </span>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5 font-mono">
                Play Store Ready
              </span>
            </div>
          </div>

          {/* Search bar inside Home tab only, or persistent helper */}
          <div className="flex-1 max-w-md relative flex items-center">
            <div className="absolute left-3 text-gray-400 pointer-events-none">
              <Search className="h-4 w-4" />
            </div>
            <input
              id="nav-search-input"
              type="text"
              placeholder={language === "bn" ? "পণ্য বা ক্যাটাগরি দিয়ে খুঁজুন..." : "Search products, category..."}
              value={searchQuery}
              onChange={(e) => {
                if (activeTab !== "home") {
                  setActiveTab("home");
                }
                setSearchQuery(e.target.value);
              }}
              className="w-full pl-10 pr-12 py-2 rounded-full border border-gray-250 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-xs font-sans"
            />
            <button
              id="nav-image-search-btn"
              onClick={onImageSearchClick}
              title={language === "bn" ? "ইমেজ দিয়ে খুঁজুন (AI)" : "Search with Image (Gemini Vision)"}
              className="absolute right-3 text-gray-500 hover:text-indigo-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Desktop Tab links */}
          <div className="hidden md:flex items-center gap-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  id={`nav-tab-${item.id}`}
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{language === "bn" ? item.labelBn : item.labelEn}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className={`h-4.5 w-4.5 text-[9px] font-bold rounded-full flex items-center justify-center border ${
                      isActive ? "bg-white text-indigo-600 border-white" : "bg-red-500 text-white border-white"
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-700 transition-colors"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

        </div>
      </nav>

      {/* MOBILE DRAWER NAVIGATION */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 md:hidden" onClick={() => setMobileMenuOpen(false)} />
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="fixed top-[57px] right-0 bottom-0 w-64 bg-white border-l border-gray-100 shadow-2xl z-30 p-6 md:hidden flex flex-col justify-between font-sans"
            >
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block border-b border-gray-50 pb-2">
                  {language === "bn" ? "মেনু ও নেভিগেশন" : "Application Views"}
                </span>
                
                <div className="space-y-1.5 text-left">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        id={`mob-tab-${item.id}`}
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                          isActive 
                            ? "bg-indigo-600 text-white shadow-md" 
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4.5 w-4.5 shrink-0" />
                          <span>{language === "bn" ? item.labelBn : item.labelEn}</span>
                        </div>
                        {item.count !== undefined && item.count > 0 && (
                          <span className={`h-5 w-5 text-[9px] font-bold rounded-full flex items-center justify-center border ${
                            isActive ? "bg-white text-indigo-600 border-white" : "bg-red-500 text-white border-white"
                          }`}>
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* User meta footer inside mobile menu */}
              {user && (
                <div className="border-t border-gray-50 pt-4 flex items-center justify-between text-xs text-gray-500">
                  <span className="truncate max-w-[140px] font-semibold text-gray-700">{user.displayName || user.email}</span>
                  <button
                    onClick={handleLogout}
                    className="text-red-500 hover:text-red-600 flex items-center gap-1 font-semibold"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MOBILE BOTTOM NAVIGATION BAR (Hallmark of Play Store Apps) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-150 py-1 px-2 flex justify-around md:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.03)] font-sans">
        {menuItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              id={`bottom-tab-${item.id}`}
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl relative select-none w-14 cursor-pointer"
            >
              <Icon className={`h-5 w-5 transition-transform ${isActive ? "text-indigo-600 scale-110" : "text-gray-400"}`} />
              <span className={`text-[9px] font-bold mt-1 tracking-tight truncate ${isActive ? "text-indigo-600 font-extrabold" : "text-gray-400"}`}>
                {language === "bn" ? item.labelBn : item.labelEn}
              </span>
              {item.count !== undefined && item.count > 0 && (
                <span className="absolute top-1 right-2 bg-red-500 text-white text-[8px] font-black h-4 w-4 rounded-full flex items-center justify-center border border-white">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
