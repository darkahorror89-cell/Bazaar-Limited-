import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { 
  Bike, 
  MapPin, 
  Phone, 
  User, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Navigation, 
  Coins, 
  AlertCircle, 
  Copy, 
  Check, 
  CheckSquare, 
  Search,
  Map,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Package,
  Loader,
  Store
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Order } from "../types";
import { useToast } from "../context/ToastContext";

interface CourierPanelViewProps {
  language: "bn" | "en";
}

export default function CourierPanelView({ language }: CourierPanelViewProps) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<"pending" | "delivered">("pending");
  const [copiedUid, setCopiedUid] = useState(false);
  const [searchText, setSearchText] = useState("");

  const user = auth.currentUser;
  const riderUid = user?.uid || "guest";
  const riderName = user?.displayName || user?.email?.split("@")[0] || "Bazar Limited Rider";

  // Real-time subscribe to orders assigned to this rider
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const ordersRef = collection(db, "orders");
    const q = query(ordersRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: Order[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Order;
        if (data.assignedCourierUid === user.uid) {
          results.push(data);
        }
      });
      // Sort by updated time descending
      results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setOrders(results);
      setIsLoading(false);
    }, (error) => {
      console.error("Error reading assigned orders:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const copyRiderUid = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
    toast(
      language === "bn" ? "রাইডার আইডি কপি হয়েছে!" : "Rider UID copied successfully!",
      { type: "success" }
    );
  };

  const handleUpdateStatus = async (orderId: string, newStatus: 'out_for_delivery' | 'completed') => {
    try {
      const orderRef = doc(db, "orders", orderId);
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        deliveryUpdateDate: new Date().toISOString()
      };

      if (newStatus === 'completed') {
        updateData.paymentStatus = 'paid'; // Cash on Delivery is collected
      }

      await updateDoc(orderRef, updateData);

      toast(
        language === "bn" 
          ? `অর্ডারের স্ট্যাটাস সফলভাবে আপডেট করা হয়েছে!` 
          : `Order status successfully updated to ${newStatus === 'completed' ? 'Delivered' : 'Out for Delivery'}!`,
        { type: "success", title: language === "bn" ? "স্ট্যাটাস আপডেট" : "Status Updated" }
      );

      // Synced selected order view
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, ...updateData } : null);
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast(
        language === "bn" ? "স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।" : "Failed to update delivery status.",
        { type: "error" }
      );
    }
  };

  const getGoogleMapsSearchUrl = (address: string, city: string) => {
    const query = encodeURIComponent(`${address}, ${city}, Bangladesh`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const isCompleted = o.status === "completed";
    const matchesTab = activeSubTab === "delivered" ? isCompleted : !isCompleted;
    
    if (!matchesTab) return false;

    if (!searchText) return true;
    const lowerSearch = searchText.toLowerCase();
    return (
      o.id.toLowerCase().includes(lowerSearch) ||
      o.shippingAddress.fullName.toLowerCase().includes(lowerSearch) ||
      o.shippingAddress.phone.includes(lowerSearch) ||
      o.shippingAddress.city.toLowerCase().includes(lowerSearch)
    );
  });

  // Calculate earnings / deliveries count
  const completedDeliveriesCount = orders.filter(o => o.status === "completed").length;
  const pendingDeliveriesCount = orders.filter(o => o.status !== "completed").length;
  const totalEarnings = orders.filter(o => o.status === "completed").reduce((acc, curr) => acc + 50, 0); // Simulated ₹ 50 per delivery fee

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-left font-sans">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-tr from-indigo-950 via-slate-900 to-indigo-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl border border-indigo-950">
        <div className="absolute top-0 right-0 p-8 opacity-10 animate-pulse">
          <Bike className="h-48 w-48" />
        </div>
        
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-indigo-500/20">
                {language === "bn" ? "কুরিয়ার এবং ডেলিভারি ড্যাশবোর্ড" : "Courier Delivery Network"}
              </span>
              <h2 className="text-xl md:text-2xl font-black tracking-tight">
                {language === "bn" ? `স্বাগতম, ${riderName}` : `Welcome back, ${riderName}`}
              </h2>
              <p className="text-xs text-indigo-200 max-w-lg leading-relaxed">
                {language === "bn" 
                  ? "আপনার নামে বরাদ্দকৃত ডেলিভারিগুলোর লাইভ স্ট্যাটাস আপডেট করুন এবং কাস্টমারের ঠিকানায় নিরাপদে পণ্য পৌঁছে দিন।" 
                  : "Track your assigned shipments, navigate using live maps, and instantly submit completion handovers."}
              </p>
            </div>

            {/* Rider ID Display */}
            {user && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 shrink-0 space-y-1.5 min-w-[240px]">
                <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                  {language === "bn" ? "আপনার রাইডার আইডি (UID)" : "Your Rider Credentials ID"}
                </p>
                <div className="flex items-center justify-between gap-2 bg-black/20 p-2 rounded-xl border border-white/5">
                  <span className="font-mono text-[10px] text-white/90 select-all truncate max-w-[150px]">
                    {user.uid}
                  </span>
                  <button
                    onClick={copyRiderUid}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-300 hover:text-white transition-all active:scale-90"
                    title={language === "bn" ? "আইডি কপি করুন" : "Copy UID"}
                  >
                    {copiedUid ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[9px] text-indigo-200">
                  {language === "bn" 
                    ? "* সেলার প্যানেল থেকে অর্ডার অ্যাসাইন করার সময় এই আইডিটি ব্যবহার করুন।" 
                    : "* Give this UID to sellers so they can assign deliveries directly to you."}
                </p>
              </div>
            )}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
            <div className="bg-black/15 rounded-2xl p-3 border border-white/5">
              <span className="text-[10px] text-indigo-200 uppercase tracking-widest block font-bold">
                {language === "bn" ? "চলমান ডেলিভারি" : "Pending Job"}
              </span>
              <span className="text-lg font-black font-mono mt-1 block">{pendingDeliveriesCount}</span>
            </div>
            <div className="bg-black/15 rounded-2xl p-3 border border-white/5">
              <span className="text-[10px] text-indigo-200 uppercase tracking-widest block font-bold">
                {language === "bn" ? "সম্পন্ন ডেলিভারি" : "Completed"}
              </span>
              <span className="text-lg font-black font-mono mt-1 block text-emerald-400">{completedDeliveriesCount}</span>
            </div>
            <div className="bg-black/15 rounded-2xl p-3 border border-white/5">
              <span className="text-[10px] text-indigo-200 uppercase tracking-widest block font-bold">
                {language === "bn" ? "মোট কমিশন" : "Total Earnings"}
              </span>
              <span className="text-lg font-black font-mono mt-1 block text-amber-400">₹ {totalEarnings}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Orders list vs Detail / Map view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Order selection List */}
        <div className="lg:col-span-5 bg-white border border-gray-150 rounded-3xl p-4 md:p-5 space-y-4">
          
          {/* Sub-tabs header */}
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
              <button
                onClick={() => {
                  setActiveSubTab("pending");
                  setSelectedOrder(null);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeSubTab === "pending" 
                    ? "bg-white text-indigo-950 shadow-xs" 
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {language === "bn" ? "নতুন ডেলিভারি" : "To Deliver"}
              </button>
              <button
                onClick={() => {
                  setActiveSubTab("delivered");
                  setSelectedOrder(null);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeSubTab === "delivered" 
                    ? "bg-white text-indigo-950 shadow-xs" 
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {language === "bn" ? "ডেলিভারড তালিকা" : "Delivered"}
              </button>
            </div>

            <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">
              {filteredOrders.length} {language === "bn" ? "অর্ডার" : "Orders"}
            </span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={language === "bn" ? "নাম, ফোন বা অর্ডার আইডি..." : "Search name, phone, city..."}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500 text-xs bg-gray-50/50"
            />
          </div>

          {/* Loader */}
          {isLoading ? (
            <div className="text-center py-12">
              <Loader className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-400">{language === "bn" ? "অর্ডার লোড করা হচ্ছে..." : "Loading deliveries..."}</p>
            </div>
          ) : !user ? (
            <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl bg-gray-50/30">
              <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
              <p className="text-xs text-gray-500 font-bold">{language === "bn" ? "দয়া করে আগে সাইন-ইন করুন" : "Please Sign In First"}</p>
              <p className="text-[11px] text-gray-400 mt-1">
                {language === "bn" ? "রাইডার ড্যাশবোর্ড ব্যবহারের জন্য অ্যাকাউন্ট থাকা আবশ্যক।" : "A user profile is required to view your courier dashboard."}
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-150 rounded-2xl bg-gray-50/40">
              <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">
                {language === "bn" 
                  ? (searchText ? "কোনো মিল পাওয়া যায়নি।" : "এই ট্যাবে কোনো কুরিয়ার অর্ডার নেই।")
                  : (searchText ? "No matches found." : "No orders in this category.")}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {filteredOrders.map((order) => {
                const isActive = selectedOrder?.id === order.id;
                const isPrepaid = order.paymentStatus === "paid";
                
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`p-4 border rounded-2xl transition-all cursor-pointer text-left relative overflow-hidden ${
                      isActive 
                        ? "border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-600/30" 
                        : "border-gray-150 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-black text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-lg">
                        #{order.id.substring(0, 8).toUpperCase()}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        order.status === "completed" 
                          ? "bg-green-50 text-green-700 border border-green-100"
                          : order.status === "out_for_delivery"
                          ? "bg-amber-50 text-amber-700 border border-amber-100 animate-pulse"
                          : "bg-blue-50 text-blue-700 border border-blue-100"
                      }`}>
                        {order.status === "completed" 
                          ? (language === "bn" ? "ডেলিভারড" : "Delivered")
                          : order.status === "out_for_delivery"
                          ? (language === "bn" ? "চলমান" : "Out for Delivery")
                          : (language === "bn" ? "অ্যাসাইনড" : "Assigned")
                        }
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        {order.shippingAddress.fullName}
                      </p>
                      <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{order.shippingAddress.addressLine}, {order.shippingAddress.city}</span>
                      </p>
                    </div>

                    <div className="mt-3.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-gray-400 uppercase tracking-wider block font-bold">
                          {isPrepaid ? (language === "bn" ? "প্রিপেইড (পেইড)" : "Prepaid (Paid)") : (language === "bn" ? "ক্যাশ অন ডেলিভারি" : "Cash on Delivery (COD)")}
                        </span>
                        <span className={`text-xs font-mono font-black ${isPrepaid ? "text-emerald-600" : "text-gray-950"}`}>
                          {isPrepaid ? "₹ 0 (Prepaid)" : `₹ ${order.totalAmount.toLocaleString("en-BD")}`}
                        </span>
                      </div>

                      <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${isActive ? "translate-x-1 text-indigo-600" : ""}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Visual Map, Customer Details & Status Control Panel */}
        <div className="lg:col-span-7 space-y-6">
          <AnimatePresence mode="wait">
            {selectedOrder ? (
              <motion.div
                key={selectedOrder.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white border border-gray-150 rounded-3xl p-5 md:p-6 text-left space-y-6"
              >
                {/* Details Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block">
                      {language === "bn" ? "বিস্তারিত ডেলিভারি টিকিট" : "Active Delivery Ticket"}
                    </span>
                    <h3 className="font-sans font-bold text-base text-gray-900 mt-0.5">
                      {language === "bn" ? "অর্ডার" : "Order ID"} <span className="font-mono text-indigo-950">#{selectedOrder.id.toUpperCase()}</span>
                    </h3>
                  </div>

                  <a
                    href={getGoogleMapsSearchUrl(selectedOrder.shippingAddress.addressLine, selectedOrder.shippingAddress.city)}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-1.5 px-3 rounded-xl text-[10px] uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer border border-indigo-100 active:scale-95"
                  >
                    <Navigation className="h-3.5 w-3.5 text-indigo-600" />
                    {language === "bn" ? "গুগল ম্যাপে দেখুন" : "Open in Google Maps"}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Status controls */}
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                      {language === "bn" ? "অর্ডার স্ট্যাটাস নিয়ন্ত্রণ" : "Order Lifecycle Controller"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2 w-2 rounded-full ${
                        selectedOrder.status === 'completed' ? 'bg-green-500' : 'bg-amber-500 animate-ping'
                      }`} />
                      <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        {selectedOrder.status === 'completed' 
                          ? (language === "bn" ? "পণ্যটি সফলভাবে ডেলিভার করা হয়েছে" : "Completed and Handed Over")
                          : selectedOrder.status === 'out_for_delivery'
                          ? (language === "bn" ? "ডেলিভারি বয় রাস্তায় আছে" : "Out for Delivery / Transit")
                          : (language === "bn" ? "কুরিয়ারের জন্য প্রস্তুত" : "Assigned & Ready to Ship")
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {selectedOrder.status !== 'completed' && (
                      <>
                        {selectedOrder.status !== 'out_for_delivery' && (
                          <button
                            onClick={() => handleUpdateStatus(selectedOrder.id, 'out_for_delivery')}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition-all cursor-pointer active:scale-95 flex items-center gap-1 shadow-sm"
                          >
                            <Bike className="h-4 w-4" />
                            {language === "bn" ? "রাস্তায় রওনা দিন" : "Start Ride (Transit)"}
                          </button>
                        )}
                        <button
                          onClick={() => handleUpdateStatus(selectedOrder.id, 'completed')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer active:scale-95 flex items-center gap-1 shadow-md shadow-emerald-50"
                        >
                          <CheckSquare className="h-4 w-4" />
                          {language === "bn" ? "ডেলিভারড মার্ক করুন" : "Mark Delivered"}
                        </button>
                      </>
                    )}

                    {selectedOrder.status === 'completed' && (
                      <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-100 px-3.5 py-2 rounded-xl text-xs font-bold">
                        <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
                        {language === "bn" ? "ডেলিভারি সম্পন্ন" : "Delivery Verified"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Google Maps Visual Simulator Component */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Map className="h-3.5 w-3.5 text-indigo-500" />
                    {language === "bn" ? "ইন্টারেক্টিভ ডেলিভারি রুট ও নেভিগেশন ম্যাপ" : "Interactive Delivery Navigation Router"}
                  </label>
                  
                  {/* Map Canvas Frame */}
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-gray-200 bg-slate-100 flex flex-col items-center justify-center group shadow-inner">
                    {/* Maps API Simulation or real coordinates */}
                    <div className="absolute inset-0 bg-indigo-50/20 flex flex-col items-center justify-center p-6 text-center space-y-3">
                      {/* Interactive Visual Map Blueprint Background */}
                      <div className="absolute inset-0 opacity-40 mix-blend-multiply bg-[radial-gradient(#c5cae9_1px,transparent_1px)] [background-size:16px_16px]" />
                      
                      {/* Micro Map Graphics */}
                      <div className="relative w-full max-w-sm h-28 bg-white border border-indigo-100 rounded-xl shadow-md p-3 flex flex-col justify-between overflow-hidden">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
                              <Store className="h-4 w-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-[9px] font-bold text-gray-800">Bazar Limited Hub</p>
                              <p className="text-[8px] text-gray-400">Dhaka HQ Pickup</p>
                            </div>
                          </div>

                          <div className="h-0.5 flex-1 mx-2 mt-3.5 bg-dashed bg-gradient-to-r from-indigo-500 to-rose-500 relative flex items-center justify-center">
                            <Bike className="h-4 w-4 text-indigo-600 absolute animate-bounce" style={{ animationDuration: "1.5s" }} />
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-[9px] font-bold text-gray-800">{selectedOrder.shippingAddress.fullName.split(" ")[0]}</p>
                              <p className="text-[8px] text-gray-400">{selectedOrder.shippingAddress.city}</p>
                            </div>
                            <div className="h-7 w-7 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
                              <MapPin className="h-4 w-4 text-rose-600 animate-pulse" />
                            </div>
                          </div>
                        </div>

                        {/* Navigation Stats Overlay */}
                        <div className="bg-slate-900 text-white rounded-lg p-2 flex items-center justify-between text-[9px] font-mono">
                          <span className="flex items-center gap-1">
                            <Navigation className="h-3 w-3 text-indigo-400 animate-pulse" />
                            {language === "bn" ? "দূরত্ব: ৮.৫ কিমি" : "Distance: 8.5 km"}
                          </span>
                          <span>|</span>
                          <span>{language === "bn" ? "আনুমানিক সময়: ২৫ মিনিট" : "Est. Time: 25 mins"}</span>
                        </div>
                      </div>

                      <div className="z-10 space-y-1">
                        <p className="text-xs font-bold text-indigo-950">
                          {selectedOrder.shippingAddress.addressLine}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {selectedOrder.shippingAddress.city}, Bangladesh
                        </p>
                      </div>

                      <a
                        href={getGoogleMapsSearchUrl(selectedOrder.shippingAddress.addressLine, selectedOrder.shippingAddress.city)}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="z-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] uppercase tracking-wider transition-all shadow-sm active:scale-95 flex items-center gap-1 cursor-pointer"
                      >
                        <Navigation className="h-3 w-3" />
                        {language === "bn" ? "জিপিএস নেভিগেশন চালু করুন" : "Launch Live GPS Navigation"}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Customer and Order details summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Shipping info */}
                  <div className="border border-gray-100 bg-gray-50/50 rounded-2xl p-4 space-y-3">
                    <h4 className="font-bold text-xs text-indigo-950 uppercase tracking-wider flex items-center gap-1">
                      <User className="h-4 w-4 text-indigo-600" />
                      {language === "bn" ? "কাস্টমার ও ঠিকানা" : "Recipient & Address"}
                    </h4>
                    
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[9px] text-gray-400 font-bold block uppercase">{language === "bn" ? "নাম" : "Full Name"}</span>
                        <span className="font-bold text-gray-800">{selectedOrder.shippingAddress.fullName}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 font-bold block uppercase">{language === "bn" ? "মোবাইল নম্বর" : "Contact Phone"}</span>
                        <a 
                          href={`tel:${selectedOrder.shippingAddress.phone}`} 
                          className="font-mono font-bold text-indigo-700 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Phone className="h-3 w-3" />
                          {selectedOrder.shippingAddress.phone}
                        </a>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 font-bold block uppercase">{language === "bn" ? "ডেলিভারি ঠিকানা" : "Delivery Address"}</span>
                        <span className="text-gray-600 leading-relaxed block">{selectedOrder.shippingAddress.addressLine}, {selectedOrder.shippingAddress.city} - {selectedOrder.shippingAddress.postalCode}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cash collection / invoice details */}
                  <div className="border border-gray-100 bg-gray-50/50 rounded-2xl p-4 space-y-3">
                    <h4 className="font-bold text-xs text-indigo-950 uppercase tracking-wider flex items-center gap-1">
                      <Coins className="h-4 w-4 text-indigo-600" />
                      {language === "bn" ? "পেমেন্ট ও সিওডি (COD)" : "COD Cash Handling"}
                    </h4>

                    <div className="space-y-2.5 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-gray-150">
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">
                          {selectedOrder.paymentStatus === 'paid' 
                            ? (language === "bn" ? "সংগ্রহ করার পরিমাণ (Prepaid)" : "Total COD to Collect")
                            : (language === "bn" ? "ক্যাশ অন ডেলিভারি (COD)" : "Cash on Delivery")
                          }
                        </span>
                        <span className={`text-base font-mono font-black block mt-1 ${
                          selectedOrder.paymentStatus === 'paid' ? "text-emerald-600" : "text-indigo-950"
                        }`}>
                          {selectedOrder.paymentStatus === 'paid' ? "₹ 0.00 (PREPAID)" : `₹ ${selectedOrder.totalAmount.toLocaleString("en-BD")}`}
                        </span>
                        <p className="text-[9px] text-gray-400 mt-1">
                          {selectedOrder.paymentStatus === 'paid' 
                            ? (language === "bn" ? "* কাস্টমার ইতিমধ্যে অনলাইনে পেমেন্ট করে দিয়েছেন।" : "* Order already paid. Do not collect cash.")
                            : (language === "bn" ? "* পণ্যটি হাতে দেওয়ার পূর্বে এই নগদ অর্থ সংগ্রহ করুন।" : "* Hand over the package and collect this exact cash amount.")
                          }
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] text-gray-400 font-bold block uppercase">{language === "bn" ? "পেমেন্ট স্ট্যাটাস" : "Invoice Status"}</span>
                          <span className={`font-bold uppercase text-[10px] ${selectedOrder.paymentStatus === 'paid' ? "text-emerald-700" : "text-amber-700"}`}>
                            {selectedOrder.paymentStatus === 'paid' ? (language === "bn" ? "পরিশোধিত" : "PAID") : (language === "bn" ? "বকেয়া (COD)" : "UNPAID (COD)")}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 font-bold block uppercase">{language === "bn" ? "অর্ডার ক্রিয়েশন" : "Assigned On"}</span>
                          <span className="text-gray-600 text-[10px] font-mono">
                            {new Date(selectedOrder.createdAt).toLocaleDateString(language === "bn" ? "bn-BD" : "en-US", {
                              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delivery instructions notes */}
                {selectedOrder.deliveryNotes && (
                  <div className="bg-amber-50/55 border border-amber-100 rounded-2xl p-4 flex gap-3 text-xs text-amber-900">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{language === "bn" ? "সেলার থেকে বিশেষ নির্দেশনা:" : "Seller Delivery Notes:"}</p>
                      <p className="mt-0.5 text-amber-800 leading-relaxed font-sans">{selectedOrder.deliveryNotes}</p>
                    </div>
                  </div>
                )}

                {/* Items breakdown list inside delivery */}
                <div className="border border-gray-150 rounded-2xl p-4 space-y-3 bg-white">
                  <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
                    {language === "bn" ? "পণ্য সামগ্রী তালিকা" : "Items in Package"}
                  </h4>
                  <div className="divide-y divide-gray-50 max-h-[180px] overflow-y-auto">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5 text-left">
                          <img src={item.product.imageUrl} className="h-9 w-9 rounded-lg object-cover border border-gray-100" />
                          <div>
                            <span className="font-bold text-gray-800 block line-clamp-1">{item.product.name}</span>
                            <span className="text-[10px] text-gray-400">{item.product.category}</span>
                          </div>
                        </div>
                        <span className="font-mono text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                          Qty: {item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            ) : (
              <div className="h-full min-h-[480px] bg-white border border-gray-150 rounded-3xl flex flex-col items-center justify-center p-8 text-center space-y-3 shadow-sm border-dashed">
                <div className="bg-indigo-50 p-4 rounded-full text-indigo-600 animate-bounce" style={{ animationDuration: "2.5s" }}>
                  <Bike className="h-10 w-10" />
                </div>
                <h3 className="font-sans font-bold text-gray-800 text-sm">
                  {language === "bn" ? "একটি ডেলিভারি টিকিট নির্বাচন করুন" : "Select a Delivery Ticket"}
                </h3>
                <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
                  {language === "bn" 
                    ? "বাম পাশের তালিকা থেকে যেকোনো সক্রিয় টিকেট নির্বাচন করুন। এতে কাস্টমারের ম্যাপ নেভিগেশন ও ক্যাশ সংগ্রহের বিবরণ চালু হবে।" 
                    : "Select any active ticket from the left panel to display recipient location map, contact number and handle payments."}
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
