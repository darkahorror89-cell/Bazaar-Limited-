import { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, query, where, doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { INITIAL_PRODUCTS } from "./data";
import { Product, CartItem } from "./types";
import Navbar from "./components/Navbar";
import ProductCard from "./components/ProductCard";
import Chatbot from "./components/Chatbot";
import ImageSearch from "./components/ImageSearch";
import AutoDescription from "./components/AutoDescription";
import CategoriesView from "./components/CategoriesView";
import ProfileView from "./components/ProfileView";
import CartView from "./components/CartView";
import OrderList from "./components/OrderList";
import CourierPanelView from "./components/CourierPanelView";
import LiveShoppingView from "./components/LiveShoppingView";
import PromoCarousel from "./components/PromoCarousel";
import ProductDetailsModal from "./components/ProductDetailsModal";
import { Sparkles, ShoppingBag, Camera, RotateCcw, HelpCircle, Heart, Sliders, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useToast } from "./context/ToastContext";

export default function App() {
  const { toast } = useToast();

  // Wishlist states
  const [wishlist, setWishlist] = useState<Product[]>(() => {
    const saved = localStorage.getItem("bazar_wishlist");
    return saved ? JSON.parse(saved) : [];
  });
  const [isWishlistFilterActive, setIsWishlistFilterActive] = useState(false);

  // Real-time order status listener comparison ref
  const previousStatusesRef = useRef<Record<string, string>>({});

  // Storefront catalog states
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Navigation tab states ('home' | 'categories' | 'cart' | 'orders' | 'profile' | 'seller' | 'courier' | 'live')
  const [activeTab, setActiveTab] = useState<"home" | "categories" | "cart" | "orders" | "profile" | "seller" | "courier" | "live">("home");
  const [language, setLanguage] = useState<"bn" | "en">("en");
  const [ordersCount, setOrdersCount] = useState<number>(0);

  // Modals & Panel views (Image search remains as a floating camera utility)
  const [isImageSearchOpen, setIsImageSearchOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);

  // AI Recommendation states
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
  const [isRecsLoading, setIsRecsLoading] = useState(false);

  // Vision Search Filter states
  const [imageSearchMatchedIds, setImageSearchMatchedIds] = useState<string[] | null>(null);
  const [imageSearchLabel, setImageSearchLabel] = useState<string | null>(null);

  // Authentication State
  const [user, setUser] = useState<any>(null);

  // Advanced Product Filtering states
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(150000);
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [onlyInStockFilter, setOnlyInStockFilter] = useState<boolean>(false);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState<boolean>(false);

  // Sync Auth State
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Intercept referral URL query parameter on startup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode) {
      // Store in localStorage
      localStorage.setItem("bazar_referred_by", refCode);
      
      // Remove ref param from URL to keep it clean and bookmarkable
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
      
      // Show welcoming toast!
      toast(
        language === "bn"
          ? "রেফারেল লিংক সফলভাবে ট্র্যাক করা হয়েছে! সাইন-ইন করলে বা কার্ট পেমেন্ট করলে আকর্ষণীয় ছাড় পাবেন।"
          : "Referral code tracked! Log in or sign up to claim your special discount code.",
        { type: "success", title: language === "bn" ? "রেফারেল অ্যাক্টিভ" : "Referral Activated" }
      );
    }
  }, [language]);

  // Process pending referral reward when a user logs in
  useEffect(() => {
    const processReferral = async () => {
      if (!user) return;
      const referredBy = localStorage.getItem("bazar_referred_by");
      if (!referredBy) return;

      // Prevent self-referral
      if (referredBy === user.uid) {
        localStorage.removeItem("bazar_referred_by");
        return;
      }

      try {
        const referralDocRef = doc(db, "referrals", user.uid);
        const referralSnap = await getDoc(referralDocRef);
        
        // If the referral document does not exist yet, create it!
        if (!referralSnap.exists()) {
          const refereeCoupon = `WELCOME-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${user.uid.substring(0, 4).toUpperCase()}`;
          const referrerCoupon = `REWARD-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${referredBy.substring(0, 4).toUpperCase()}`;
          
          await setDoc(referralDocRef, {
            id: user.uid,
            referrerUid: referredBy,
            refereeUid: user.uid,
            refereeName: user.displayName || user.email?.split("@")[0] || "New User",
            refereeEmail: user.email || "No Email",
            refereeCoupon: refereeCoupon,
            referrerCoupon: referrerCoupon,
            refereeCouponUsed: false,
            referrerCouponUsed: false,
            createdAt: new Date().toISOString()
          });

          toast(
            language === "bn"
              ? "অভিনন্দন! রেফারেলের মাধ্যমে আপনি ১৫% মূল্যছাড় কুপন পেয়েছেন।"
              : "Congratulations! You have received a 15% discount coupon through referral.",
            { type: "success", title: language === "bn" ? "রেফারেল কুপন" : "Referral Reward" }
          );
        }
        
        // Clear pending referral from localStorage
        localStorage.removeItem("bazar_referred_by");
      } catch (error) {
        console.warn("Failed to record referral in Firestore:", error);
      }
    };

    processReferral();
  }, [user, language]);

  // Sync Products Catalog from Firestore (falls back to INITIAL_PRODUCTS)
  useEffect(() => {
    try {
      const productsRef = collection(db, "products");
      const unsubscribe = onSnapshot(productsRef, (snapshot) => {
        if (!snapshot.empty) {
          const fetchedProducts: Product[] = [];
          snapshot.forEach((doc) => {
            fetchedProducts.push(doc.data() as Product);
          });
          setProducts(fetchedProducts);
        } else {
          setProducts(INITIAL_PRODUCTS);
        }
      }, (error) => {
        console.warn("Firestore products read failed (could be unprovisioned yet). Staying in local fallback mode.", error);
        setProducts(INITIAL_PRODUCTS);
      });

      return () => unsubscribe();
    } catch (e) {
      setProducts(INITIAL_PRODUCTS);
    }
  }, []);

  // Sync Wishlist to local storage
  useEffect(() => {
    localStorage.setItem("bazar_wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  // Load wishlist from Firestore when user logs in
  useEffect(() => {
    if (!user) return;
    try {
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribe = onSnapshot(userDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && data.wishlist) {
            setWishlist(data.wishlist);
          }
        }
      }, (error) => {
        console.warn("Could not sync user wishlist from Firestore:", error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Error establishing user wishlist snapshot sync:", e);
    }
  }, [user]);

  // Real-time order count and status update notifier
  useEffect(() => {
    if (!user) {
      setOrdersCount(0);
      return;
    }
    const q = query(collection(db, "orders"), where("userId", "==", user.uid));
    
    // A flag to ignore the first snapshot so we don't spam toasts when initially loading existing orders
    let isInitialLoad = true;

    const unsubscribe = onSnapshot(q, (snap) => {
      setOrdersCount(snap.size);

      const currentStatuses: Record<string, string> = {};
      
      snap.forEach((doc) => {
        const order = doc.data();
        if (order && order.id && order.status) {
          currentStatuses[order.id] = order.status;
          
          // Check if status changed
          const prevStatus = previousStatusesRef.current[order.id];
          if (!isInitialLoad && prevStatus && prevStatus !== order.status) {
            // Translate status
            const getStatusText = (status: string, lang: "bn" | "en") => {
              switch (status.toLowerCase()) {
                case "pending": return lang === "bn" ? "অপেক্ষমান" : "Pending";
                case "processing": return lang === "bn" ? "প্রসেসিং" : "Processing";
                case "shipped": return lang === "bn" ? "পাঠানো হয়েছে" : "Shipped";
                case "delivered": return lang === "bn" ? "ডেলিভারি সম্পন্ন" : "Delivered";
                case "completed": return lang === "bn" ? "ডেলিভারি সম্পন্ন" : "Delivered";
                case "cancelled": return lang === "bn" ? "বাতিল" : "Cancelled";
                default: return status;
              }
            };

            toast(
              language === "bn"
                ? `আপনার অর্ডার (${order.id}) এর স্ট্যাটাস আপডেট হয়ে "${getStatusText(order.status, "bn")}" হয়েছে!`
                : `Your order (${order.id}) status has updated to "${getStatusText(order.status, "en")}"!`,
              { 
                type: "order", 
                title: language === "bn" ? "অর্ডার স্ট্যাটাস আপডেট" : "Order Status Updated" 
              }
            );
          }
        }
      });

      // Update previous statuses ref
      previousStatusesRef.current = currentStatuses;
      isInitialLoad = false;
    }, (error) => {
      console.warn("Could not query orders:", error);
    });

    return () => unsubscribe();
  }, [user, language]);

  // Track and log user search keywords to update AI Recommendations
  useEffect(() => {
    if (searchQuery.trim().length > 2) {
      const delayDebounce = setTimeout(() => {
        setRecentSearches(prev => {
          const updated = [searchQuery.trim(), ...prev.filter(s => s !== searchQuery.trim())];
          return updated.slice(0, 5); // Keep last 5 search queries
        });
      }, 800);
      return () => clearTimeout(delayDebounce);
    }
  }, [searchQuery]);

  // Dynamic AI product recommendations: triggered when cart or search patterns change, debounced and optimized to prevent rate limit (429) errors
  useEffect(() => {
    if (products.length === 0) return;

    const cartItemIdsKey = cart.map(item => item.product.id).sort().join(",");
    const recentSearchesKey = recentSearches.join(",");

    const delayDebounce = setTimeout(() => {
      const fetchAIRecommendations = async () => {
        setIsRecsLoading(true);
        try {
          const response = await fetch("/api/gemini/recommend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cartItems: cart,
              recentSearches: recentSearches,
              allProducts: products
            })
          });

          if (response.ok) {
            const data = await response.json();
            setRecommendedIds(data.recommendedIds || []);
          }
        } catch (error) {
          console.warn("AI recommendation endpoint unavailable or key not configured yet.", error);
        } finally {
          setIsRecsLoading(false);
        }
      };

      fetchAIRecommendations();
    }, 2000); // 2-second debounce to limit rate-limiting

    return () => clearTimeout(delayDebounce);
  }, [cart.map(item => item.product.id).sort().join(","), recentSearches.join(","), products.length]);

  // Shopping Cart Actions
  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        toast(
          language === "bn"
            ? `"${product.name}" এর পরিমাণ বাড়ানো হয়েছে!`
            : `Increased quantity of "${product.name}" in your cart!`,
          { type: "cart", title: language === "bn" ? "কার্ট আপডেট" : "Cart Updated" }
        );
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item
        );
      }
      toast(
        language === "bn"
          ? `"${product.name}" কার্টে যোগ করা হয়েছে!`
          : `Added "${product.name}" to your cart!`,
        { type: "cart", title: language === "bn" ? "কার্টে যোগ করা হয়েছে" : "Added to Cart" }
      );
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleToggleWishlist = async (product: Product) => {
    let updatedWishlist: Product[] = [];
    const isWishlisted = wishlist.some(item => item.id === product.id);
    if (isWishlisted) {
      toast(
        language === "bn"
          ? `"${product.name}" উইশলিস্ট থেকে সরানো হয়েছে`
          : `Removed "${product.name}" from your wishlist`,
        { type: "wishlist", title: language === "bn" ? "উইশলিস্ট আপডেট" : "Wishlist Removed" }
      );
      updatedWishlist = wishlist.filter(item => item.id !== product.id);
    } else {
      toast(
        language === "bn"
          ? `"${product.name}" উইশলিস্টে যুক্ত করা হয়েছে!`
          : `Added "${product.name}" to your wishlist!`,
        { type: "wishlist", title: language === "bn" ? "উইশলিস্টে যুক্ত করা হয়েছে" : "Wishlist Added" }
      );
      updatedWishlist = [...wishlist, product];
    }

    setWishlist(updatedWishlist);

    if (user) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, { wishlist: updatedWishlist }, { merge: true });
      } catch (e) {
        console.warn("Could not save wishlist update to Firestore:", e);
      }
    }
  };

  const handleUpdateCartQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(id);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === id ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (id: string) => {
    const item = cart.find(i => i.product.id === id);
    setCart(prev => prev.filter(item => item.product.id !== id));
    if (item) {
      toast(
        language === "bn"
          ? `"${item.product.name}" কার্ট থেকে সরানো হয়েছে`
          : `Removed "${item.product.name}" from your cart`,
        { type: "info", title: language === "bn" ? "কার্ট আপডেট" : "Cart Removed" }
      );
    }
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Visually filter store feed from Gemini Vision search modal
  const handleImageSearchFilter = (matchedIds: string[], identifiedLabel: string) => {
    setImageSearchMatchedIds(matchedIds);
    setImageSearchLabel(identifiedLabel);
    setActiveTab("home"); // Swaps back to home view to display image match feed
  };

  const resetImageSearchFilter = () => {
    setImageSearchMatchedIds(null);
    setImageSearchLabel(null);
  };

  // Callback when user publishes a new product from the Seller Console
  const handleNewProductPublished = (newProduct: Product) => {
    setProducts(prev => [newProduct, ...prev]);
    toast(
      language === "bn"
        ? `নতুন পণ্য "${newProduct.name}" সফলভাবে যুক্ত হয়েছে!`
        : `New product "${newProduct.name}" published successfully!`,
      { type: "success", title: language === "bn" ? "পণ্য আপলোড সম্পন্ন" : "Product Published" }
    );
    setActiveTab("home"); // Swaps back to home view to let them see newly added product!
  };

  // Callback on order completed successfully
  const handleOrderCompleted = (orderId: string) => {
    toast(
      language === "bn"
        ? `আপনার অর্ডার (${orderId}) সফলভাবে সম্পন্ন হয়েছে!`
        : `Your order (${orderId}) has been placed successfully!`,
      { type: "success", title: language === "bn" ? "অর্ডার সম্পন্ন" : "Order Confirmed" }
    );
    setActiveTab("orders"); // Open order list page to view the newly completed order
  };

  // Filter storefront view
  const displayProducts = products.filter(p => {
    // 0. Apply wishlist filter if active
    if (isWishlistFilterActive) {
      if (!wishlist.some(w => w.id === p.id)) {
        return false;
      }
    }
    // 1. Apply image search filter if set
    if (imageSearchMatchedIds !== null) {
      if (!imageSearchMatchedIds.includes(p.id)) return false;
    }
    // 2. Apply textual search query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const textMatched = (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
      if (!textMatched) return false;
    }

    // 3. Apply Advanced Filters
    // Price Filter
    if (p.price > maxPriceFilter) {
      return false;
    }
    // Rating Filter
    const productRating = p.rating || 4.5;
    if (productRating < minRatingFilter) {
      return false;
    }
    // Stock Availability Filter
    if (onlyInStockFilter && p.stock <= 0) {
      return false;
    }

    return true;
  });

  // Extract recommended products out of catalog
  const recommendedProducts = products.filter(p => recommendedIds.includes(p.id));

  // Category filter trigger specifically for the category view drilldown helper
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const cartTotalCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div id="store-main-app" className="min-h-screen bg-gray-50/40 flex flex-col font-sans text-gray-800 antialiased pb-16 md:pb-0">
      {/* Dynamic Navbar */}
      <Navbar
        cartCount={cartTotalCount}
        searchQuery={searchQuery}
        setSearchQuery={(q) => {
          resetImageSearchFilter();
          setSearchQuery(q);
        }}
        onImageSearchClick={() => setIsImageSearchOpen(true)}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          // Auto-scroll to top on page switches to mimic physical page transition
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        language={language}
        user={user}
      />

      {/* Main Single Page View Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-8 md:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            {/* 1. HOME VIEW */}
            {activeTab === "home" && (
              <div className="space-y-8">
                {/* Dynamic Image Search Alert Filter */}
                {imageSearchLabel && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Camera className="h-5 w-5 text-indigo-600" />
                      <div className="text-xs">
                        <span className="text-gray-500">Filtered by image match:</span>{" "}
                        <strong className="text-indigo-900">"{imageSearchLabel}"</strong>
                      </div>
                    </div>
                    <button
                      id="clear-image-filter-btn"
                      onClick={resetImageSearchFilter}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Clear Visual Filter
                    </button>
                  </motion.div>
                )}

                {/* Wishlist Active Filter Alert */}
                {isWishlistFilterActive && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
                      <div className="text-xs">
                        <span className="text-gray-500">Viewing your:</span>{" "}
                        <strong className="text-rose-900">Wishlist ({wishlist.length} items)</strong>
                      </div>
                    </div>
                    <button
                      id="clear-wishlist-filter-btn"
                      onClick={() => setIsWishlistFilterActive(false)}
                      className="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-1 cursor-pointer bg-transparent border-0"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      View All Products
                    </button>
                  </motion.div>
                )}

                {/* Promo Banners Campaign Carousel Slider */}
                {!imageSearchLabel && <PromoCarousel language={language} />}

                {/* AI Recommendations Section */}
                {recommendedProducts.length > 0 && !imageSearchLabel && (
                  <section id="ai-recommendations-row" className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-gradient-to-tr from-indigo-500 to-indigo-600 p-1.5 rounded-lg text-white shadow-md">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <h2 className="font-sans font-bold text-lg text-gray-900 tracking-tight">
                        {language === "bn" ? "আপনার জন্য এআই বাছাই" : "AI Curated Picks"}
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {recommendedProducts.map(product => (
                        <ProductCard
                          key={`rec-${product.id}`}
                          product={product}
                          onAddToCart={handleAddToCart}
                          isRecommended={true}
                          isWishlisted={wishlist.some(w => w.id === product.id)}
                          onToggleWishlist={handleToggleWishlist}
                          onSelect={setSelectedProductForModal}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Catalog Storefront Section */}
                <section id="product-catalog-section" className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-3">
                    <h2 className="font-sans font-bold text-xl text-gray-900 tracking-tight">
                      {searchQuery 
                        ? (language === "bn" ? `"${searchQuery}" এর অনুসন্ধান ফলাফল` : `Search Results for "${searchQuery}"`)
                        : (language === "bn" ? "নতুন পণ্যসমূহ এক্সপ্লোর করুন" : "Discover Products")}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
                        className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                          isAdvancedFilterOpen || maxPriceFilter < 150000 || minRatingFilter > 0 || onlyInStockFilter
                            ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-600 border border-transparent"
                        }`}
                      >
                        <Sliders className="h-3.5 w-3.5" />
                        <span>{language === "bn" ? "ফিল্টার" : "Filters"}</span>
                        {(maxPriceFilter < 150000 || minRatingFilter > 0 || onlyInStockFilter) && (
                          <span className="h-2 w-2 rounded-full bg-indigo-600 block"></span>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setIsWishlistFilterActive(!isWishlistFilterActive);
                        }}
                        className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                          isWishlistFilterActive 
                            ? "bg-rose-50 text-rose-600 border border-rose-200" 
                            : "bg-gray-100 hover:bg-gray-200 text-gray-600 border border-transparent"
                        }`}
                      >
                        <Heart className={`h-3.5 w-3.5 ${isWishlistFilterActive ? "fill-rose-500 text-rose-500" : ""}`} />
                        <span>{language === "bn" ? `উইশলিস্ট (${wishlist.length})` : `Wishlist (${wishlist.length})`}</span>
                      </button>

                      <span className="text-xs text-gray-400 font-semibold uppercase hidden lg:inline">
                        {displayProducts.length} {language === "bn" ? "পণ্য উপলব্ধ" : "Items Available"}
                      </span>
                    </div>
                  </div>

                  {/* ADVANCED FILTER PANEL */}
                  <AnimatePresence>
                    {isAdvancedFilterOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden bg-white border border-gray-100 rounded-2xl shadow-sm p-5 font-sans"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Price Filter */}
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-700 block">
                              {language === "bn" ? "সর্বোচ্চ মূল্য" : "Max Price Range"}
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="150000"
                              step="500"
                              value={maxPriceFilter}
                              onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                              className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between items-center text-xs font-mono font-bold text-gray-600">
                              <span>₹ 0</span>
                              <span className="text-indigo-600">₹ {maxPriceFilter.toLocaleString("en-BD")}</span>
                            </div>
                          </div>

                          {/* Rating Filter */}
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-700 block">
                              {language === "bn" ? "পণ্য রেটিং" : "Minimum Rating"}
                            </label>
                            <div className="flex items-center gap-1">
                              {[0, 3, 4, 4.5].map((val) => (
                                <button
                                  key={val}
                                  onClick={() => setMinRatingFilter(val)}
                                  className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                                    minRatingFilter === val
                                      ? "bg-indigo-600 text-white border-indigo-600"
                                      : "bg-white hover:bg-gray-50 text-gray-600 border-gray-100"
                                  }`}
                                >
                                  {val === 0 ? (
                                    language === "bn" ? "সব" : "All"
                                  ) : (
                                    <>
                                      <span>{val}★</span>
                                      <span className="text-[8px] font-normal">{language === "bn" ? "বা বেশি" : "up"}</span>
                                    </>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Stock Filter */}
                          <div className="space-y-2 flex flex-col justify-center">
                            <label className="text-xs font-bold text-gray-700 mb-1 block">
                              {language === "bn" ? "স্টক অপশন" : "Stock Option"}
                            </label>
                            <label className="relative flex items-center cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={onlyInStockFilter}
                                onChange={(e) => setOnlyInStockFilter(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                              <span className="ml-3 text-xs font-semibold text-gray-600">
                                {language === "bn" ? "শুধুমাত্র স্টকে থাকা পণ্য" : "In Stock Only"}
                              </span>
                            </label>
                          </div>
                        </div>

                        {/* Reset Buttons */}
                        <div className="mt-4 pt-3 border-t border-gray-50 flex justify-end">
                          <button
                            onClick={() => {
                              setMaxPriceFilter(150000);
                              setMinRatingFilter(0);
                              setOnlyInStockFilter(false);
                            }}
                            className="text-xs font-bold text-gray-400 hover:text-indigo-600 transition-all flex items-center gap-1 cursor-pointer bg-transparent border-0"
                          >
                            <RotateCcw className="h-3 w-3" />
                            {language === "bn" ? "ফিল্টার রিসেট করুন" : "Reset Filter Criteria"}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {displayProducts.length === 0 ? (
                    <div className="text-center py-16 space-y-3 bg-white border border-gray-100 rounded-3xl">
                      <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto" />
                      <p className="text-gray-500 font-medium text-sm">
                        {language === "bn" ? "কোনো পণ্য পাওয়া যায়নি।" : "No items match your active filter."}
                      </p>
                      <button
                        id="reset-search-btn"
                        onClick={() => {
                          setSearchQuery("");
                          resetImageSearchFilter();
                        }}
                        className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
                      >
                        {language === "bn" ? "সার্চ ফিল্টার রিসেট করুন" : "Reset Search Filters"}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {displayProducts.map(product => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onAddToCart={handleAddToCart}
                          isWishlisted={wishlist.some(w => w.id === product.id)}
                          onToggleWishlist={handleToggleWishlist}
                          onSelect={setSelectedProductForModal}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* 2. CATEGORIES VIEW */}
            {activeTab === "categories" && (
              <CategoriesView
                products={products}
                onAddToCart={handleAddToCart}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                language={language}
                wishlist={wishlist}
                onToggleWishlist={handleToggleWishlist}
                onSelect={setSelectedProductForModal}
              />
            )}

            {/* 2.5. LIVE STREAMING & SHOPPING VIEW */}
            {activeTab === "live" && (
              <LiveShoppingView
                products={products}
                onAddToCart={handleAddToCart}
                language={language}
                user={user}
                onOpenProductModal={setSelectedProductForModal}
              />
            )}

            {/* 3. SHOPPING CART VIEW */}
            {activeTab === "cart" && (
              <CartView
                cartItems={cart}
                onUpdateQuantity={handleUpdateCartQuantity}
                onRemoveItem={handleRemoveFromCart}
                onClearCart={handleClearCart}
                onOrderCompleted={handleOrderCompleted}
                language={language}
                user={user}
              />
            )}

            {/* 4. ORDERS & STATUS TRACKER VIEW */}
            {activeTab === "orders" && (
              <OrderList
                isFullPage={true}
                language={language}
              />
            )}

            {/* 5. USER PROFILE & ADDRESS BOOK VIEW */}
            {activeTab === "profile" && (
              <ProfileView
                user={user}
                ordersCount={ordersCount}
                language={language}
                setLanguage={setLanguage}
              />
            )}

            {/* 6. MERCHANT PUBLISHING CONSOLE VIEW */}
            {activeTab === "seller" && (
              <AutoDescription
                isFullPage={true}
                language={language}
                onProductPublished={handleNewProductPublished}
              />
            )}

            {/* 7. COURIER & DELIVERY RIDER VIEW */}
            {activeTab === "courier" && (
              <CourierPanelView
                language={language}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Persistent Support Chatbot */}
      <Chatbot />

      {/* Floating Utilities (AnimatePresence transitions) */}
      <AnimatePresence>
        {isImageSearchOpen && (
          <ImageSearch
            onClose={() => setIsImageSearchOpen(false)}
            allProducts={products}
            onFilterResults={handleImageSearchFilter}
          />
        )}
      </AnimatePresence>

      {/* Product Details Modal */}
      {selectedProductForModal && (
        <ProductDetailsModal
          product={selectedProductForModal}
          onClose={() => setSelectedProductForModal(null)}
          onAddToCart={handleAddToCart}
          isWishlisted={wishlist.some(w => w.id === selectedProductForModal.id)}
          onToggleWishlist={handleToggleWishlist}
          language={language}
        />
      )}

      {/* Footer bar */}
      <footer className="bg-white border-t border-gray-100 py-8 px-4 text-center text-xs text-gray-400 mt-12 hidden md:block">
        <p className="font-sans">© 2026 Bazar Limited. All rights reserved.</p>
        <p className="font-sans text-[10px] text-gray-300 mt-1.5 leading-relaxed">
          Designed with Google AI Studio. Real-time Firebase Firestore database connectivity. Fully integrated billing API gateway sandboxes.
        </p>
      </footer>
    </div>
  );
}
