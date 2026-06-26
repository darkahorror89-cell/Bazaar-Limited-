import React, { useState, useEffect } from "react";
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  ShieldCheck, 
  ShoppingCart, 
  Loader, 
  ArrowRight, 
  CheckCircle2, 
  MapPin, 
  ShoppingBag,
  HelpCircle
} from "lucide-react";
import { CartItem, ShippingAddress, Product } from "../types";
import { auth, db, handleFirestoreError, OperationType } from "../firebase";
import { doc, setDoc, onSnapshot, collection, query, where } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { useToast } from "../context/ToastContext";

export interface CountryConfig {
  code: string;
  nameEn: string;
  nameBn: string;
  currency: string;
  symbol: string;
  rate: number; // 1 BDT = X of local currency
  shippingCost: number; // local currency
  freeThreshold: number; // local currency
  flag: string;
  methods: { id: string; nameEn: string; nameBn: string; brandColor: string }[];
}

export const COUNTRIES: CountryConfig[] = [
  {
    code: "BD",
    nameEn: "Bangladesh",
    nameBn: "বাংলাদেশ",
    currency: "BDT",
    symbol: "₹",
    rate: 1.0,
    shippingCost: 120,
    freeThreshold: 5000,
    flag: "🇧🇩",
    methods: [
      { id: "bkash", nameEn: "bKash Wallet", nameBn: "বিকাশ ওয়ালেট", brandColor: "bg-pink-600 hover:bg-pink-700" },
      { id: "nagad", nameEn: "Nagad Wallet", nameBn: "নগদ ওয়ালেট", brandColor: "bg-orange-600 hover:bg-orange-700" },
      { id: "card", nameEn: "Credit / Debit Card (SSLCommerz)", nameBn: "ক্রেডিট / ডেবিট কার্ড", brandColor: "bg-indigo-600 hover:bg-indigo-700" }
    ]
  },
  {
    code: "IN",
    nameEn: "India",
    nameBn: "ভারত",
    currency: "INR",
    symbol: "₹",
    rate: 0.73,
    shippingCost: 350,
    freeThreshold: 4000,
    flag: "🇮🇳",
    methods: [
      { id: "upi", nameEn: "UPI (GPay / Paytm / PhonePe)", nameBn: "ইউপিআই (গুগল পে / পেটিএম)", brandColor: "bg-sky-600 hover:bg-sky-700" },
      { id: "rupay", nameEn: "RuPay Debit Card", nameBn: "রুপে কার্ড", brandColor: "bg-indigo-600 hover:bg-indigo-700" },
      { id: "netbanking", nameEn: "Net Banking (SBI, HDFC, ICICI)", nameBn: "নেট ব্যাংকিং", brandColor: "bg-amber-600 hover:bg-amber-700" }
    ]
  },
  {
    code: "US",
    nameEn: "United States",
    nameBn: "যুক্তরাষ্ট্র",
    currency: "USD",
    symbol: "$",
    rate: 0.0085,
    shippingCost: 15,
    freeThreshold: 80,
    flag: "🇺🇸",
    methods: [
      { id: "stripe", nameEn: "Stripe Secured Credit Card", nameBn: "স্ট্রাইপ সুরক্ষিত ক্রেডিট কার্ড", brandColor: "bg-indigo-600 hover:bg-indigo-700" },
      { id: "paypal", nameEn: "PayPal Express Ingress", nameBn: "পেপ্যাল এক্সপ্রেস ইন্গ্রেস", brandColor: "bg-blue-600 hover:bg-blue-700" },
      { id: "applepay", nameEn: "Apple Pay / Google Pay", nameBn: "অ্যাপল পে / গুগল পে", brandColor: "bg-black hover:bg-gray-900" }
    ]
  },
  {
    code: "GB",
    nameEn: "United Kingdom",
    nameBn: "যুক্তরাজ্য",
    currency: "GBP",
    symbol: "£",
    rate: 0.0067,
    shippingCost: 12,
    freeThreshold: 65,
    flag: "🇬🇧",
    methods: [
      { id: "stripe", nameEn: "Credit / Debit Card (Stripe)", nameBn: "ক্রেডিট / ডেবিট কার্ড (স্ট্রাইপ)", brandColor: "bg-indigo-600 hover:bg-indigo-700" },
      { id: "paypal", nameEn: "PayPal Standard Ingress", nameBn: "পেপ্যাল স্ট্যান্ডার্স ইন্গ্রেস", brandColor: "bg-blue-600 hover:bg-blue-700" }
    ]
  },
  {
    code: "AE",
    nameEn: "United Arab Emirates",
    nameBn: "সংযুক্ত আরব আমিরাত",
    currency: "AED",
    symbol: "AED ",
    rate: 0.031,
    shippingCost: 40,
    freeThreshold: 300,
    flag: "🇦🇪",
    methods: [
      { id: "mada", nameEn: "Mada Card / Apple Pay", nameBn: "মাদা কার্ড / অ্যাপল পে", brandColor: "bg-emerald-600 hover:bg-emerald-700" },
      { id: "stripe", nameEn: "Credit Card (Stripe)", nameBn: "ক্রেডিট কার্ড (স্ট্রাইপ)", brandColor: "bg-indigo-600 hover:bg-indigo-700" }
    ]
  },
  {
    code: "SA",
    nameEn: "Saudi Arabia",
    nameBn: "সৌদি আরব",
    currency: "SAR",
    symbol: "SR ",
    rate: 0.032,
    shippingCost: 45,
    freeThreshold: 350,
    flag: "🇸🇦",
    methods: [
      { id: "mada", nameEn: "Mada Payment Ingress", nameBn: "মাদা পেমেন্ট ইন্গ্রেস", brandColor: "bg-emerald-600 hover:bg-emerald-700" },
      { id: "stripe", nameEn: "Credit Card", nameBn: "ক্রেডিট কার্ড", brandColor: "bg-indigo-600 hover:bg-indigo-700" }
    ]
  },
  {
    code: "DE",
    nameEn: "Germany",
    nameBn: "জার্মানি",
    currency: "EUR",
    symbol: "€",
    rate: 0.0079,
    shippingCost: 14,
    freeThreshold: 75,
    flag: "🇩🇪",
    methods: [
      { id: "stripe", nameEn: "SOFORT / Credit Card", nameBn: "সোফোর্ট / ক্রেডিট কার্ড", brandColor: "bg-indigo-600 hover:bg-indigo-700" },
      { id: "paypal", nameEn: "PayPal Express", nameBn: "পেপ্যাল এক্সপ্রেস", brandColor: "bg-blue-600 hover:bg-blue-700" }
    ]
  }
];

