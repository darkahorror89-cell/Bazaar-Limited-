import React, { useState, useEffect } from "react";
import { auth, db, handleFirestoreError, OperationType } from "../firebase";
import { doc, getDoc, setDoc, onSnapshot, collection, query, where } from "firebase/firestore";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Award, 
  CheckCircle, 
  Save, 
  Globe, 
  ShieldAlert, 
  LogOut, 
  Loader, 
  ShoppingBag, 
  Calendar,
  Gift,
  Share2,
  Copy,
  Check,
  Users,
  Ticket
} from "lucide-react";
import { motion } from "motion/react";
import { ShippingAddress } from "../types";
import { COUNTRIES } from "./CartView";
import { signInWithPopup, GoogleAuthProvider, signInAnonymously } from "firebase/auth";
import { useToast } from "../context/ToastContext";

interface ProfileViewProps {
  user: any;
  ordersCount: number;
  language: "bn" | "en";
  setLanguage: (lang: "bn" | "en") => void;
}

export default function ProfileView({
  user,
  ordersCount,
  language,
  setLanguage
}: ProfileViewProps) {
  const { toast } = useToast();
  const [profileAddress, setProfileAddress] = useState<ShippingAddress>({
    fullName: "",
    email: "",
    phone: "",
    addressLine: "",
    city: "Dhaka",
    postalCode: "",
    country: "Bangladesh"
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);

  // Referral states
  const [referrals, setReferrals] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    try {
      const q = query(collection(db, "referrals"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.referrerUid === user.uid || data.refereeUid === user.uid) {
            list.push(data);
          }
        });
        setReferrals(list);
      }, (error) => {
        console.warn("Could not query referrals in ProfileView:", error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Error subscribing to referrals in ProfileView:", e);
    }
  }, [user]);

  // Determine dynamic account level tier based on order history
  const getLoyaltyLevel = () => {
    if (ordersCount >= 8) return { nameEn: "Platinum VIP Member", nameBn: "প্ল্যাটিনাম ভিআইপি সদস্য", color: "text-rose-600 bg-rose-50 border-rose-100", starCount: 4 };
    if (ordersCount >= 4) return { nameEn: "Gold Premier Member", nameBn: "গোল্ড প্রিমিয়ার সদস্য", color: "text-amber-600 bg-amber-50 border-amber-100", starCount: 3 };
    if (ordersCount >= 1) return { nameEn: "Silver Active Member", nameBn: "সিলভার সক্রিয় সদস্য", color: "text-slate-600 bg-slate-50 border-slate-100", starCount: 2 };
    return { nameEn: "Bronze Regular Member", nameBn: "ব্রোঞ্জ সাধারণ সদস্য", color: "text-indigo-600 bg-indigo-50 border-indigo-100", starCount: 1 };
  };

  const loyalty = getLoyaltyLevel();

  // Load saved address from Firestore `/users/{uid}` in real-time
  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, "users", user.uid);
    
    // Set up real-time listener to load profile
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.loyaltyPoints !== undefined) {
          setLoyaltyPoints(Number(data.loyaltyPoints));
        } else {
          setLoyaltyPoints(0);
        }
        if (data.address) {
          setProfileAddress(data.address as ShippingAddress);
        }
      } else {
        // Fallback default
        setProfileAddress({
          fullName: user.displayName || "",
          email: user.email || "",
          phone: "",
          addressLine: "",
          city: "Dhaka",
          postalCode: "",
          country: "Bangladesh"
        });
      }
    }, (error) => {
      console.warn("Could not load user profile metadata:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Save/Update address to Firestore
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "Guest User",
        address: profileAddress,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Save in localStorage as fallback
      localStorage.setItem(`profile_${user.uid}`, JSON.stringify(profileAddress));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
      try {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      } catch (err) {
        alert("Could not update profile database records. Check internet connection.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        toast(
          language === "bn"
            ? "গুগল অ্যাকাউন্ট দিয়ে সফলভাবে সাইন-ইন করা হয়েছে!"
            : `Successfully signed in as ${result.user.displayName || "Google User"}!`,
          { type: "success", title: language === "bn" ? "সাইন-ইন সফল" : "Sign-In Successful" }
        );
      }
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      if (error?.code === "auth/popup-blocked") {
        toast(
          language === "bn"
            ? "পপআপ ব্লক করা হয়েছে! অনুগ্রহ করে ব্রাউজারের পপআপ অনুমোদন করুন অথবা নতুন ট্যাবে অ্যাপটি খুলুন।"
            : "Popup blocked! Please allow popups for this site or open the app in a new tab.",
          { type: "warning", title: language === "bn" ? "পপআপ ব্লকড" : "Popup Blocked" }
        );
      } else {
        toast(
          language === "bn"
            ? `গুগল সাইন-ইন ব্যর্থ হয়েছে: ${error?.message || "অনুগ্রহ করে আবার চেষ্টা করুন"}`
            : `Google Sign-In failed: ${error?.message || "Please try again"}`,
          { type: "error", title: language === "bn" ? "সাইন-ইন ব্যর্থ" : "Sign-In Failed" }
        );
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const loginAnonymously = async () => {
    setIsAuthLoading(true);
    try {
      await signInAnonymously(auth);
      toast(
        language === "bn"
          ? "গেস্ট হিসেবে সফলভাবে সাইন-ইন করা হয়েছে!"
          : "Signed in successfully as a guest user!",
        { type: "success", title: language === "bn" ? "গেস্ট প্রবেশ" : "Guest Signed In" }
      );
    } catch (error: any) {
      console.error("Anonymous Sign-In Error:", error);
      toast(
        language === "bn"
          ? `গেস্ট সাইন-ইন ব্যর্থ হয়েছে: ${error?.message || "অনুগ্রহ করে আবার চেষ্টা করুন"}`
          : `Guest Sign-In failed: ${error?.message || "Please try again"}`,
        { type: "error", title: language === "bn" ? "সাইন-ইন ব্যর্থ" : "Sign-In Failed" }
      );
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast(
        language === "bn"
          ? "আপনার অ্যাকাউন্ট থেকে সফলভাবে লগআউট করা হয়েছে!"
          : "Successfully signed out of your account.",
        { type: "info", title: language === "bn" ? "লগআউট সফল" : "Signed Out" }
      );
    } catch (error: any) {
      console.error("Logout error:", error);
      toast(
        language === "bn"
          ? `লগআউট ব্যর্থ হয়েছে: ${error?.message || "অনুগ্রহ করে আবার চেষ্টা করুন"}`
          : `Logout failed: ${error?.message || "Please try again"}`,
        { type: "error", title: language === "bn" ? "লগআউট ব্যর্থ" : "Logout Failed" }
      );
    }
  };

  return (
    <div id="profile-view-wrapper" className="space-y-8 font-sans">
      {/* Page Title & Settings */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="font-sans font-bold text-2xl text-gray-900 tracking-tight flex items-center gap-2">
            <User className="h-6 w-6 text-indigo-600" />
            {language === "bn" ? "ইউজার প্রোফাইল ও সেটিংস" : "User Profile & Settings"}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {language === "bn" 
              ? "আপনার প্রোফাইল তথ্য, সংরক্ষিত ঠিকানা এবং ভাষা পছন্দ নিয়ন্ত্রণ করুন।" 
              : "Manage your default checkout delivery location, preferred language, and access."}
          </p>
        </div>

        {/* Dynamic Language Toggle */}
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 p-1.5 rounded-2xl w-fit shrink-0">
          <Globe className="h-4 w-4 text-indigo-600 ml-1.5 shrink-0" />
          <button
            id="lang-toggle-en"
            onClick={() => setLanguage("en")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              language === "en" ? "bg-indigo-600 text-white shadow-md" : "text-indigo-600 hover:bg-white/50"
            }`}
          >
            English
          </button>
          <button
            id="lang-toggle-bn"
            onClick={() => setLanguage("bn")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              language === "bn" ? "bg-indigo-600 text-white shadow-md" : "text-indigo-600 hover:bg-white/50"
            }`}
          >
            বাংলা
          </button>
        </div>
      </div>

      {!user ? (
        /* GUEST GATEWAY SIGN-IN REQUIRED */
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-gray-100 shadow-xl p-8 text-center space-y-6">
          <div className="bg-indigo-50 text-indigo-600 h-16 w-16 rounded-3xl flex items-center justify-center mx-auto shadow-md">
            <ShieldAlert className="h-8 w-8" />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-sans font-bold text-lg text-gray-900">
              {language === "bn" ? "লগইন করা আবশ্যক" : "Authentication Required"}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
              {language === "bn"
                ? "আপনার ঠিকানা সংরক্ষণ করতে, অর্ডার ট্র্যাক করতে এবং প্লেস্টোর রেডি সুবিধাগুলো পেতে অনুগ্রহ করে সাইন-ইন করুন।"
                : "To save billing/shipping addresses, check out dynamically, and view real-time trackers, sign in securely."}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              id="profile-sign-in-google-btn"
              onClick={loginWithGoogle}
              disabled={isAuthLoading}
              className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 disabled:opacity-50 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md transition-all text-xs cursor-pointer active:scale-[0.99]"
            >
              {isAuthLoading ? (
                <Loader className="h-4 w-4 animate-spin text-indigo-600" />
              ) : (
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
              )}
              <span>{language === "bn" ? "গুগল অ্যাকাউন্ট দিয়ে সাইন-ইন" : "Sign In with Google"}</span>
            </button>
            <button
              id="profile-sign-in-anon-btn"
              onClick={loginAnonymously}
              disabled={isAuthLoading}
              className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 py-3.5 rounded-2xl text-xs font-semibold transition-colors cursor-pointer active:scale-[0.99]"
            >
              {language === "bn" ? "অতিথি বা গেস্ট হিসেবে প্রবেশ" : "Continue as Guest / Anonymous User"}
            </button>
          </div>
        </div>
      ) : (
        /* LOGGED IN USER METADATA & PROFILE SETTINGS */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Profile Header & Loyalty status card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col items-center text-center space-y-4">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  referrerPolicy="no-referrer"
                  className="h-20 w-20 rounded-full border-4 border-indigo-100 shadow-md bg-gray-50"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold shadow-sm">
                  {user.email ? user.email[0].toUpperCase() : "G"}
                </div>
              )}

              <div className="space-y-1">
                <h3 className="font-bold text-gray-800 text-lg">
                  {user.displayName || (language === "bn" ? "অতিথি গ্রাহক" : "Guest Customer")}
                </h3>
                <p className="text-xs text-gray-400 font-mono flex items-center gap-1 justify-center">
                  <Mail className="h-3 w-3" />
                  {user.email || (language === "bn" ? "অজ্ঞাত ইমেইল" : "No Email Configured")}
                </p>
              </div>

              {/* Verified Badge */}
              <div className="w-full pt-1.5 flex justify-center">
                {user.emailVerified ? (
                  <span className="flex items-center gap-1 bg-green-50 text-green-700 text-[10px] font-bold border border-green-100 px-3 py-1 rounded-full uppercase">
                    <CheckCircle className="h-3 w-3 fill-green-700 text-white" />
                    Verified User
                  </span>
                ) : (
                  <span className="flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100 px-3 py-1 rounded-full uppercase">
                    Sandbox Account
                  </span>
                )}
              </div>

              {/* Dynamic Loyalty / Account Level Tier Badge */}
              <div className="w-full pt-4 border-t border-gray-50 flex flex-col items-center space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {language === "bn" ? "অ্যাকাউন্ট লেভেল" : "Loyalty Achievement"}
                </span>
                <div className={`px-4 py-2 rounded-2xl border text-xs font-bold font-sans flex items-center gap-1.5 shadow-sm ${loyalty.color}`}>
                  <Award className="h-4 w-4" />
                  {language === "bn" ? loyalty.nameBn : loyalty.nameEn}
                </div>
              </div>

              {/* Loyalty Points Balance */}
              <div className="w-full pt-3 border-t border-gray-50 flex flex-col items-center space-y-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {language === "bn" ? "উপলব্ধ পয়েন্ট" : "Loyalty Balance"}
                </span>
                <div className="text-sm font-black text-indigo-950 font-sans flex items-center gap-1.5 bg-amber-50/60 border border-amber-200/60 px-4 py-1.5 rounded-2xl shadow-xs">
                  <span className="text-base">🪙</span>
                  <span>{loyaltyPoints} {language === "bn" ? "পয়েন্ট" : "Points"}</span>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
              <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
                {language === "bn" ? "অর্ডার স্ট্যাটিস্টিকস" : "Order Dashboard Metrics"}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-50 text-center">
                  <ShoppingBag className="h-5 w-5 text-indigo-600 mx-auto" />
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-2">
                    {language === "bn" ? "মোট অর্ডার" : "Placed Orders"}
                  </p>
                  <p className="font-mono text-xl font-extrabold text-indigo-950 mt-1">{ordersCount}</p>
                </div>
                <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-50 text-center">
                  <Calendar className="h-5 w-5 text-emerald-600 mx-auto" />
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-2">
                    {language === "bn" ? "যোগদানের সাল" : "Joined"}
                  </p>
                  <p className="font-sans text-sm font-bold text-emerald-950 mt-2">2026</p>
                </div>
              </div>

              <button
                id="profile-logout-btn"
                onClick={handleLogout}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                {language === "bn" ? "লগআউট করুন" : "Sign Out of Account"}
              </button>
            </div>
          </div>

          {/* Column 2 & 3: Persistent Address Book Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-2 border-b border-gray-50 pb-4 mb-6">
                <MapPin className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-gray-800 text-base">
                  {language === "bn" ? "সংরক্ষিত শিপিং ঠিকানা (ডিফল্ট)" : "Default Shipping & Address Book"}
                </h3>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      {language === "bn" ? "পূর্ণ নাম *" : "Full Name *"}
                    </label>
                    <input
                      id="profile-fullname"
                      type="text"
                      required
                      placeholder={language === "bn" ? "আপনার পূর্ণ নাম লিখুন" : "Enter full name"}
                      value={profileAddress.fullName}
                      onChange={(e) => setProfileAddress({ ...profileAddress, fullName: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-gray-50/50 hover:bg-white focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      {language === "bn" ? "মোবাইল নম্বর *" : "Phone Number *"}
                    </label>
                    <input
                      id="profile-phone"
                      type="tel"
                      required
                      placeholder={language === "bn" ? "উদাঃ ০১৭০০০০০০০০" : "e.g. +8801700000000"}
                      value={profileAddress.phone}
                      onChange={(e) => setProfileAddress({ ...profileAddress, phone: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-gray-50/50 hover:bg-white focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    {language === "bn" ? "ইমেইল ঠিকানা *" : "Email Address *"}
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    required
                    placeholder="Enter email"
                    value={profileAddress.email}
                    onChange={(e) => setProfileAddress({ ...profileAddress, email: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-gray-50/50 hover:bg-white focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    {language === "bn" ? "বিস্তারিত ঠিকানা (রাস্তা, বাসা নম্বর) *" : "Shipping Address Line *"}
                  </label>
                  <input
                    id="profile-addressline"
                    type="text"
                    required
                    placeholder={language === "bn" ? "রাস্তা নং, হোল্ডিং নং এবং এলাকা লিখুন" : "Street address, house, apartment"}
                    value={profileAddress.addressLine}
                    onChange={(e) => setProfileAddress({ ...profileAddress, addressLine: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-gray-50/50 hover:bg-white focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      {language === "bn" ? "দেশ *" : "Country *"}
                    </label>
                    <select
                      id="profile-country"
                      value={COUNTRIES.find(c => c.nameEn === profileAddress.country || c.nameBn === profileAddress.country)?.code || "BD"}
                      onChange={(e) => {
                        const matched = COUNTRIES.find(c => c.code === e.target.value);
                        if (matched) {
                          setProfileAddress({ 
                            ...profileAddress, 
                            country: language === "bn" ? matched.nameBn : matched.nameEn,
                            city: matched.code === "BD" ? "Dhaka" : ""
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
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      {language === "bn" ? "শহর / জেলা *" : "City / Region *"}
                    </label>
                    {(COUNTRIES.find(c => c.nameEn === profileAddress.country || c.nameBn === profileAddress.country)?.code || "BD") === "BD" ? (
                      <select
                        id="profile-city"
                        value={profileAddress.city}
                        onChange={(e) => setProfileAddress({ ...profileAddress, city: e.target.value })}
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
                        id="profile-city-input"
                        type="text"
                        required
                        placeholder={language === "bn" ? "যেমন: নিউ ইয়র্ক / দিল্লি" : "e.g. New York / Delhi"}
                        value={profileAddress.city}
                        onChange={(e) => setProfileAddress({ ...profileAddress, city: e.target.value })}
                        className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-gray-50/50 hover:bg-white focus:bg-white transition-all"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      {language === "bn" ? "পোস্টাল কোড *" : "Postal Code *"}
                    </label>
                    <input
                      id="profile-postalcode"
                      type="text"
                      required
                      placeholder="e.g. 1212"
                      value={profileAddress.postalCode}
                      onChange={(e) => setProfileAddress({ ...profileAddress, postalCode: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-gray-50/50 hover:bg-white focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 flex flex-col md:flex-row items-center gap-4 justify-between border-t border-gray-50">
                  <p className="text-[10px] text-gray-400 leading-relaxed font-sans max-w-sm">
                    {language === "bn" 
                      ? "* এটি সংরক্ষণ করলে পরবর্তী কেনাকাটায় আপনার ঠিকানা স্বয়ংক্রিয়ভাবে কার্ট চেকাউটে যুক্ত হবে।" 
                      : "* Saving your default address allows the system to auto-populate future checkout fields instantly."}
                  </p>

                  <button
                    id="profile-save-btn"
                    type="submit"
                    disabled={isSaving}
                    className="w-full md:w-fit px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all text-xs cursor-pointer"
                  >
                    {isSaving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {language === "bn" ? "ঠিকানা সংরক্ষণ করুন" : "Save Delivery Address"}
                  </button>
                </div>
              </form>

              {/* Notification Success Banner */}
              {saveSuccess && (
                <div className="mt-4 bg-green-50 border border-green-100 text-green-700 text-xs px-4 py-3 rounded-2xl flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>
                    {language === "bn" 
                      ? "আপনার শিপিং ঠিকানা সফলভাবে ডাটাবেজে সংরক্ষণ করা হয়েছে!" 
                      : "Default shipping address updated and secured in Firestore successfully!"}
                  </span>
                </div>
              )}
            </div>

            {/* Refer & Earn System Card */}
            <div className="mt-8 bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm space-y-6 animate-fade-in">
              <div className="flex items-center gap-2.5 border-b border-gray-50 pb-4">
                <Gift className="h-6 w-6 text-indigo-600 animate-pulse animate-duration-1000" />
                <div>
                  <h3 className="font-sans font-bold text-gray-900 text-base">
                    {language === "bn" ? "রেফারেল ও কুপন রিওয়ার্ড" : "Refer & Earn Program"}
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {language === "bn"
                      ? "আপনার বন্ধুদের আমন্ত্রণ জানান এবং সফল কেনাকাটায় দুজনেই লাভ করুন বিশেষ কুপন কোড!"
                      : "Share your code and get premium coupon rewards for you and your friends."}
                  </p>
                </div>
              </div>

              {/* Referral Link Copy Area */}
              <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1">
                    <Share2 className="h-3.5 w-3.5" />
                    {language === "bn" ? "আপনার নিজস্ব রেফারেল লিংক" : "Your Unique Invite Link"}
                  </span>
                  <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">
                    {language === "bn" ? "১৫% ও ২০% ছাড়" : "15% & 20% Off"}
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    id="referral-link-input"
                    type="text"
                    readOnly
                    value={`${window.location.origin}/?ref=${user.uid}`}
                    className="w-full text-xs font-mono px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none text-indigo-950 select-all"
                  />
                  <button
                    id="copy-referral-btn"
                    onClick={() => {
                      const link = `${window.location.origin}/?ref=${user.uid}`;
                      navigator.clipboard.writeText(link);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                      toast(
                        language === "bn"
                          ? "লিংক ক্লিপবোর্ডে কপি হয়েছে!"
                          : "Referral link copied to clipboard!",
                        { type: "success", title: language === "bn" ? "কপি সফল" : "Copied Successfully" }
                      );
                    }}
                    className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-indigo-600 leading-normal">
                  {language === "bn"
                    ? "* এই লিংকটি বন্ধুদের সাথে শেয়ার করুন। লিংকে প্রবেশ করে তারা সাইন-আপ করলে তারা পাবে ১৫% ছাড়ের কুপন এবং তাদের প্রথম অর্ডারে আপনি পাবেন ২০% ছাড়ের কুপন!"
                    : "* Invite friends using this link. When they sign up, they receive a 15% discount coupon. Once they place their first order, you receive a 20% discount coupon!"}
                </p>
              </div>

              {/* Referral History / My Coupons Section */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-indigo-500" />
                  {language === "bn" ? "আমার রেফারেল এবং সক্রিয় কুপন" : "My Referrals & Active Coupons"}
                </h4>

                {referrals.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-gray-100 rounded-2xl bg-gray-50/20">
                    <Ticket className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">
                      {language === "bn"
                        ? "এখনো কোনো সফল রেফারেল নেই। আপনার বন্ধুদের লিংকটি শেয়ার করুন!"
                        : "No referral rewards earned yet. Share your invite link to start earning!"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {referrals.map((ref) => {
                      const isReferee = ref.refereeUid === user.uid;
                      
                      return (
                        <div key={ref.id} className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-3 relative overflow-hidden">
                          {/* Accent tag */}
                          <div className={`absolute top-0 right-0 text-[8px] font-bold px-2 py-0.5 rounded-bl-xl uppercase tracking-wider ${
                            isReferee ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white"
                          }`}>
                            {isReferee 
                              ? (language === "bn" ? "আমন্ত্রিত বন্ধু" : "Referred Friend")
                              : (language === "bn" ? "রেফারেল বোনাস" : "Referrer Bonus")
                            }
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs font-bold text-gray-800">
                              {isReferee 
                                ? (language === "bn" ? "আপনি আমন্ত্রিত হয়েছেন" : "Joined via Referral")
                                : `${ref.refereeName || "User"} (Joined)`
                              }
                            </p>
                            <p className="text-[10px] text-gray-400 font-mono">
                              {new Date(ref.createdAt).toLocaleDateString(language === "bn" ? "bn-BD" : "en-US", {
                                year: "numeric", month: "long", day: "numeric"
                              })}
                            </p>
                          </div>

                          {/* Coupon Code Block */}
                          <div className="pt-2 border-t border-gray-100/60 flex items-center justify-between gap-2">
                            <div>
                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                {language === "bn" ? "ডিসকাউন্ট কুপন" : "Promo Reward Coupon"}
                              </p>
                              <p className="font-mono text-xs font-black text-indigo-950 mt-0.5 select-all">
                                {isReferee ? ref.refereeCoupon : ref.referrerCoupon}
                              </p>
                            </div>

                            <div className="text-right">
                              {isReferee ? (
                                ref.refereeCouponUsed ? (
                                  <span className="inline-block text-[10px] font-semibold text-gray-400 bg-gray-200/50 px-2.5 py-1 rounded-xl">
                                    {language === "bn" ? "ব্যবহৃত" : "Used"}
                                  </span>
                                ) : (
                                  <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-xl">
                                    {language === "bn" ? "১৫% ছাড় সক্রিয়" : "15% Off"}
                                  </span>
                                )
                              ) : (
                                ref.referrerCouponUsed ? (
                                  <span className="inline-block text-[10px] font-semibold text-gray-400 bg-gray-200/50 px-2.5 py-1 rounded-xl">
                                    {language === "bn" ? "ব্যবহৃত" : "Used"}
                                  </span>
                                ) : (
                                  <span className="inline-block text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-xl">
                                    {language === "bn" ? "২০% ছাড় সক্রিয়" : "20% Off"}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
