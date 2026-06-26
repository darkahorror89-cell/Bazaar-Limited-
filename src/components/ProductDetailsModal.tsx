import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Star, 
  ShoppingCart, 
  Heart, 
  Share2, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  MessageSquare,
  ThumbsUp,
  Award,
  Camera,
  Image as ImageIcon,
  Trash2,
  Plus
} from "lucide-react";
import { Product } from "../types";
import { useToast } from "../context/ToastContext";
import { db } from "../firebase";
import { collection, onSnapshot, query, where, doc, setDoc, updateDoc } from "firebase/firestore";

interface ProductDetailsModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (p: Product) => void;
  isWishlisted: boolean;
  onToggleWishlist: (p: Product) => void;
  language: "bn" | "en";
}

interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  likes: number;
  images?: string[]; // Array of base64 images
}

// Generate pre-loaded mock reviews for each product category
const MOCK_REVIEWS_TEMPLATES: Record<string, { name: string; commentEn: string; commentBn: string; rating: number }[]> = {
  "Footwear": [
    { name: "Tahmid Islam", commentEn: "Super comfortable sneakers! Feels like walking on clouds. Highly recommended.", commentBn: "অসাধারণ আরামদায়ক জুতো! একদম তুলতুলে অনুভূতি। সবাইকে কেনার পরামর্শ দিচ্ছি।", rating: 5 },
    { name: "Nusrat Jahan", commentEn: "Design is futuristic. Fitted perfectly. Received in 2 days inside Dhaka.", commentBn: "ডিজাইনটা চমৎকার ফিউচারিস্টিক। সাইজ একদম ঠিকঠাক লেগেছে। ২ দিনেই ডেলিভারি পেয়েছি।", rating: 4 },
  ],
  "Electronics": [
    { name: "Sajid Rahman", commentEn: "Build quality is top notch. Sound signature is brilliant on these headphones.", commentBn: "বিল্ড কোয়ালিটি অত্যন্ত চমৎকার। সাউন্ড স্পেকট্রাম অসাধারণ প্রফেশনাল লেভেলের।", rating: 5 },
    { name: "Arefin Shuvo", commentEn: "Amazing clicky tactile feedback on keyboard. True value for money.", commentBn: "কিবোর্ডের টাইপিং সাউন্ড এবং রেসপন্স অনেক প্রিমিয়াম লেগেছে। দারুণ প্রোডাক্ট!", rating: 5 },
    { name: "Mithila Sen", commentEn: "A bit expensive but totally worth the premium build and active noise cancellation.", commentBn: "দাম কিছুটা বেশি মনে হলেও নয়েজ ক্যান্সেলেশন এবং প্রিমিয়াম ফিনিশিং দুর্দান্ত।", rating: 4 },
  ],
  "Accessories": [
    { name: "Anisur Rahman", commentEn: "Very durable build. Keeps water cold for standard 24 hours easily.", commentBn: "অনেক মজবুত গঠন। পানি দীর্ঘক্ষণ ঠান্ডা থাকে, প্রায় ২৪ ঘণ্টার মতো ব্যাকআপ পেয়েছি।", rating: 4 },
    { name: "Rashedul Bari", commentEn: "Clean design and water-resistant. Perfect commuter bag.", commentBn: "সিম্পল এবং চমৎকার ওয়াটারপ্রুফcommuter ব্যাগ। অনেক পকেট আছে গুছিয়ে রাখার জন্য।", rating: 5 },
  ],
  "Home & Living": [
    { name: "Farhana Yasmin", commentEn: "The aroma of smoked oakwood is so therapeutic! Calming and burns clean.", commentBn: "সুগন্ধিটা দারুণ রিফ্রেশিং এবং থেরাপিউটিক! মোমবাতির সুবাস সারা ঘরে ছড়িয়ে পড়ে।", rating: 5 },
  ]
};