interface CartViewProps {
  cartItems: CartItem[];
  onUpdateQuantity: (id: string, q: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onOrderCompleted: (orderId: string) => void;
  language: "bn" | "en";
  user?: any;
}

export default function CartView({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderCompleted,
  language,
  user
 }: CartViewProps) {
  const [step, setStep] = useState<"cart" | "shipping" | "payment_gateway">("cart");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  
  // Referrals state
  const [myReferrals, setMyReferrals] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    try {
      const q = query(collection(db, "referrals"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const refs: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.referrerUid === user.uid || data.refereeUid === user.uid) {
            refs.push(data);
          }
        });
        setMyReferrals(refs);
      }, (error) => {
        console.warn("Could not load referrals in CartView:", error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Error subscribing to referrals in CartView:", e);
    }
  }, [user]);

  // Coupon state
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  
  // Loyalty points state
  const [availablePoints, setAvailablePoints] = useState<number>(0);
  const [usePoints, setUsePoints] = useState<boolean>(false);
  
  // Active country for currency, rates and taxes
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("BD");

  // Shipping details state
  const [shipping, setShipping] = useState<ShippingAddress>({
    fullName: "",
    email: auth.currentUser?.email || "",
    phone: "",
    addressLine: "",
    city: "Dhaka",
    postalCode: "",
    country: "Bangladesh"
  });

  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [simulatorPaymentMethod, setSimulatorPaymentMethod] = useState<string>("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVV, setCardCVV] = useState("");
  // UPI custom state
  const [upiId, setUpiId] = useState("");

  // Load default address automatically from Firestore to eliminate typing overhead
  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.loyaltyPoints !== undefined) {
          setAvailablePoints(Number(data.loyaltyPoints));
        } else {
          setAvailablePoints(0);
        }
        if (data.address) {
          const loadedAddress = data.address as ShippingAddress;
          setShipping(loadedAddress);
          if (loadedAddress.country) {
            const matched = COUNTRIES.find(
              (c) =>
                c.nameEn.toLowerCase() === loadedAddress.country?.toLowerCase() ||
                c.nameBn === loadedAddress.country
            );
            if (matched) {
              setSelectedCountryCode(matched.code);
            }
          }
        }
      }
    });
    return () => unsubscribe();
  }, [user]);

  const activeCountry = COUNTRIES.find((c) => c.code === selectedCountryCode) || COUNTRIES[0];

  // Set default payment method when country changes
  useEffect(() => {
    if (activeCountry && activeCountry.methods.length > 0) {
      setSimulatorPaymentMethod(activeCountry.methods[0].id);
    }
  }, [selectedCountryCode]);

  // Convert subtotal to target country currency
  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const convertedSubtotal = Math.round(subtotal * activeCountry.rate * 100) / 100;
  
  const baseShippingCost = convertedSubtotal > activeCountry.freeThreshold || convertedSubtotal === 0 ? 0 : activeCountry.shippingCost;
  
  // Check referral coupon in calculations
  const appliedReferral = myReferrals.find(
    (ref) => ref.refereeCoupon === appliedPromo || ref.referrerCoupon === appliedPromo
  );

  let discountAmount = 0;
  if (appliedPromo === "WELCOME10" || appliedPromo === "SAVE10") {
    discountAmount = Math.round(convertedSubtotal * 0.1 * 100) / 100;
  } else if (appliedPromo === "BAZAR20") {
    discountAmount = Math.round(convertedSubtotal * 0.2 * 100) / 100;
  } else if (appliedPromo === "FESTIVE25") {
    discountAmount = Math.round(convertedSubtotal * 0.25 * 100) / 100;
  } else if (appliedPromo === "FREE60") {
    discountAmount = Math.round(60 * activeCountry.rate * 100) / 100;
  } else if (appliedPromo === "FREESHIP") {
    discountAmount = baseShippingCost;
  } else if (appliedReferral) {
    const isReferee = appliedReferral.refereeCoupon === appliedPromo;
    const discountPct = isReferee ? 0.15 : 0.20;
    discountAmount = Math.round(convertedSubtotal * discountPct * 100) / 100;
  }

  const shippingCost = appliedPromo === "FREESHIP" ? 0 : baseShippingCost;
  
  // Calculate points discount value in active currency
  const pointsValueInLocal = Math.round(availablePoints * activeCountry.rate * 100) / 100;
  const maxPossibleDiscount = Math.max(0, convertedSubtotal + shippingCost - (appliedPromo === "FREESHIP" ? 0 : discountAmount));
  const pointsDiscount = usePoints ? Math.min(pointsValueInLocal, maxPossibleDiscount) : 0;

  const totalAmount = Math.max(0, convertedSubtotal + shippingCost - (appliedPromo === "FREESHIP" ? 0 : discountAmount) - pointsDiscount);

  // Helper formatting function
  const formatCurrency = (val: number) => {
    return `${activeCountry.symbol}${val.toLocaleString("en-BD", {
      minimumFractionDigits: activeCountry.code === "BD" ? 0 : 2,
      maximumFractionDigits: activeCountry.code === "BD" ? 0 : 2,
    })}`;
  };

  const applyPromoCode = () => {
    setPromoError(null);
    const code = promoInput.trim().toUpperCase();
    if (!code) return;

    // Check if it matches an active referral coupon
    const matchingReferral = myReferrals.find(
      (ref) => 
        (ref.refereeCoupon === code && !ref.refereeCouponUsed && ref.refereeUid === user?.uid) ||
        (ref.referrerCoupon === code && !ref.referrerCouponUsed && ref.referrerUid === user?.uid)
    );

    if (matchingReferral) {
      const isReferee = matchingReferral.refereeCoupon === code;
      const discountPct = isReferee ? 15 : 20;
      setAppliedPromo(code);
      toast(
        language === "bn"
          ? `রেফারেল কুপন ${code} সফলভাবে প্রয়োগ করা হয়েছে! ${discountPct}% ছাড়।`
          : `Referral Coupon ${code} applied! You received a ${discountPct}% discount.`,
        { type: "success", title: language === "bn" ? "কুপন সফল" : "Coupon Applied" }
      );
    } else if (code === "WELCOME10" || code === "SAVE10") {
      setAppliedPromo(code);
      toast(
        language === "bn"
          ? `${code} কুপন সফলভাবে প্রয়োগ করা হয়েছে! ১০% মূল্যছাড়।`
          : `${code} applied! You received a 10% discount on products.`,
        { type: "success", title: language === "bn" ? "কুপন সফল" : "Coupon Applied" }
      );
    } else if (code === "BAZAR20") {
      setAppliedPromo("BAZAR20");
      toast(
        language === "bn"
          ? "BAZAR20 কুপন সফলভাবে প্রয়োগ করা হয়েছে! ২০% মূল্যছাড়।"
          : "BAZAR20 applied! You received a 20% discount on products.",
        { type: "success", title: language === "bn" ? "কুপন সফল" : "Coupon Applied" }
      );
    } else if (code === "FESTIVE25") {
      setAppliedPromo("FESTIVE25");
      toast(
        language === "bn"
          ? "FESTIVE25 কুপন সফলভাবে প্রয়োগ করা হয়েছে! ২৫% উৎসবকালীন ডিসকাউন্ট।"
          : "FESTIVE25 applied! You received a 25% festive discount.",
        { type: "success", title: language === "bn" ? "কুপন সফল" : "Coupon Applied" }
      );
    } else if (code === "FREE60") {
      setAppliedPromo("FREE60");
      toast(
        language === "bn"
          ? `FREE60 কুপন সফলভাবে প্রয়োগ করা হয়েছে! ₹৬০ ফ্ল্যাট ডিসকাউন্ট।`
          : `FREE60 applied! You received a flat ₹60 discount.`,
        { type: "success", title: language === "bn" ? "কুপন সফল" : "Coupon Applied" }
      );
    } else if (code === "FREESHIP") {
      setAppliedPromo("FREESHIP");
      toast(
        language === "bn"
          ? "FREESHIP কুপন সফলভাবে প্রয়োগ করা হয়েছে! ডেলিভারি চার্জ সম্পূর্ণ ফ্রি।"
          : "FREESHIP applied! You received free shipping on your order.",
        { type: "success", title: language === "bn" ? "কুপন সফল" : "Coupon Applied" }
      );
    } else {
      setPromoError(language === "bn" ? "অকার্যকর কুপন কোড! অনুগ্রহ করে সঠিক কোড দিন।" : "Invalid promo code! Please check and try again.");
      toast(
        language === "bn" ? "অকার্যকর কুপন কোড!" : "Invalid coupon code!",
        { type: "error", title: language === "bn" ? "ব্যর্থ" : "Failed" }
      );
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError(null);
    toast(
      language === "bn" ? "কুপন কোডটি সরিয়ে নেওয়া হয়েছে।" : "Coupon removed successfully.",
      { type: "info", title: language === "bn" ? "কুপন রিমুভড" : "Coupon Removed" }
    );
  };

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipping.fullName || !shipping.phone || !shipping.addressLine || !shipping.postalCode) {
      alert(language === "bn" ? "অনুগ্রহ করে সব শিপিং তথ্য পূরণ করুন" : "Please fill in all shipping details");
      return;
    }
    
    setIsProcessing(true);
    const orderId = `order-${Date.now()}`;

    try {
      // Call server API to initiate SSLCommerz payment
      const response = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          amount: totalAmount,
          customerInfo: shipping
        })
      });

      if (!response.ok) {
        throw new Error("Failed to initiate payment gateway");
      }

      const data = await response.json();
      
      if (data.gatewayUrl === "SIMULATOR") {
        setPaymentDetails({
          orderId,
          transactionId: data.transactionId,
          amount: totalAmount,
          mockDetails: data.mockDetails
        });
        setStep("payment_gateway");
      } else if (data.gatewayUrl) {
        // Redirect standard browser to real SSLCommerz Sandbox Form
        window.open(data.gatewayUrl, "_blank");
        // Simulate complete checkout local record
        await createOrderRecord(orderId, data.transactionId, "unpaid");
        onOrderCompleted(orderId);
      }
    } catch (error) {
      console.error("Payment initiation error:", error);
      // Fallback local simulation if server/network issues
      setPaymentDetails({
        orderId,
        transactionId: `TXN-LOCAL-${orderId}`,
        amount: totalAmount
      });
      setStep("payment_gateway");
    } finally {
      setIsProcessing(false);
    }
  };

  const createOrderRecord = async (orderId: string, txnId: string, pStatus: "paid" | "unpaid" | "failed") => {
    const finalOrder = {
      id: orderId,
      userId: user?.uid || "guest",
      items: cartItems,
      totalAmount,
      status: "pending" as const,
      paymentStatus: pStatus,
      paymentId: txnId,
      shippingAddress: shipping,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const orderRef = doc(db, "orders", orderId);
      await setDoc(orderRef, finalOrder);

      // If a referral coupon was used, update the referral document in Firestore
      if (appliedPromo && user) {
        const matchingReferral = myReferrals.find(
          (ref) => ref.refereeCoupon === appliedPromo || ref.referrerCoupon === appliedPromo
        );
        if (matchingReferral) {
          const isReferee = matchingReferral.refereeCoupon === appliedPromo;
          const referralDocRef = doc(db, "referrals", matchingReferral.id);
          const updateData: any = {};
          if (isReferee) {
            updateData.refereeCouponUsed = true;
          } else {
            updateData.referrerCouponUsed = true;
          }
          await setDoc(referralDocRef, updateData, { merge: true });
        }
      }

      // Sync loyalty points balance if paid
      if (pStatus === "paid" && user) {
        const userDocRef = doc(db, "users", user.uid);
        const pointsUsed = usePoints ? Math.round(pointsDiscount / activeCountry.rate) : 0;
        const pointsEarned = Math.floor(totalAmount / activeCountry.rate / 100);
        const newPointsTotal = Math.max(0, availablePoints - pointsUsed) + pointsEarned;
        
        await setDoc(userDocRef, { loyaltyPoints: newPointsTotal }, { merge: true });
        
        toast(
          language === "bn"
            ? `লয়্যালটি আপডেট: ${pointsUsed > 0 ? `${pointsUsed} পয়েন্ট ব্যবহৃত হয়েছে ও ` : ""}${pointsEarned} পয়েন্ট অর্জিত হয়েছে!`
            : `Loyalty points update: ${pointsUsed > 0 ? `used ${pointsUsed} pts and ` : ""}earned ${pointsEarned} pts!`,
          { type: "success", title: language === "bn" ? "লয়্যালটি রিওয়ার্ডস" : "Loyalty Rewards" }
        );
      }
    } catch (e) {
      console.warn("Could not save order to Firestore directly (Offline/Unprovisioned):", e);
      // Store in localStorage as fallback
      const localOrders = JSON.parse(localStorage.getItem("local_orders") || "[]");
      localOrders.push(finalOrder);
      localStorage.setItem("local_orders", JSON.stringify(localOrders));
    }
  };

  const handleSimulatedPayment = async (status: "success" | "fail") => {
    if (!paymentDetails) return;
    setIsProcessing(true);

    if (status === "success") {
      await createOrderRecord(paymentDetails.orderId, paymentDetails.transactionId, "paid");
      onClearCart();
      setIsProcessing(false);
      onOrderCompleted(paymentDetails.orderId);
    } else {
      await createOrderRecord(paymentDetails.orderId, paymentDetails.transactionId, "failed");
      setIsProcessing(false);
      alert(language === "bn" ? "পেমেন্ট সম্পন্ন হয়নি! আবার চেষ্টা করুন।" : "Payment cancelled/failed. You can try checkout again.");
      setStep("cart");
    }
  };

  return (
    <div id="cart-view-container" className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-gray-100 pb-5">
        <h2 className="font-sans font-bold text-2xl text-gray-900 tracking-tight flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-indigo-600" />
          {step === "cart" && (language === "bn" ? "আপনার শপিং কার্ট" : "Shopping Cart")}
          {step === "shipping" && (language === "bn" ? "শিপিং ও ডেলিভারি তথ্য" : "Shipping Details")}
          {step === "payment_gateway" && (language === "bn" ? "নিরাপদ পেমেন্ট গেটওয়ে" : "Secure Gateway Payment")}
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          {step === "cart" && (language === "bn" ? "কার্টের পণ্যগুলো নিশ্চিত করে চেকআউট করুন।" : "Review items and select shipping preferences.")}
          {step === "shipping" && (language === "bn" ? "আপনার ঠিকানা ও মোবাইল নম্বর যুক্ত করুন।" : "Specify delivery location for order dispatch.")}
          {step === "payment_gateway" && (language === "bn" ? "পেমেন্ট মেথড সিলেক্ট করে অর্ডার শেষ করুন।" : "Authorize checkout transaction via secure gateway.")}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {step === "cart" && (
          <motion.div
            key="cart-step"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {cartItems.length === 0 ? (
              <div className="lg:col-span-3 text-center py-20 bg-white rounded-3xl border border-gray-100 space-y-4">
                <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto" />
                <h3 className="font-sans font-bold text-lg text-gray-800">
                  {language === "bn" ? "আপনার কার্ট একদম খালি!" : "Your Cart is Empty"}
                </h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  {language === "bn" ? "কার্টে নতুন পণ্য যোগ করতে আমাদের হোম পেজ ব্রাউজ করুন।" : "Explore our latest gadgets and footwear to fill your basket."}
                </p>
              </div>
            ) : (
              <>
                {/* Cart Items List */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm divide-y divide-gray-100">
                    {cartItems.map((item) => (
                      <div key={item.product.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="h-16 w-16 rounded-2xl object-cover bg-gray-50 shrink-0 border border-gray-100"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <h4 className="font-sans font-bold text-sm text-gray-800 truncate">{item.product.name}</h4>
                            <p className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider mt-0.5">{item.product.category}</p>
                            <p className="font-mono text-xs text-gray-500 mt-1">
                              {formatCurrency(Math.round(item.product.price * activeCountry.rate * 100) / 100)} / {language === "bn" ? "টি" : "item"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 border-t sm:border-0 pt-3 sm:pt-0">
                          {/* Quantity control */}
                          <div className="flex items-center gap-2 border border-gray-200 rounded-xl p-1 bg-gray-50">
                            <button
                              id={`cart-minus-${item.product.id}`}
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                              className="p-1.5 hover:bg-white rounded-lg text-gray-500 transition-all hover:shadow-sm"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-xs font-bold px-2 font-mono text-gray-800">{item.quantity}</span>
                            <button
                              id={`cart-plus-${item.product.id}`}
                              onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                              className="p-1.5 hover:bg-white rounded-lg text-gray-500 transition-all hover:shadow-sm"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Line Total */}
                          <div className="text-right">
                            <span className="text-[10px] text-gray-400 block">{language === "bn" ? "মোট মূল্য" : "Total"}</span>
                            <span className="font-mono font-extrabold text-sm text-gray-950">
                              {formatCurrency(Math.round(item.product.price * item.quantity * activeCountry.rate * 100) / 100)}
                            </span>
                          </div>

                          {/* Remove button */}
                          <button
                            id={`cart-remove-${item.product.id}`}
                            onClick={() => onRemoveItem(item.product.id)}
                            className="text-red-500 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checkout pricing box */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
                    <div className="border-b border-gray-50 pb-3 flex items-center justify-between">
                      <h3 className="font-sans font-bold text-gray-800 text-sm">
                        {language === "bn" ? "হিসাব বিবরণী" : "Order Cost Breakdown"}
                      </h3>
                      {/* Mini Country display */}
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        {activeCountry.flag} {activeCountry.currency}
                      </span>
                    </div>

                    {/* Global Delivery Destination Selector (Flipkart/Amazon style) */}
                    <div className="space-y-1.5 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 text-left">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        {language === "bn" ? "ডেলিভারি দেশ নির্বাচন করুন" : "Select Shipping Destination"}
                      </label>
                      <select
                        id="cart-country-selector-sidebar"
                        value={selectedCountryCode}
                        onChange={(e) => {
                          const code = e.target.value;
                          setSelectedCountryCode(code);
                          const matched = COUNTRIES.find(c => c.code === code);
                          if (matched) {
                            setShipping({ ...shipping, country: language === "bn" ? matched.nameBn : matched.nameEn, city: code === "BD" ? "Dhaka" : "" });
                            toast(
                              language === "bn" 
                                ? `শিপিং ডেস্টিনেশন পরিবর্তন করে ${matched.nameBn} করা হয়েছে!`
                                : `Shipping destination updated to ${matched.nameEn}! Prices converted.`,
                              { type: "info" }
                            );
                          }
                        }}
                        className="w-full text-xs bg-white border border-gray-200 rounded-xl px-2.5 py-2 outline-none font-semibold focus:border-indigo-400 cursor-pointer"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {language === "bn" ? c.nameBn : c.nameEn} ({c.currency})
                          </option>
                        ))}
                      </select>
                      <span className="text-[9px] text-gray-400 block mt-1">
                        {language === "bn" 
                          ? `* পণ্যমূল্য ও ডেলিভারি চার্জ ${activeCountry.currency}-এ রূপান্তরিত হয়েছে।`
                          : `* Conversion rates and delivery costs computed for ${activeCountry.nameEn}.`}
                      </span>
                    </div>
                    
                    <div className="space-y-2.5">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{language === "bn" ? "সাবটোটাল" : "Subtotal"}</span>
                        <span className="font-mono text-gray-800 font-semibold">{formatCurrency(convertedSubtotal)}</span>
                      </div>

                      {appliedPromo && appliedPromo !== "FREESHIP" && (
                        <div className="flex justify-between text-xs text-emerald-600 font-bold">
                          <span>{language === "bn" ? "কুপন ডিসকাউন্ট" : "Coupon Discount"}</span>
                          <span className="font-mono">-{formatCurrency(discountAmount)}</span>
                        </div>
                      )}

                      {usePoints && pointsDiscount > 0 && (
                        <div className="flex justify-between text-xs text-indigo-600 font-bold">
                          <span>{language === "bn" ? "লয়্যালটি ডিসকাউন্ট" : "Loyalty Discount"}</span>
                          <span className="font-mono">-{formatCurrency(pointsDiscount)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{language === "bn" ? "ডেলিভারি চার্জ" : "Shipping Charge"}</span>
                        <span className="font-mono text-gray-800 font-semibold">
                          {shippingCost === 0 ? (language === "bn" ? "ফ্রি" : "FREE") : formatCurrency(shippingCost)}
                        </span>
                      </div>
                      
                      <div className="pt-3 border-t border-gray-50 flex justify-between font-bold text-sm text-gray-800">
                        <span>{language === "bn" ? "সর্বমোট মূল্য" : "Total Bill"}</span>
                        <span className="font-mono text-indigo-600 text-lg">{formatCurrency(totalAmount)}</span>
                      </div>
                    </div>

                    {/* Promo Coupon Application Strip */}
                    <div className="pt-3 border-t border-gray-50 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                        <span>{language === "bn" ? "প্রোমো কোড / কুপন" : "Promo Code / Coupons"}</span>
                      </div>

                      {appliedPromo ? (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex items-center justify-between text-xs">
                          <div className="text-left">
                            <span className="font-bold text-emerald-800 block uppercase font-mono">{appliedPromo} APPLIED</span>
                            <span className="text-emerald-600 text-[11px] font-medium leading-normal block">
                              {appliedPromo === "FREESHIP" 
                                ? (language === "bn" ? "ফ্রি ডেলিভারি ডিসকাউন্ট" : "Free Shipping offset applied")
                                : (language === "bn" ? `${formatCurrency(discountAmount)} ডিসকাউন্ট` : `${formatCurrency(discountAmount)} discount applied`)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={removePromoCode}
                            className="text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer bg-transparent border-0"
                          >
                            {language === "bn" ? "মুছুন" : "Remove"}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={promoInput}
                              onChange={(e) => {
                                setPromoInput(e.target.value);
                                setPromoError(null);
                              }}
                              placeholder={language === "bn" ? "কোড লিখুন" : "Enter Code"}
                              className="flex-grow bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-400 font-mono text-center uppercase"
                            />
                            <button
                              type="button"
                              onClick={applyPromoCode}
                              className="bg-gray-900 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer active:scale-95"
                            >
                              {language === "bn" ? "প্রয়োগ" : "Apply"}
                            </button>
                          </div>
                          
                          {promoError && (
                            <p className="text-[10px] text-red-500 font-medium text-left">{promoError}</p>
                          )}

                          {/* Quick clickable helper tags */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {["WELCOME10", "SAVE10", "BAZAR20", "FESTIVE25", "FREE60", "FREESHIP"].map((c) => (
                              <button
                                type="button"
                                key={c}
                                onClick={() => {
                                  setPromoInput(c);
                                  setPromoError(null);
                                }}
                                className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors cursor-pointer"
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Loyalty Points Section */}
                    <div className="pt-3 border-t border-gray-50 space-y-2.5 text-left">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                        <span>{language === "bn" ? "লয়্যালটি পয়েন্ট ও রিওয়ার্ডস" : "Loyalty Rewards"}</span>
                      </div>

                      {user ? (
                        <div className="bg-indigo-50/50 border border-indigo-50 rounded-2xl p-4 space-y-2 text-xs">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-gray-500 font-sans block">{language === "bn" ? "উপলব্ধ পয়েন্ট ব্যালেন্স:" : "Available points balance:"}</span>
                              <span className="font-sans font-extrabold text-indigo-950 mt-0.5 block flex items-center gap-1">
                                🪙 {availablePoints} {language === "bn" ? "পয়েন্ট" : "Points"}
                                <span className="text-[10px] text-gray-400 font-normal font-sans">
                                  ({language === "bn" ? `মূল্য: ${formatCurrency(availablePoints * activeCountry.rate)}` : `Value: ${formatCurrency(availablePoints * activeCountry.rate)}`})
                                </span>
                              </span>
                            </div>
                            
                            {availablePoints > 0 && (
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={usePoints}
                                  onChange={(e) => setUsePoints(e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                <span className="ml-2 text-[10px] font-bold text-indigo-950 font-sans uppercase">
                                  {language === "bn" ? "প্রয়োগ" : "Apply"}
                                </span>
                              </label>
                            )}
                          </div>

                          {usePoints && pointsDiscount > 0 ? (
                            <p className="text-[10px] text-indigo-700 leading-normal font-sans font-medium">
                              🎉 {language === "bn" 
                                ? `আপনার কার্টে ফ্ল্যাট ${formatCurrency(pointsDiscount)} ডিসকাউন্ট সফলভাবে প্রয়োগ করা হয়েছে!` 
                                : `Flat ${formatCurrency(pointsDiscount)} discount has been successfully applied to your cart!`}
                            </p>
                          ) : availablePoints > 0 ? (
                            <p className="text-[10px] text-gray-400 leading-normal font-sans">
                              {language === "bn"
                                ? "চেকআউটে ডিসকাউন্ট উপভোগ করতে পয়েন্ট ব্যবহার করুন।"
                                : "Check the toggle to apply your points as a flat checkout discount."}
                            </p>
                          ) : (
                            <p className="text-[10px] text-gray-400 leading-normal font-sans">
                              {language === "bn"
                                ? "আপনার লয়্যালটি পয়েন্ট খালি। প্রতি ₹১০০ কেনাকাটায় ১ পয়েন্ট অর্জন করুন!"
                                : "No points available yet. Earn 1 reward point for every ₹100 spent!"}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs text-center text-gray-400 font-sans">
                          {language === "bn"
                            ? "লয়্যালটি পয়েন্ট অর্জন ও ব্যবহার করতে অনুগ্রহ করে আপনার গুগল অ্যাকাউন্ট দিয়ে সাইন-ইন করুন।"
                            : "Please sign in to your user profile to earn and spend Loyalty Points."}
                        </div>
                      )}
                    </div>

                    <button
                      id="cart-checkout-proceed-btn"
                      onClick={() => setStep("shipping")}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-2xl shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-all cursor-pointer text-xs uppercase tracking-wider"
                    >
                      {language === "bn" ? "চেকআউট করুন" : "Proceed to Checkout"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}

        {step === "shipping" && (
          <motion.div
            key="shipping-step"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-2xl mx-auto bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm space-y-6"
          >
            {/* Auto loaded shipping addresses status indicator */}
            {user && shipping.fullName && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-2.5">
                <MapPin className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-indigo-950">
                    {language === "bn" ? "সংরক্ষিত ঠিকানা থেকে লোড করা হয়েছে" : "Shipping Profile Loaded Successfully"}
                  </h4>
                  <p className="text-[11px] text-indigo-700 mt-0.5 leading-relaxed">
                    {language === "bn" 
                      ? `আমরা আপনার প্রোফাইল থেকে ডিফল্ট ঠিকানা লোড করেছি। প্রয়োজনে পরিবর্তন করতে পারেন।`
                      : `We have auto-filled delivery parameters based on your saved address book.`}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleShippingSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{language === "bn" ? "পূর্ণ নাম *" : "Full Name *"}</label>
                  <input
                    id="cart-fullname"
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={shipping.fullName}
                    onChange={(e) => setShipping({ ...shipping, fullName: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-gray-50/50 hover:bg-white focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{language === "bn" ? "মোবাইল নম্বর *" : "Phone Number *"}</label>
                  <input
                    id="cart-phone"
                    type="tel"
                    required
                    placeholder="e.g. +8801700000000"
                    value={shipping.phone}
                    onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-gray-50/50 hover:bg-white focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{language === "bn" ? "শিপিং ঠিকানা (বিস্তারিত) *" : "Full Shipping Address *"}</label>
                <input
                  id="cart-addressline"
                  type="text"
                  required
                  placeholder="Street address, building, floor, room number"
                  value={shipping.addressLine}
                  onChange={(e) => setShipping({ ...shipping, addressLine: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-gray-50/50 hover:bg-white focus:bg-white transition-all"
                />
              </div>

              {/* Dynamic Country/City/Postal Grid (Flipkart/Amazon Global adaptation) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{language === "bn" ? "দেশ *" : "Country *"}</label>
                  <select
                    id="cart-country-shipping"
                    value={selectedCountryCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setSelectedCountryCode(code);
                      const matched = COUNTRIES.find(c => c.code === code);
                      if (matched) {
                        setShipping({ 
                          ...shipping, 
                          country: language === "bn" ? matched.nameBn : matched.nameEn,
                          city: code === "BD" ? "Dhaka" : "" 
                        });
                      }
                    }}
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {language === "bn" ? c.nameBn : c.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{language === "bn" ? "শহর *" : "City *"}</label>
                  {selectedCountryCode === "BD" ? (
                    <select
                      id="cart-city"
                      value={shipping.city}
                      onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white"
                    >
                      <option>Dhaka</option>
                      <option>Chittagong</option>
                      <option>Sylhet</option>
                      <option>Rajshahi</option>
                      <option>Khulna</option>
                      <option>Barisal</option>
                    </select>
                  ) : (
                    <input
                      id="cart-city-input"
                      type="text"
                      required
                      placeholder={language === "bn" ? "যেমন: নিউ ইয়র্ক / মুম্বাই" : "e.g. New York / Mumbai"}
                      value={shipping.city}
                      onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-gray-50/50 hover:bg-white focus:bg-white transition-all"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{language === "bn" ? "পোস্টাল কোড *" : "Postal Code *"}</label>
                  <input
                    id="cart-postalcode"
                    type="text"
                    required
                    placeholder="e.g. 1212 / 110001"
                    value={shipping.postalCode}
                    onChange={(e) => setShipping({ ...shipping, postalCode: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-gray-50/50 hover:bg-white focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Secure transaction check box */}
              <div className="bg-indigo-50/30 border border-indigo-50 rounded-2xl p-4 flex items-start gap-2.5">
                <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-indigo-950">
                    {selectedCountryCode === "BD" 
                      ? (language === "bn" ? "এসএসএলকমার্স নিরাপদ গেটওয়ে" : "SSLCommerz 3D Secured Ingress")
                      : selectedCountryCode === "IN"
                      ? (language === "bn" ? "রেজারপে / ইউপিআই নিরাপদ গেটওয়ে" : "Razorpay & UPI Secure Payment Node")
                      : (language === "bn" ? "স্ট্রাইপ এবং পেপ্যাল নিরাপদ পেমেন্ট" : "Stripe & PayPal SSL-Secured checkout")}
                  </h4>
                  <p className="text-[10px] text-indigo-700 leading-relaxed mt-0.5">
                    {language === "bn" 
                      ? "পেমেন্ট ডাটা ট্রানজিট সম্পূর্ণ এনক্রিপ্টেড। গেটওয়ে লোড হতে বিলম্ব হলে স্বয়ংক্রিয় স্যান্ডবক্স সিমুলেটর ওপেন হবে।"
                      : "User purchase logs and checkout parameters are protected with military-grade SSL standards."}
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setStep("cart")}
                  className="w-1/2 text-xs border border-gray-200 hover:bg-gray-50 py-3 rounded-xl font-bold text-gray-600 transition-colors"
                >
                  {language === "bn" ? "কার্টে ফিরুন" : "Back to Cart"}
                </button>
                <button
                  id="cart-shipping-submit-btn"
                  type="submit"
                  disabled={isProcessing}
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-md flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer"
                >
                  {isProcessing ? <Loader className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  {language === "bn" ? "পেমেন্টে অগ্রসর হোন" : "Proceed to Payment"}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {step === "payment_gateway" && paymentDetails && (
          <motion.div
            key="payment-step"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-xl mx-auto bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-xl space-y-6"
          >
            {/* Simulator notice box */}
            <div className="bg-slate-950 rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-900 shadow-md">
              <div className="text-left">
                <span className="text-[8px] bg-red-600 text-white font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
                  {activeCountry.nameEn} Sandbox Ingress
                </span>
                <h3 className="font-sans font-extrabold text-sm mt-2">
                  {selectedCountryCode === "BD" && "SSLCommerz Sandbox Wrapper"}
                  {selectedCountryCode === "IN" && "Razorpay Secure Sandbox Node"}
                  {["US", "GB", "DE"].includes(selectedCountryCode) && "Stripe & PayPal Merchant Hub"}
                  {!["BD", "IN", "US", "GB", "DE"].includes(selectedCountryCode) && "Global Merchant Gateway"}
                </h3>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">TXID: {paymentDetails.transactionId}</p>
              </div>
              <div className="sm:text-right">
                <span className="text-[10px] text-gray-400">{language === "bn" ? "মোট বিল" : "Grand Total"}</span>
                <p className="font-mono font-extrabold text-xl text-emerald-400 mt-0.5">{formatCurrency(paymentDetails.amount)}</p>
              </div>
            </div>

            {/* Simulated Payment Methods Tab */}
            <div className="flex flex-wrap border-b border-gray-150 text-xs">
              {activeCountry.methods.map((method) => (
                <button
                  type="button"
                  key={method.id}
                  onClick={() => setSimulatorPaymentMethod(method.id)}
                  className={`flex-1 text-center py-2.5 font-bold border-b-2 transition-all ${
                    simulatorPaymentMethod === method.id 
                      ? "border-indigo-600 text-indigo-700" 
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {language === "bn" ? method.nameBn : method.nameEn}
                </button>
              ))}
            </div>

            {/* Tab Inputs */}
            <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
              {/* Cards (card, rupay, stripe, mada) */}
              {["card", "rupay", "stripe", "mada"].includes(simulatorPaymentMethod) && (
                <div className="space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded uppercase font-mono">
                      {simulatorPaymentMethod.toUpperCase()} SECURE GATEWAY
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      ● PCI-DSS v4.0 Active
                    </span>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider">Card Number</label>
                    <input
                      type="text"
                      placeholder="4111 5522 3344 7788"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 font-mono bg-white mt-1 text-center"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider">Expiry Date</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 font-mono bg-white mt-1 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider">CVV Code</label>
                      <input
                        type="password"
                        placeholder="***"
                        maxLength={3}
                        value={cardCVV}
                        onChange={(e) => setCardCVV(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 font-mono bg-white mt-1 text-center"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* bKash & Nagad (bkash, nagad) */}
              {["bkash", "nagad"].includes(simulatorPaymentMethod) && (
                <div className="text-center py-4 space-y-3">
                  <span className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold inline-block ${
                    simulatorPaymentMethod === "bkash" ? "bg-pink-100 text-pink-700" : "bg-orange-100 text-orange-700"
                  }`}>
                    {simulatorPaymentMethod === "bkash" ? "bKash Wallet Sandbox" : "Nagad Gateway Ingress"}
                  </span>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    {language === "bn" 
                      ? `নিরাপদ উপায়ে পেমেন্ট করতে আপনার ${simulatorPaymentMethod === "bkash" ? "বিকাশ" : "নগদ"} অ্যাকাউন্ট নম্বর লিখুন।` 
                      : `Confirm checkout securely by providing your ${simulatorPaymentMethod === "bkash" ? "bKash" : "Nagad"} wallet number.`}
                  </p>
                  <input
                    type="tel"
                    placeholder="01712345678"
                    className="max-w-xs mx-auto w-full text-xs px-3 py-2.5 border border-gray-200 rounded-xl text-center font-mono focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-100 bg-white"
                  />
                </div>
              )}

              {/* UPI payments (upi) */}
              {simulatorPaymentMethod === "upi" && (
                <div className="py-4 space-y-3 text-left max-w-xs mx-auto">
                  <div className="text-center">
                    <span className="bg-sky-100 text-sky-700 px-3.5 py-1.5 rounded-full text-[10px] font-bold inline-block">
                      BHIM UPI Sandbox Ingress
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    {language === "bn" ? "আপনার ভার্চুয়াল পেমেন্ট ঠিকানা (VPA) যেমন: name@upi লিখুন।" : "Enter your Virtual Payment Address (VPA) e.g., username@upi"}
                  </p>
                  <div>
                    <input
                      type="text"
                      placeholder="bazar@okaxis"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 border border-gray-200 rounded-xl text-center font-mono focus:outline-none focus:border-sky-500 bg-white"
                    />
                  </div>
                  <div className="flex justify-center gap-1.5 pt-1">
                    {["@okaxis", "@paytm", "@ybl", "@gpay"].map((suff) => (
                      <button
                        type="button"
                        key={suff}
                        onClick={() => setUpiId(`bazar${suff}`)}
                        className="text-[9px] font-mono bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg cursor-pointer"
                      >
                        {suff}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Net banking (netbanking) */}
              {simulatorPaymentMethod === "netbanking" && (
                <div className="py-4 space-y-3 text-left">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">
                    {language === "bn" ? "ব্যাংক নির্বাচন করুন" : "Select Your Retail Banking Node"}
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                    {[
                      { id: "sbi", name: "State Bank of India" },
                      { id: "hdfc", name: "HDFC Bank" },
                      { id: "icici", name: "ICICI Bank" },
                      { id: "axis", name: "Axis Bank" }
                    ].map((bank) => (
                      <button
                        type="button"
                        key={bank.id}
                        className="p-2 border border-gray-200 rounded-xl text-xs hover:border-indigo-500 text-center bg-white hover:bg-indigo-50/20 font-medium transition-colors cursor-pointer"
                        onClick={() => {
                          toast(
                            language === "bn" 
                              ? `${bank.name} ব্যাংকিং গেটওয়ে নির্বাচিত!` 
                              : `${bank.name} gateway selected!`,
                            { type: "info" }
                          );
                        }}
                      >
                        {bank.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PayPal (paypal) */}
              {simulatorPaymentMethod === "paypal" && (
                <div className="text-center py-6 space-y-4">
                  <span className="bg-amber-100 text-amber-800 px-3.5 py-1.5 rounded-full text-[10px] font-bold inline-block">
                    PayPal Sandbox Wrapper
                  </span>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    {language === "bn" ? "পেপ্যালের মাধ্যমে এক ক্লিকে পেমেন্ট সম্পন্ন করতে নিচে বাটনে চাপুন।" : "Authenticate instantly with PayPal's standard express smart button."}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSimulatedPayment("success")}
                    className="w-full max-w-xs mx-auto bg-amber-400 hover:bg-amber-500 text-blue-900 font-extrabold py-2.5 rounded-xl transition-all cursor-pointer shadow flex items-center justify-center gap-2"
                  >
                    <span className="italic font-sans text-sm">PayPal</span>
                    <span className="text-xs font-sans tracking-wide">Checkout</span>
                  </button>
                </div>
              )}

              {/* Apple Pay & Google Pay (applepay) */}
              {simulatorPaymentMethod === "applepay" && (
                <div className="text-center py-6 space-y-4">
                  <span className="bg-slate-100 text-slate-800 px-3.5 py-1.5 rounded-full text-[10px] font-bold inline-block">
                    Express Wallets
                  </span>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    {language === "bn" ? "আপনার সংরক্ষিত কার্ড এবং বায়োমেট্রিক অথেন্টিকেশন ব্যবহার করুন।" : "Express authorization with FaceID / TouchID biometric secure payment token."}
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                    <button
                      type="button"
                      onClick={() => handleSimulatedPayment("success")}
                      className="bg-black text-white hover:bg-gray-900 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                    >
                       Pay
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSimulatedPayment("success")}
                      className="bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                    >
                      <span className="font-sans font-black text-red-500">G</span>
                      <span className="font-sans font-black text-yellow-500">o</span>
                      <span className="font-sans font-black text-blue-500">o</span>
                      <span className="font-sans font-black text-green-500">g</span>
                      <span>Pay</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Simulator Action Controls */}
            <div className="flex gap-4">
              <button
                id="cart-payment-fail"
                onClick={() => handleSimulatedPayment("fail")}
                className="w-1/2 border border-red-200 hover:bg-red-50 text-red-600 font-bold py-3 rounded-xl text-xs transition-all cursor-pointer text-center"
              >
                {language === "bn" ? "বাতিল / পেমেন্ট ব্যর্থ" : "Cancel / Reject Bills"}
              </button>
              <button
                id="cart-payment-success"
                onClick={() => handleSimulatedPayment("success")}
                className="w-1/2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-md text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <CheckCircle2 className="h-4.5 w-4.5" />
                {language === "bn" ? "পেমেন্ট সম্পন্ন করুন" : "Complete Purchase"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