export default function ProductDetailsModal({
  product,
  onClose,
  onAddToCart,
  isWishlisted,
  onToggleWishlist,
  language
}: ProductDetailsModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"specs" | "reviews" | "policy">("specs");
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  
  // Custom reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReviewComment, setNewReviewComment] = useState("");
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewName, setNewReviewName] = useState("");
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [expandedReviewImg, setExpandedReviewImg] = useState<string | null>(null);

  // Product specification details simulation
  const getProductSpecs = (p: Product) => {
    switch (p.category) {
      case "Electronics":
        return [
          { keyBn: "ব্র্যান্ড", keyEn: "Brand", valBn: "প্রো-টেক এভিয়েশন", valEn: "ProTech Aviation" },
          { keyBn: "কানেক্টিভিটি", keyEn: "Connectivity", valBn: "ব্লুটুথ ৫.২ এবং টাইপ-সি", valEn: "Bluetooth 5.2 & Type-C" },
          { keyBn: "ব্যাটারি লাইফ", keyEn: "Battery Life", valBn: "৪০ ঘণ্টা পর্যন্ত", valEn: "Up to 40 Hours playtime" },
          { keyBn: "ওয়ারেন্টি", keyEn: "Warranty", valBn: "১ বছরের অফিসিয়াল রিপ্লেসমেন্ট", valEn: "1 Year Official Replacement" }
        ];
      case "Footwear":
        return [
          { keyBn: "উপাদান", keyEn: "Material", valBn: "নিটেড মেশ এবং কুশনড সোল", valEn: "Knit Mesh & Cushioned Sole" },
          { keyBn: "ব্যবহার", keyEn: "Best Use", valBn: "রানিং, ট্রেনিং এবং ক্যাজুয়াল", valEn: "Running, Training & Casualwear" },
          { keyBn: "ওজন", keyEn: "Weight", valBn: "২৮০ গ্রাম (একক)", valEn: "280g (Single Shoe)" },
          { keyBn: "ওয়ারেন্টি", keyEn: "Warranty", valBn: "৬ মাসের পেস্ট গ্যারান্টি", valEn: "6 Months Adhesive Warranty" }
        ];
      case "Accessories":
        return [
          { keyBn: "উপাদান", keyEn: "Material", valBn: "খাদ্য-গ্রেড স্টেইনলেস স্টিল / সিলিকন", valEn: "Food-Grade Stainless Steel / Premium Nylon" },
          { keyBn: "ফিচারস", keyEn: "Features", valBn: "ডাবল-ওয়াল ভ্যাকুয়াম ইনসুলেশন", valEn: "Double-walled Vacuum Insulated" },
          { keyBn: "ক্যাপাসিটি", keyEn: "Capacity", valBn: "৭৫০ মিলি / ২৫ লিটার লোড", valEn: "750ml / 25 Liters commuter capacity" },
          { keyBn: "ওয়ারেন্টি", keyEn: "Warranty", valBn: "২ বছরের থার্মাল গ্যাস কভার", valEn: "2 Years Thermal Gas Insulation Cover" }
        ];
      default:
        return [
          { keyBn: "উপাদান", keyEn: "Material", valBn: "প্রাকৃতিক এবং অর্গানিক সয় মোম", valEn: "Eco-Friendly Organic Soy Wax" },
          { keyBn: "সুগন্ধি", keyEn: "Scent Note", valBn: "অ্যাম্বার ওকউড ও এলাচ", valEn: "Smoked Amber, Oakwood & Cardamom" },
          { keyBn: "জ্বালানি সময়", keyEn: "Burn Time", valBn: "৫০ ঘণ্টা পরিষ্কার শিখা", valEn: "50 Hours Clean Burn time" },
          { keyBn: "ওয়ারেন্টি", keyEn: "Warranty", valBn: "ড্যামেজ রিপ্লেসমেন্ট গ্যারান্টি", valEn: "Physical Damage Transit Cover" }
        ];
    }
  };

  // Generate 3 visual alternate angles/shades of the product image for the gallery
  const getAltImages = (primaryUrl: string) => {
    return [
      primaryUrl,
      primaryUrl.replace("w=600", "w=601&sat=-40"), // Grayscale/Muted look simulation
      primaryUrl.replace("w=600", "w=602&hue=90")   // Styled highlight simulation
    ];
  };

  // Listen to reviews on Firestore dynamically
  useEffect(() => {
    if (!product) return;

    const presets = MOCK_REVIEWS_TEMPLATES[product.category] || [
      { name: "Naimul Kabir", commentEn: "Decent product. Delivered nicely in secure packing.", commentBn: "ভালো পণ্য। চমৎকার এবং নিরাপদ মোড়কে পেয়েছি।", rating: 4 }
    ];
    const initialPresets: Review[] = presets.map((p, idx) => ({
      id: `review-${idx}`,
      userName: p.name,
      rating: p.rating,
      comment: language === "bn" ? p.commentBn : p.commentEn,
      date: new Date(Date.now() - (idx + 1) * 24 * 3600 * 1000).toLocaleDateString(),
      likes: 5 + idx * 3,
      images: []
    }));

    try {
      // Create query for this product's reviews
      const unsubscribe = onSnapshot(collection(db, "reviews"), (snapshot) => {
        const fetched: Review[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.productId === product.id) {
            fetched.push({
              id: docSnap.id,
              userName: data.userName,
              rating: data.rating,
              comment: data.comment,
              date: data.date,
              likes: data.likes || 0,
              images: data.images || []
            });
          }
        });

        // Combine custom and presets
        const combined = [...fetched, ...initialPresets];
        // Sort: custom reviews first
        combined.sort((a, b) => {
          if (a.id.startsWith("custom-") && !b.id.startsWith("custom-")) return -1;
          if (!a.id.startsWith("custom-") && b.id.startsWith("custom-")) return 1;
          return b.id.localeCompare(a.id);
        });

        setReviews(combined);
      }, (err) => {
        console.warn("Firestore reviews onSnapshot failed, falling back to localStorage.", err);
        const storageKey = `reviews_prod_${product.id}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setReviews(JSON.parse(saved));
        } else {
          setReviews(initialPresets);
          localStorage.setItem(storageKey, JSON.stringify(initialPresets));
        }
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn("Firestore not ready.", e);
      setReviews(initialPresets);
    }

    setSelectedImageIdx(0);
    setActiveTab("specs");
  }, [product, language]);

  if (!product) return null;

  const altImages = getAltImages(product.imageUrl);
  const currentFeaturedImg = altImages[selectedImageIdx];

  const handleShareProduct = () => {
    const fakeLink = `${window.location.origin}/?product=${product.id}`;
    navigator.clipboard.writeText(fakeLink);
    toast(
      language === "bn"
        ? `প্রোডাক্ট লিংকটি কপি করা হয়েছে! বন্ধুদের সাথে শেয়ার করুন।`
        : `Product link copied to clipboard! Share with your friends.`,
      { type: "success", title: language === "bn" ? "শেয়ার লিংক কপিড" : "Link Copied" }
    );
  };

  const handleImageUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    files.forEach((file: any) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setReviewImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveUploadedImage = (index: number) => {
    setReviewImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewComment.trim()) return;

    const reviewId = `custom-review-${Date.now()}`;
    const newRev: Review = {
      id: reviewId,
      userName: newReviewName.trim() || (language === "bn" ? "ক্রেতা" : "Verified Customer"),
      rating: newReviewRating,
      comment: newReviewComment.trim(),
      date: new Date().toLocaleDateString(),
      likes: 0,
      images: reviewImages
    };

    try {
      const reviewDocRef = doc(db, "reviews", reviewId);
      await setDoc(reviewDocRef, {
        ...newRev,
        productId: product.id,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn("Could not save to Firestore, saving to localStorage as fallback.", err);
      const storageKey = `reviews_prod_${product.id}`;
      const saved = localStorage.getItem(storageKey);
      const currentReviews = saved ? JSON.parse(saved) : [];
      const updated = [newRev, ...currentReviews];
      setReviews(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }

    // Reset fields
    setNewReviewComment("");
    setNewReviewName("");
    setNewReviewRating(5);
    setReviewImages([]);

    toast(
      language === "bn"
        ? "আপনার মূল্যবান রিভিউটি সফলভাবে প্রকাশ করা হয়েছে!"
        : "Your review has been published successfully!",
      { type: "success", title: language === "bn" ? "রিভিউ যোগ করা হয়েছে" : "Review Submitted" }
    );
  };

  const handleLikeReview = async (reviewId: string) => {
    const updated = reviews.map(r => r.id === reviewId ? { ...r, likes: r.likes + 1 } : r);
    setReviews(updated);
    localStorage.setItem(`reviews_prod_${product.id}`, JSON.stringify(updated));

    if (reviewId.startsWith("custom-")) {
      try {
        const reviewDocRef = doc(db, "reviews", reviewId);
        await setDoc(reviewDocRef, {
          likes: (reviews.find(r => r.id === reviewId)?.likes || 0) + 1
        }, { merge: true });
      } catch (e) {
        console.warn("Could not sync likes to Firestore.", e);
      }
    }
  };

  // Dynamic stock visual metrics
  const maxStockCapacity = 50;
  const stockRatio = Math.min((product.stock / maxStockCapacity) * 100, 100);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 overflow-y-auto bg-gray-950/65 backdrop-blur-md">
        {/* Backdrop overlay trigger close */}
        <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 180 }}
          className="relative bg-white w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col z-10 border border-gray-100"
        >
          {/* Close button top right */}
          <button
            id="close-product-modal-btn"
            onClick={onClose}
            className="absolute top-4 right-4 z-30 bg-white/80 backdrop-blur-md text-gray-800 hover:text-red-500 hover:bg-white p-2 rounded-full shadow-md transition-all cursor-pointer border border-gray-100"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Modal scrollable body */}
          <div className="overflow-y-auto flex-grow p-5 md:p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              
              {/* Left Column: Image Selector Gallery & Side Views */}
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 aspect-square">
                  <img
                    src={currentFeaturedImg}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-all duration-300"
                  />
                  
                  {/* Share button overlay */}
                  <button
                    id="share-product-float-btn"
                    onClick={handleShareProduct}
                    className="absolute top-4 left-4 bg-white/85 backdrop-blur-md text-gray-700 hover:text-indigo-600 p-2.5 rounded-full shadow-md transition-all cursor-pointer border border-gray-100"
                    title="Copy Link to Share"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>

                  {/* Stock status slider overlay */}
                  {product.stock <= 5 && product.stock > 0 && (
                    <span className="absolute bottom-4 left-4 bg-rose-600 text-white font-sans text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md animate-pulse">
                      {language === "bn" ? `মাত্র ${product.stock} টি স্টক আছে!` : `Only ${product.stock} items left!`}
                    </span>
                  )}
                </div>

                {/* Sub-thumbnails selector strip */}
                <div className="flex items-center gap-3">
                  {altImages.map((imgUrl, idx) => (
                    <button
                      id={`alt-img-select-${idx}`}
                      key={idx}
                      onClick={() => setSelectedImageIdx(idx)}
                      className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 bg-gray-50 transition-all cursor-pointer ${
                        selectedImageIdx === idx ? "border-indigo-600 shadow-md scale-95" : "border-gray-100 hover:border-gray-300"
                      }`}
                    >
                      <img src={imgUrl} alt="Thumbnail view" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/5 hover:bg-transparent" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Title, pricing, stock progress, buttons, specs tabs */}
              <div className="space-y-6 text-left">
                {/* Meta details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest font-sans">
                      {product.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-full font-sans font-bold">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      {product.rating}
                    </span>
                  </div>

                  <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 font-sans leading-tight">
                    {product.name}
                  </h1>
                </div>

                {/* Description snippet */}
                <p className="text-xs text-gray-500 leading-relaxed font-sans">
                  {product.description}
                </p>

                {/* Stock progress indicator slider */}
                <div className="space-y-1.5 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-gray-500">{language === "bn" ? "স্টক পরিমাপ" : "Stock Levels"}</span>
                    <span className={product.stock > 5 ? "text-indigo-600" : "text-rose-600 animate-pulse"}>
                      {product.stock > 0 
                        ? (language === "bn" ? `${product.stock} টি উপলব্ধ` : `${product.stock} items available`) 
                        : (language === "bn" ? "আউট অব স্টক" : "Out of stock")}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${product.stock > 5 ? "bg-indigo-600" : "bg-rose-500"}`} 
                      style={{ width: `${product.stock > 0 ? stockRatio : 0}%` }}
                    />
                  </div>
                </div>

                {/* Pricing panel */}
                <div className="flex items-baseline gap-2.5">
                  <span className="text-sm font-sans text-gray-400">{language === "bn" ? "মূল্য" : "Special Price"}</span>
                  <span className="font-mono font-black text-2xl text-gray-950">
                    ₹ {product.price.toLocaleString("en-BD")}
                  </span>
                  <span className="text-xs text-gray-400 line-through font-mono">
                    ₹ {(product.price * 1.2).toLocaleString("en-BD")}
                  </span>
                  <span className="text-xs font-bold font-sans text-green-600">
                    {language === "bn" ? "২০% ছাড়" : "20% OFF"}
                  </span>
                </div>

                {/* Main Action Strip Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    id="modal-add-to-cart-btn"
                    onClick={() => onAddToCart(product)}
                    disabled={product.stock === 0}
                    className="flex-grow bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md shadow-indigo-150 flex items-center justify-center gap-2 transition-all cursor-pointer text-xs uppercase tracking-wider"
                  >
                    <ShoppingCart className="h-4.5 w-4.5" />
                    <span>{language === "bn" ? "কার্টে যুক্ত করুন" : "Add to Cart"}</span>
                  </button>

                  <button
                    id="modal-wishlist-toggle-btn"
                    onClick={() => onToggleWishlist(product)}
                    className={`px-5 py-3.5 rounded-2xl border flex items-center justify-center gap-2 transition-all cursor-pointer text-xs font-bold ${
                      isWishlisted 
                        ? "bg-rose-50 border-rose-200 text-rose-600 shadow-sm" 
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Heart className={`h-4.5 w-4.5 ${isWishlisted ? "fill-rose-500 text-rose-500" : ""}`} />
                    <span>{isWishlisted ? (language === "bn" ? "উইশলিস্টেড" : "Wishlisted") : (language === "bn" ? "উইশলিস্ট" : "Add to Wishlist")}</span>
                  </button>
                </div>

                {/* Trust/Delivery highlights */}
                <div className="grid grid-cols-2 gap-4 pt-2 text-[10px] text-gray-500 font-sans border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-green-50 text-green-600">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <span>{language === "bn" ? "১০০% অরিজিনাল পণ্য" : "100% Original Products"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                      <Truck className="h-4 w-4" />
                    </div>
                    <span>{language === "bn" ? "দেশজুড়ে দ্রুত ডেলিভারি" : "Express Delivery Nationwide"}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Section: Specification & Reviews Tab Container */}
            <div className="space-y-6 pt-4 border-t border-gray-100">
              <div className="flex items-center border-b border-gray-100">
                <button
                  id="tab-specs-btn"
                  onClick={() => setActiveTab("specs")}
                  className={`py-3 px-5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === "specs" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {language === "bn" ? "বিস্তারিত বিবরণ" : "Specifications"}
                </button>
                <button
                  id="tab-reviews-btn"
                  onClick={() => setActiveTab("reviews")}
                  className={`py-3 px-5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "reviews" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <span>{language === "bn" ? "রিভিউ এবং রেটিং" : "Customer Reviews"}</span>
                  <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                    {reviews.length}
                  </span>
                </button>
                <button
                  id="tab-policy-btn"
                  onClick={() => setActiveTab("policy")}
                  className={`py-3 px-5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === "policy" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {language === "bn" ? "ডেলিভারি ও রিটার্ন পলিসি" : "Delivery & Returns"}
                </button>
              </div>

              {/* Tab Outputs */}
              <div className="text-left font-sans text-xs text-gray-600 leading-relaxed min-h-[160px]">
                {activeTab === "specs" && (
                  <div className="space-y-4 font-sans text-xs text-gray-600 leading-relaxed">
                    <p>{product.description}</p>
                    {product.features && (
                      <div className="space-y-2 pt-2">
                        <h4 className="font-bold text-gray-800">{language === "bn" ? "মূল বৈশিষ্ট্যসমূহ:" : "Key Features:"}</h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {product.features.split(",").map((feat: string, i: number) => (
                            <li key={i}>{feat.trim()}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "policy" && (
                  <div className="space-y-3 font-sans text-xs text-gray-600 leading-relaxed">
                    <p className="font-semibold text-gray-800">{language === "bn" ? "ডেলিভারি সংক্রান্ত তথ্যাবলী:" : "Delivery Information:"}</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>{language === "bn" ? "ঢাকার ভেতর ২৪-৪৮ ঘণ্টার মধ্যে হোম ডেলিভারি।" : "Home delivery inside Dhaka in 24-48 hours."}</li>
                      <li>{language === "bn" ? "ঢাকার বাইরে ৩-৫ দিনের মধ্যে ডেলিভারি।" : "Outside Dhaka delivery in 3-5 days."}</li>
                      <li>{language === "bn" ? "ক্যাশ অন ডেলিভারি (COD) সুবিধা উপলব্ধ।" : "Cash on Delivery (COD) is available."}</li>
                    </ul>
                    <p className="font-semibold text-gray-800 pt-2">{language === "bn" ? "রিটার্ন এবং রিফান্ড পলিসি:" : "Returns & Refund Policy:"}</p>
                    <p>{language === "bn" ? "পণ্য পাওয়ার ৭ দিনের মধ্যে যেকোনো ত্রুটি বা অমিলের ক্ষেত্রে সম্পূর্ণ ফ্রি রিটার্ন এবং ইনস্ট্যান্ট রিফান্ড সুবিধা পাবেন।" : "Get a full free return and instant refund for any product damage or discrepancy reported within 7 days of delivery."}</p>
                  </div>
                )}

                {activeTab === "reviews" && (() => {
                  const totalReviews = reviews.length;
                  const avgRating = totalReviews > 0 
                    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
                    : product.rating;

                  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
                  reviews.forEach((r) => {
                    const rounded = Math.round(r.rating) as 5 | 4 | 3 | 2 | 1;
                    if (counts[rounded] !== undefined) {
                      counts[rounded]++;
                    }
                  });

                  const dist = {
                    5: totalReviews > 0 ? Math.round((counts[5] / totalReviews) * 100) : 0,
                    4: totalReviews > 0 ? Math.round((counts[4] / totalReviews) * 100) : 0,
                    3: totalReviews > 0 ? Math.round((counts[3] / totalReviews) * 100) : 0,
                    2: totalReviews > 0 ? Math.round((counts[2] / totalReviews) * 100) : 0,
                    1: totalReviews > 0 ? Math.round((counts[1] / totalReviews) * 100) : 0,
                  };

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Ratings Visual Distribution */}
                      <div className="space-y-4">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-gray-900">{avgRating}</span>
                          <span className="text-xs text-gray-400">out of 5.0</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`h-4.5 w-4.5 ${s <= Math.round(Number(avgRating)) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                          ))}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                          Based on {totalReviews} Verified reviews
                        </span>

                        {/* Amazon style breakdown bar charts */}
                        <div className="space-y-2 pt-2 text-[10px] text-gray-500 font-bold">
                          <div className="flex items-center gap-2">
                            <span className="w-8 text-right">5 Star</span>
                            <div className="flex-grow h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full transition-all duration-350" style={{ width: `${dist[5]}%` }} />
                            </div>
                            <span className="w-8 text-left">{dist[5]}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-8 text-right">4 Star</span>
                            <div className="flex-grow h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="bg-emerald-400 h-full transition-all duration-350" style={{ width: `${dist[4]}%` }} />
                            </div>
                            <span className="w-8 text-left">{dist[4]}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-8 text-right">3 Star</span>
                            <div className="flex-grow h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="bg-amber-400 h-full transition-all duration-350" style={{ width: `${dist[3]}%` }} />
                            </div>
                            <span className="w-8 text-left">{dist[3]}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-8 text-right">2 Star</span>
                            <div className="flex-grow h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="bg-orange-400 h-full transition-all duration-350" style={{ width: `${dist[2]}%` }} />
                            </div>
                            <span className="w-8 text-left">{dist[2]}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-8 text-right">1 Star</span>
                            <div className="flex-grow h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="bg-red-400 h-full transition-all duration-350" style={{ width: `${dist[1]}%` }} />
                            </div>
                            <span className="w-8 text-left">{dist[1]}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Review Comments list and review submission form */}
                      <div className="lg:col-span-2 space-y-6">
                        
                        {/* Submit Review form */}
                        <form onSubmit={handleAddReview} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
                          <h4 className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                            <MessageSquare className="h-4 w-4 text-indigo-600" />
                            {language === "bn" ? "আপনার একটি রিভিউ লিখুন" : "Write a verified product review"}
                          </h4>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <input
                                id="review-submitter-name"
                                type="text"
                                placeholder={language === "bn" ? "আপনার নাম লিখুন" : "Enter your name"}
                                value={newReviewName}
                                onChange={(e) => setNewReviewName(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-2.5 px-3">
                              <span className="text-gray-400 text-xs">{language === "bn" ? "রেটিং:" : "Rating:"}</span>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    type="button"
                                    id={`star-btn-${star}`}
                                    key={star}
                                    onClick={() => setNewReviewRating(star)}
                                    className="cursor-pointer transition-transform active:scale-125 focus:outline-none"
                                  >
                                    <Star className={`h-4 w-4 ${star <= newReviewRating ? "fill-amber-400 text-amber-400" : "text-gray-300 hover:text-amber-300"}`} />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div>
                            <textarea
                              id="review-submitter-comment"
                              rows={2}
                              required
                              placeholder={language === "bn" ? "পণ্যের মান এবং অভিজ্ঞতা সম্পর্কে বিস্তারিত লিখুন..." : "Describe product material, build quality, and shipping experience..."}
                              value={newReviewComment}
                              onChange={(e) => setNewReviewComment(e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            />
                          </div>

                          {/* Uploaded Review Image Previews */}
                          {reviewImages.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {reviewImages.map((img, idx) => (
                                <div key={idx} className="relative h-12 w-12 rounded-xl overflow-hidden border border-gray-200">
                                  <img src={img} className="h-full w-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveUploadedImage(idx)}
                                    className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-xl hover:bg-red-600 transition-colors"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Image upload triggers and Submit button */}
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1.5 bg-white hover:bg-gray-150 border border-gray-250 text-gray-700 px-3 py-2 rounded-xl text-[11px] font-semibold cursor-pointer transition-colors shadow-xs">
                                <Camera className="h-4 w-4 text-gray-500" />
                                <span>{language === "bn" ? "ছবি যোগ করুন" : "Add Photos"}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  onChange={handleImageUploadChange}
                                />
                              </label>
                              <span className="text-[9px] text-gray-400 hidden sm:inline">
                                {language === "bn" ? "জেপিজি বা পিএনজি (ঐচ্ছিক)" : "Supports JPG, PNG"}
                              </span>
                            </div>

                            <button
                              type="submit"
                              id="submit-review-btn"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-[11px] uppercase tracking-wide transition-all cursor-pointer shadow-sm shadow-indigo-100"
                            >
                              {language === "bn" ? "রিভিউ সাবমিট করুন" : "Submit Review"}
                            </button>
                          </div>
                        </form>

                        {/* Display reviews list */}
                        <div className="space-y-4">
                          {reviews.map((r) => (
                            <div key={r.id} className="border-b border-gray-50 pb-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="h-7 w-7 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center font-sans">
                                    {r.userName.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="text-left">
                                    <span className="font-bold text-gray-800 text-xs block">{r.userName}</span>
                                    <span className="text-[10px] text-gray-400">{r.date}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                                  ))}
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 leading-relaxed text-left pl-9">
                                {r.comment}
                              </p>

                              {/* Review images visual list */}
                              {r.images && r.images.length > 0 && (
                                <div className="flex flex-wrap gap-2 pl-9 pt-1">
                                  {r.images.map((img, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => setExpandedReviewImg(img)}
                                      className="h-14 w-14 rounded-xl overflow-hidden border border-gray-100 hover:border-indigo-500 hover:ring-2 hover:ring-indigo-100 transition-all cursor-zoom-in shadow-xs"
                                    >
                                      <img src={img} className="h-full w-full object-cover" />
                                    </button>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center gap-2 text-[10px] text-gray-400 pl-9">
                                <button
                                  type="button"
                                  id={`like-review-btn-${r.id}`}
                                  onClick={() => handleLikeReview(r.id)}
                                  className="flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-pointer bg-transparent border-0 font-sans"
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                  <span>{r.likes} {language === "bn" ? "পছন্দ" : "Likes"}</span>
                                </button>
                                <span>•</span>
                                <span className="flex items-center gap-0.5 text-green-600 font-bold">
                                  <Award className="h-3.5 w-3.5 stroke-[2.5]" />
                                  {language === "bn" ? "নিশ্চিত ক্রেতা" : "Verified Buyer"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

          </div>
        </motion.div>

        {/* Lightbox Modal for Review Images */}
        {expandedReviewImg && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="absolute inset-0 cursor-pointer" onClick={() => setExpandedReviewImg(null)} />
            <div className="relative max-w-2xl max-h-[85vh] bg-transparent rounded-3xl overflow-hidden z-10 flex flex-col items-center">
              <button
                onClick={() => setExpandedReviewImg(null)}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white p-2 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <img src={expandedReviewImg} className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl" />
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
