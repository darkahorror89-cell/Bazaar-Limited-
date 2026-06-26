import { useState, useEffect } from "react";
import { 
  X, ShoppingBag, Clock, CheckCircle2, CreditCard, ArrowLeft, 
  MapPin, Truck, ShieldAlert, ChevronRight, Sliders, Play, 
  Phone, User, Calendar, Check, AlertCircle, Loader, Download, Printer
} from "lucide-react";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs, orderBy, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { Order } from "../types";
import { useToast } from "../context/ToastContext";

interface OrderListProps {
  onClose?: () => void;
  isFullPage?: boolean;
  language: "bn" | "en";
}

export default function OrderList({ onClose, isFullPage = false, language }: OrderListProps) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewTab, setViewTab] = useState<"all" | "active" | "completed">("all");

  const user = auth.currentUser;
  const userUid = user?.uid || "guest";

  const handleDownloadInvoice = (order: Order) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast(
        language === "bn" 
          ? "পপ-আপ ব্লক করা আছে! অনুগ্রহ করে পপ-আপ অনুমোদন করুন।" 
          : "Popup blocked! Please allow popups to download your invoice.", 
        { type: "error" }
      );
      return;
    }

    const orderDate = new Date(order.createdAt).toLocaleDateString("en-BD", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const itemsRows = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: left;">
          <div style="font-weight: bold; color: #1e293b;">${item.product.name}</div>
          <div style="font-size: 11px; color: #64748b;">${item.product.category}</div>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #475569;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #475569; font-family: monospace;">₹ ${item.product.price.toLocaleString("en-BD")}</td>
        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: bold; color: #0f172a; font-family: monospace;">₹ ${(item.product.price * item.quantity).toLocaleString("en-BD")}</td>
      </tr>
    `).join("");

    const deliveryCost = order.totalAmount > 1500 ? 0 : 60; // Standard shipping estimation
    const subtotal = order.items.reduce((acc, curr) => acc + (curr.product.price * curr.quantity), 0);

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${order.id.toUpperCase()}</title>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            color: #334155;
            margin: 0;
            padding: 40px;
            background-color: #ffffff;
          }
          .invoice-box {
            max-width: 800px;
            margin: auto;
            border: 1px solid #e2e8f0;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
          }
          .brand-logo {
            font-size: 28px;
            font-weight: 900;
            color: #4f46e5;
            letter-spacing: -0.05em;
          }
          .invoice-title {
            text-align: right;
            font-size: 24px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .meta-table {
            width: 100%;
            margin-bottom: 40px;
          }
          .meta-section {
            width: 50%;
            vertical-align: top;
          }
          .meta-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #94a3b8;
            font-weight: bold;
            margin-bottom: 6px;
          }
          .meta-val {
            font-size: 14px;
            color: #1e293b;
            line-height: 1.5;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
          }
          .items-table th {
            background-color: #f8fafc;
            color: #475569;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            padding: 12px 10px;
            border-bottom: 2px solid #e2e8f0;
          }
          .totals-table {
            width: 40%;
            margin-left: auto;
            border-collapse: collapse;
            margin-bottom: 40px;
          }
          .totals-table td {
            padding: 8px 10px;
            font-size: 13px;
          }
          .grand-total-row {
            border-top: 2px solid #e2e8f0;
            font-weight: 800;
            color: #4f46e5;
            font-size: 16px;
          }
          .footer {
            text-align: center;
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #f1f5f9;
            font-size: 12px;
            color: #94a3b8;
          }
          @media print {
            body { padding: 0; }
            .invoice-box { border: none; box-shadow: none; padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <table class="header-table">
            <tr>
              <td class="brand-logo">BAZAR LIMITED</td>
              <td class="invoice-title">INVOICE</td>
            </tr>
          </table>

          <table class="meta-table">
            <tr>
              <td class="meta-section">
                <div class="meta-label">Billed To:</div>
                <div class="meta-val">
                  <strong>${order.shippingAddress.fullName}</strong><br />
                  ${order.shippingAddress.addressLine}<br />
                  ${order.shippingAddress.city} - ${order.shippingAddress.postalCode}<br />
                  Phone: ${order.shippingAddress.phone}<br />
                  Email: ${order.shippingAddress.email || 'N/A'}
                </div>
              </td>
              <td class="meta-section" style="text-align: right;">
                <div class="meta-label">Invoice Reference:</div>
                <div class="meta-val" style="font-family: monospace; font-weight: bold; color: #4f46e5; font-size: 15px;">
                  #${order.id.toUpperCase()}
                </div>
                <div class="meta-label" style="margin-top: 20px;">Date Generated:</div>
                <div class="meta-val">${orderDate}</div>
                <div class="meta-label" style="margin-top: 20px;">Payment Method:</div>
                <div class="meta-val" style="text-transform: uppercase; font-weight: bold; font-size: 12px; color: #0f172a;">
                  SSLCommerz Sandbox (${order.paymentStatus})
                </div>
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="text-align: left; width: 50%;">Description</th>
                <th style="text-align: center; width: 10%;">Qty</th>
                <th style="text-align: right; width: 20%;">Unit Price</th>
                <th style="text-align: right; width: 20%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <table class="totals-table">
            <tr>
              <td style="color: #64748b;">Subtotal:</td>
              <td style="text-align: right; font-family: monospace;">₹ ${subtotal.toLocaleString("en-BD")}</td>
            </tr>
            <tr>
              <td style="color: #64748b;">Shipping Fee:</td>
              <td style="text-align: right; font-family: monospace;">₹ ${deliveryCost.toLocaleString("en-BD")}</td>
            </tr>
            <tr class="grand-total-row">
              <td>Total Amount:</td>
              <td style="text-align: right; font-family: monospace;">₹ ${order.totalAmount.toLocaleString("en-BD")}</td>
            </tr>
          </table>

          <div class="footer">
            <strong>Thank you for choosing Bazar Limited!</strong><br />
            This is a computer-generated invoice and does not require a physical signature.<br />
            For any queries, contact support@bazarlimited.com
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
  };

  useEffect(() => {
    setIsLoading(true);
    const ordersRef = collection(db, "orders");
    const q = query(
      ordersRef,
      where("userId", "==", userUid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const results: Order[] = [];
      snap.forEach((doc) => {
        results.push(doc.data() as Order);
      });

      // Sort by creation date descending
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(results);
      setIsLoading(false);
    }, (error) => {
      console.warn("Could not load orders via real-time stream. Using local storage fallback:", error);
      // Fallback local storage
      const localOrders = JSON.parse(localStorage.getItem("local_orders") || "[]");
      const filtered = localOrders.filter((o: any) => o.userId === userUid || o.userId === "guest");
      
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(filtered);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userUid]);

  // Synchronize selectedOrder details with real-time updates from orders list
  useEffect(() => {
    if (selectedOrder) {
      const updated = orders.find(o => o.id === selectedOrder.id);
      if (updated) {
        if (
          updated.status !== selectedOrder.status || 
          updated.updatedAt !== selectedOrder.updatedAt || 
          updated.paymentStatus !== selectedOrder.paymentStatus
        ) {
          setSelectedOrder(updated);
        }
      }
    }
  }, [orders, selectedOrder]);

  // Update order status in Firestore / local storage to simulate tracking state transitions for client evaluation
  const handleSimulateStatus = async (orderId: string, newStatus: any) => {
    // 1. Update in local state immediately
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o));
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : null);
    }

    // 2. Persist database update
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn("Could not update status in Cloud DB, attempting local storage sync:", err);
      const localOrders = JSON.parse(localStorage.getItem("local_orders") || "[]");
      const updatedLocal = localOrders.map((o: any) => 
        o.id === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o
      );
      localStorage.setItem("local_orders", JSON.stringify(updatedLocal));

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
          ? `আপনার অর্ডার (${orderId}) এর স্ট্যাটাস সিমুলেট করে "${getStatusText(newStatus, "bn")}" করা হয়েছে!`
          : `Your order (${orderId}) status was simulated to "${getStatusText(newStatus, "en")}"!`,
        { 
          type: "order", 
          title: language === "bn" ? "অর্ডার স্ট্যাটাস সিমুলেটেড" : "Order Status Simulated" 
        }
      );
    }
  };

  // Filter orders based on tabs and search query
  const filteredOrders = orders.filter(o => {
    // Tab filters
    if (viewTab === "active" && (o.status === "completed" || o.status === "cancelled")) return false;
    if (viewTab === "completed" && o.status !== "completed") return false;

    // Search query filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchesId = o.id.toLowerCase().includes(q);
      const matchesProduct = o.items.some(item => item.product.name.toLowerCase().includes(q));
      const matchesCity = o.shippingAddress.city.toLowerCase().includes(q);
      return matchesId || matchesProduct || matchesCity;
    }

    return true;
  });

  // Calculate dynamic checkpoints timeline based on creation time and current status
  const getTrackingTimeline = (order: Order) => {
    const createdDate = new Date(order.createdAt);
    const formatDate = (offsetHours: number) => {
      const d = new Date(createdDate.getTime() + offsetHours * 3600 * 1000);
      return {
        date: d.toLocaleDateString("en-BD", { month: "short", day: "numeric" }),
        time: d.toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" })
      };
    };

    return [
      {
        step: 1,
        titleEn: "Order Confirmed",
        titleBn: "অর্ডার কনফার্মড",
        descEn: "Payment authorized. Order verified and forwarded to merchant fulfillment.",
        descBn: "পেমেন্ট সম্পন্ন হয়েছে। অর্ডারটি যাচাই করা হয়েছে এবং মার্চেন্ট প্রসেসিংয়ে পাঠানো হয়েছে।",
        location: "System Portal, Dhaka",
        ...formatDate(0),
        key: "pending",
        isReached: true
      },
      {
        step: 2,
        titleEn: "In Processing & Quality Check",
        titleBn: "প্যাকেজিং ও কোয়ালিটি চেক",
        descEn: "Product retrieved from regional warehouse. Double-checked for structural integrity and custom packaged.",
        descBn: "আঞ্চলিক ওয়্যারহাউস থেকে প্রোডাক্টটি সংগ্রহ করে গুণগত মান নিশ্চিত করা হয়েছে এবং কাস্টম প্যাকেজিং চলছে।",
        location: "Tejgaon Warehouse Hub, Dhaka",
        ...formatDate(1.5),
        key: "processing",
        isReached: order.status === "processing" || order.status === "shipped" || order.status === "out_for_delivery" || order.status === "completed"
      },
      {
        step: 3,
        titleEn: "Shipped & Dispatched",
        titleBn: "স্থানান্তরিত ও ডিসপ্যাচড",
        descEn: "Package sorted and assigned to Pathao Express Logistics (Courier Tracking Ref: PT-81729).",
        descBn: "পার্সেলটি বাছাই করা হয়েছে এবং পাঠাও এক্সপ্রেস লজিস্টিক্সে হস্তান্তর করা হয়েছে (কুরিয়ার ট্র্যাকিং নং: PT-৮১৭২৯)।",
        location: "Central Sorting Facility, Dhaka",
        ...formatDate(12),
        key: "shipped",
        isReached: order.status === "shipped" || order.status === "out_for_delivery" || order.status === "completed"
      },
      {
        step: 4,
        titleEn: "Out for Delivery",
        titleBn: "ডেলিভারি চলছে",
        descEn: "Pathao courier rider has picked up the package and is on the way to your shipping address.",
        descBn: "পাঠাও কুরিয়ার রাইডার আপনার পার্সেলটি নিয়ে বের হয়েছেন এবং কিছুক্ষণের মধ্যে আপনার ঠিকানায় পৌঁছাবেন।",
        location: "Local Delivery Hub, Dhaka",
        ...formatDate(20),
        key: "out_for_delivery",
        isReached: order.status === "out_for_delivery" || order.status === "completed"
      },
      {
        step: 5,
        titleEn: "Delivered & Completed",
        titleBn: "ডেলিভার্ড সম্পন্ন",
        descEn: "Successfully delivered to shipping address. Handed over to recipient.",
        descBn: "আপনার ঠিকানায় পার্সেলটি সফলভাবে ডেলিভারি সম্পন্ন হয়েছে এবং গ্রহীতার নিকট বুঝিয়ে দেওয়া হয়েছে।",
        location: `${order.shippingAddress.addressLine}, ${order.shippingAddress.city}`,
        ...formatDate(26),
        key: "completed",
        isReached: order.status === "completed"
      }
    ];
  };

  const dashboardContent = (
    <div className="flex flex-col md:flex-row h-full w-full bg-white rounded-3xl overflow-hidden border border-gray-150 shadow-lg min-h-[500px]">
      {/* LEFT COLUMN: LIST PANEL */}
      <div className={`w-full md:w-5/12 border-r border-gray-100 flex flex-col bg-gray-50/30 ${selectedOrder ? "hidden md:flex" : "flex"} h-full`}>
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-indigo-600" />
            <h2 className="font-bold text-gray-800 tracking-tight">
              {language === "bn" ? "অর্ডার ট্র্যাকিং ড্যাশবোর্ড" : "Order Dashboard"}
            </h2>
          </div>
          {onClose && !isFullPage && (
            <button
              id="close-orders-modal-btn"
              onClick={onClose}
              className="md:hidden p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Search and filters */}
        <div className="p-4 bg-white border-b border-gray-50 space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder={language === "bn" ? "অর্ডার আইডি, প্রোডাক্ট দিয়ে ট্র্যাক করুন..." : "Track by ID, product name..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-sans"
            />
            <Clock className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-400" />
          </div>

          {/* Quick Filter tabs */}
          <div className="flex gap-1.5 text-[11px] font-semibold text-gray-500 font-sans">
            <button
              onClick={() => setViewTab("all")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all ${viewTab === "all" ? "bg-indigo-50 text-indigo-700 font-bold" : "hover:bg-gray-100"}`}
            >
              {language === "bn" ? "সবগুলো" : "All"}
            </button>
            <button
              onClick={() => setViewTab("active")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all ${viewTab === "active" ? "bg-amber-50 text-amber-700 font-bold" : "hover:bg-gray-100"}`}
            >
              {language === "bn" ? "চলমান" : "Active"}
            </button>
            <button
              onClick={() => setViewTab("completed")}
              className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all ${viewTab === "completed" ? "bg-green-50 text-green-700 font-bold" : "hover:bg-gray-100"}`}
            >
              {language === "bn" ? "সম্পন্ন" : "Completed"}
            </button>
          </div>
        </div>

        {/* Orders list scroll area */}
        <div className="flex-grow overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-gray-400 text-xs flex flex-col items-center gap-2 font-sans">
              <Loader className="h-5 w-5 text-indigo-600 animate-spin" />
              {language === "bn" ? "অর্ডার ট্র্যাকিং তথ্য লোড হচ্ছে..." : "Retrieving active tracking logs..."}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-16 space-y-3 bg-white rounded-2xl border border-gray-100 font-sans">
              <ShoppingBag className="h-10 w-10 text-gray-300 mx-auto" />
              <p className="text-gray-400 text-xs">
                {language === "bn" ? "কোনো অর্ডার পাওয়া যায়নি।" : "No matching orders found."}
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const activeStep = getTrackingTimeline(order).filter(t => t.isReached).length;
              return (
                <div
                  id={`order-item-${order.id}`}
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`p-4 rounded-2xl text-left border cursor-pointer transition-all ${
                    selectedOrder?.id === order.id
                      ? "bg-white border-indigo-600 shadow-md ring-2 ring-indigo-50"
                      : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-mono font-bold text-xs text-indigo-600 uppercase block">{order.id}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      order.status === "completed" ? "bg-green-50 text-green-700" :
                      order.status === "cancelled" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  {/* Products purchased summary */}
                  <p className="text-xs text-gray-600 font-semibold truncate mt-2">
                    {order.items.map(i => `${i.product.name} (x${i.quantity})`).join(", ")}
                  </p>

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50 text-[10px] text-gray-400">
                    <span className="font-sans font-medium">
                      {new Date(order.createdAt).toLocaleDateString("en-BD", { month: "short", day: "numeric" })}
                    </span>
                    <span className="font-mono font-extrabold text-gray-700 text-xs">
                      ₹ {order.totalAmount.toLocaleString("en-BD")}
                    </span>
                  </div>

                  {/* Progress Line helper */}
                  <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden mt-3">
                    <div 
                      className={`h-full ${order.status === "completed" ? "bg-green-500" : "bg-indigo-600"}`} 
                      style={{ width: `${(activeStep / 4) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: ACTIVE TRACKING STAGE */}
      <div className={`flex-grow flex flex-col h-full bg-white ${!selectedOrder ? "hidden md:flex" : "flex"}`}>
        {selectedOrder ? (
          <motion.div
            key={`detail-${selectedOrder.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-full overflow-y-auto"
          >
            {/* Header / Actions back */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <button
                id="back-to-order-list"
                onClick={() => setSelectedOrder(null)}
                className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-indigo-600 md:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
                {language === "bn" ? "তালিকায় ফিরুন" : "Order List"}
              </button>

              <div className="hidden md:block">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">ACTIVE TRACKING REF</span>
                <span className="font-mono font-bold text-gray-800 text-sm uppercase">{selectedOrder.id}</span>
              </div>

              {/* SIMULATION GATEWAY CONTROLS - Highly useful for evaluating progress steppers */}
              <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 p-1.5 rounded-2xl font-sans">
                <Sliders className="h-3.5 w-3.5 text-indigo-600 ml-1.5" />
                <span className="text-[10px] font-bold text-indigo-950 uppercase hidden lg:inline mr-2">Simulate Status:</span>
                <button
                  id="sim-status-pending"
                  onClick={() => handleSimulateStatus(selectedOrder.id, "pending")}
                  className={`text-[9px] font-bold px-2 py-1 rounded-lg transition-all ${selectedOrder.status === "pending" ? "bg-indigo-600 text-white" : "text-indigo-600 hover:bg-white"}`}
                >
                  Pending
                </button>
                <button
                  id="sim-status-processing"
                  onClick={() => handleSimulateStatus(selectedOrder.id, "processing")}
                  className={`text-[9px] font-bold px-2 py-1 rounded-lg transition-all ${selectedOrder.status === "processing" ? "bg-indigo-600 text-white" : "text-indigo-600 hover:bg-white"}`}
                >
                  Processing
                </button>
                <button
                  id="sim-status-shipped"
                  onClick={() => handleSimulateStatus(selectedOrder.id, "shipped")}
                  className={`text-[9px] font-bold px-2 py-1 rounded-lg transition-all ${selectedOrder.status === "shipped" ? "bg-indigo-600 text-white" : "text-indigo-600 hover:bg-white"}`}
                >
                  Shipped
                </button>
                <button
                  id="sim-status-completed"
                  onClick={() => handleSimulateStatus(selectedOrder.id, "completed")}
                  className={`text-[9px] font-bold px-2 py-1 rounded-lg transition-all ${selectedOrder.status === "completed" ? "bg-indigo-600 text-white" : "text-indigo-600 hover:bg-white"}`}
                >
                  Delivered
                </button>
              </div>
            </div>

            {/* TRACKER CONTENT */}
            <div className="p-6 md:p-8 space-y-8 flex-grow">
              
              {/* VISUAL STEPPER COMPONENT */}
              <div className="relative font-sans">
                {/* Horizontal progress bar for desktop, vertical for mobile handled by layout */}
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-4">
                  {/* Backdrop connector lines for desktop */}
                  <div className="absolute top-5 left-5 right-5 h-1 bg-gray-100 rounded-full hidden md:block z-0" />
                  
                  {getTrackingTimeline(selectedOrder).map((node, i) => {
                    const isPassed = node.isReached;
                    return (
                      <div key={node.step} className="flex md:flex-col items-center md:items-center text-left md:text-center gap-4 md:gap-2 relative z-10 flex-1">
                        {/* Bullet Icon */}
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold font-mono border-2 transition-all shadow-md ${
                          isPassed 
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-indigo-100" 
                            : "bg-white border-gray-200 text-gray-400"
                        }`}>
                          {isPassed ? <Check className="h-5 w-5" /> : node.step}
                        </div>

                        {/* Text */}
                        <div className="md:mt-1 max-w-[160px]">
                          <h4 className={`font-sans font-bold text-xs ${isPassed ? "text-gray-900" : "text-gray-400"}`}>
                            {language === "bn" ? node.titleBn : node.titleEn}
                          </h4>
                          <span className="text-[9px] text-gray-400 font-mono block mt-0.5">{node.location}</span>
                          {isPassed && (
                            <span className="text-[9px] text-indigo-600 font-bold font-mono block mt-0.5">{node.date} • {node.time}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ACTIVE CHECKPOINT DETAIL HIGHLIGHT */}
              <div className="bg-indigo-50/50 border border-indigo-50 rounded-2xl p-5 text-left flex items-start gap-3.5 font-sans">
                <Truck className="h-6 w-6 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-sans font-bold text-xs text-indigo-950">
                    {language === "bn" ? "অ্যাক্টিভ ট্র্যাকিং মেসেজ" : "Live Courier Checkpoint Updates"}
                  </h4>
                  <p className="text-xs text-indigo-800 leading-relaxed mt-1 font-medium">
                    {language === "bn" 
                      ? getTrackingTimeline(selectedOrder).filter(t => t.isReached).slice(-1)[0]?.descBn 
                      : getTrackingTimeline(selectedOrder).filter(t => t.isReached).slice(-1)[0]?.descEn}
                  </p>
                </div>
              </div>

              {/* LIVE TRACKING MAP */}
              <LiveTrackingMap order={selectedOrder} language={language} />

              {/* SHIPPING & BILLING MEMORANDUM */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Shipping Details */}
                <div className="border border-gray-100 rounded-2xl p-5 bg-white text-left space-y-3 font-sans">
                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2.5">
                    <MapPin className="h-4 w-4 text-indigo-600" />
                    {language === "bn" ? "শিপিং ও কুরিয়ার তথ্য" : "Shipping Destination"}
                  </h4>
                  <div className="space-y-2 text-xs text-gray-600">
                    <p className="font-semibold text-gray-900">{selectedOrder.shippingAddress.fullName}</p>
                    <p className="flex items-center gap-1 font-mono text-[11px]">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      {selectedOrder.shippingAddress.phone}
                    </p>
                    <p className="leading-relaxed">{selectedOrder.shippingAddress.addressLine}, {selectedOrder.shippingAddress.city} - {selectedOrder.shippingAddress.postalCode}</p>
                  </div>
                </div>

                {/* Billing Summary */}
                <div className="border border-gray-100 rounded-2xl p-5 bg-white text-left space-y-3 font-sans flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2.5">
                      <CreditCard className="h-4 w-4 text-indigo-600" />
                      {language === "bn" ? "পেমেন্ট ও ইনভয়েস" : "Payment & Billing"}
                    </h4>
                    <div className="space-y-2 text-xs text-gray-500 mt-3">
                      <div className="flex justify-between">
                        <span>Gateway:</span>
                        <span className="font-semibold text-gray-950 uppercase">SSLCommerz Sandbox</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className="font-bold text-green-700 uppercase">{selectedOrder.paymentStatus}</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-gray-50 font-bold text-indigo-600 text-sm">
                        <span>Grand Total:</span>
                        <span className="font-mono">₹ {selectedOrder.totalAmount.toLocaleString("en-BD")}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadInvoice(selectedOrder)}
                    className="w-full mt-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2.5 px-3 rounded-xl text-[10px] uppercase tracking-wider transition-all border border-indigo-100 cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {language === "bn" ? "ইনভয়েস ডাউনলোড করুন" : "Download Invoice"}
                  </button>
                </div>

              </div>

              {/* ITEMS PURCHASED LIST IN THE ORDER */}
              <div className="border border-gray-100 rounded-2xl p-5 bg-white text-left space-y-3 font-sans">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2.5">
                  <ShoppingBag className="h-4 w-4 text-indigo-600" />
                  {language === "bn" ? "ক্রয়কৃত পণ্যের তালিকা" : "Invoice Items List"}
                </h4>
                <div className="divide-y divide-gray-50">
                  {selectedOrder.items.map((item) => (
                    <div key={item.product.id} className="py-3 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          referrerPolicy="no-referrer"
                          className="h-10 w-10 rounded-xl object-cover bg-gray-50 border border-gray-100 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-gray-800 line-clamp-1">{item.product.name}</p>
                          <p className="text-[10px] text-gray-400 font-semibold">{item.product.category} • Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <span className="font-mono text-gray-800 font-extrabold text-xs">
                        ₹ {(item.product.price * item.quantity).toLocaleString("en-BD")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center p-8 text-center text-gray-500 space-y-3 font-sans">
            <ShoppingBag className="h-14 w-14 text-indigo-100 animate-pulse" />
            <div>
              <h3 className="font-bold text-gray-800 text-sm">
                {language === "bn" ? "রিয়েল-টাইম ট্র্যাকার ড্যাশবোর্ড" : "Real-Time Tracking Dashboard"}
              </h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1 leading-relaxed">
                {language === "bn" 
                  ? "বাম তালিকা থেকে আপনার যেকোনো অর্ডার সিলেক্ট করে পার্সেলটির লাইভ ট্র্যাকিং ও ডেলিভারি অগ্রগতি দেখুন।" 
                  : "Select an order from the left tracker panel to view live courier transit checkpoints, dispatch logs, and simulation state managers."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isFullPage) {
    return dashboardContent;
  }

  return (
    <div id="orders-list-modal" className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl h-[85vh] max-h-[750px]"
      >
        {dashboardContent}
      </motion.div>
    </div>
  );
}

// -------------------------------------------------------------
// LIVE TRACKING MAP COMPONENT (VECTOR LOGISTICS TRACKING MAP)
// -------------------------------------------------------------
function LiveTrackingMap({ order, language }: { order: any; language: "bn" | "en" }) {
  const [riderProgress, setRiderProgress] = useState(15);
  const [callRiderToast, setCallRiderToast] = useState(false);

  // Set initial status progress based on state
  useEffect(() => {
    const status = order?.status?.toLowerCase();
    if (status === "pending") {
      setRiderProgress(10);
    } else if (status === "processing") {
      setRiderProgress(25);
    } else if (status === "shipped") {
      // Shipped means moving! Let's animate progress between 35% and 85% dynamically over time
      setRiderProgress(45);
      const interval = setInterval(() => {
        setRiderProgress((prev) => {
          let next = prev + 1.5;
          if (next > 85) next = 35; // Loop the delivery motion
          return next;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else if (status === "delivered" || status === "completed") {
      setRiderProgress(100);
    } else {
      setRiderProgress(0);
    }
  }, [order?.status]);

  const handleCallRider = () => {
    setCallRiderToast(true);
    setTimeout(() => {
      setCallRiderToast(false);
    }, 4000);
  };

  const isShipped = order?.status?.toLowerCase() === "shipped";
  const isDelivered = order?.status?.toLowerCase() === "completed" || order?.status?.toLowerCase() === "delivered";

  // Coordinates on our beautiful SVG vector grid:
  // Central Hub: (40, 160)
  // Sorting Station: (180, 100)
  // Destination: (340, 120)
  const pathData = "M 40,160 Q 110,60 180,100 T 340,120"; // Smooth Bezier curve path representing the city logistics routing map

  // Simple math to calculate current (X, Y) along path for the rider
  const getCoordinatesAtProgress = (pct: number) => {
    const t = pct / 100;
    if (t <= 0.5) {
      const u = t * 2; // scale to [0, 1]
      const x = (1 - u) * (1 - u) * 40 + 2 * (1 - u) * u * 110 + u * u * 180;
      const y = (1 - u) * (1 - u) * 160 + 2 * (1 - u) * u * 60 + u * u * 100;
      return { x, y };
    } else {
      const u = (t - 0.5) * 2; // scale to [0, 1]
      const x = (1 - u) * (1 - u) * 180 + 2 * (1 - u) * u * 250 + u * u * 340;
      const y = (1 - u) * (1 - u) * 100 + 2 * (1 - u) * u * 140 + u * u * 120;
      return { x, y };
    }
  };

  const riderCoords = getCoordinatesAtProgress(riderProgress);

  return (
    <div className="bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-sm font-sans flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
      {/* Visual Vector Map Canvas */}
      <div className="p-4 lg:p-5 flex-grow bg-slate-950 flex flex-col justify-between relative overflow-hidden h-72 lg:h-[300px]">
        {/* Absolute Background Grid lines for visual luxury */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 z-0 pointer-events-none" />

        {/* Header Labels */}
        <div className="flex justify-between items-center z-10 relative">
          <span className="text-[10px] font-bold text-slate-400 bg-slate-900/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${isShipped ? "bg-emerald-500 animate-ping" : isDelivered ? "bg-indigo-500" : "bg-amber-500"} block`} />
            {language === "bn" ? "লাইভ ট্র্যাকিং ম্যাপ" : "Live Logistics Route"}
          </span>
          <span className="text-[10px] text-slate-400 bg-slate-900/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-800 font-mono font-bold uppercase">
            {language === "bn" ? `অগ্রগতি: ${Math.round(riderProgress)}%` : `Progress: ${Math.round(riderProgress)}%`}
          </span>
        </div>

        {/* The SVG Canvas container */}
        <div className="flex-grow w-full relative z-10 flex items-center justify-center">
          <svg viewBox="0 0 380 220" className="w-full max-w-[380px] h-full max-h-[220px]">
            {/* Base road/transit path background */}
            <path
              d={pathData}
              fill="none"
              stroke="#334155"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Completed path progress overlay */}
            <path
              d={pathData}
              fill="none"
              stroke="#6366f1"
              strokeWidth="4"
              strokeDasharray="400"
              strokeDashoffset={400 - (400 * riderProgress) / 100}
              strokeLinecap="round"
              className="transition-all duration-300 ease-out"
            />
            {/* Dashed guide lines */}
            <path
              d={pathData}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="6,4"
              strokeLinecap="round"
              opacity="0.6"
            />

            {/* Central Hub Landmark Node */}
            <g transform="translate(40, 160)">
              <circle r="12" fill="#1e1b4b" stroke="#4f46e5" strokeWidth="2" className="animate-pulse" />
              <circle r="5" fill="#4f46e5" />
              <text y="-18" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold" className="font-sans">
                {language === "bn" ? "Motijheel Hub" : "Central Hub"}
              </text>
            </g>

            {/* Sorting Station Landmark Node */}
            <g transform="translate(180, 100)">
              <circle r="10" fill="#022c22" stroke="#059669" strokeWidth="1.5" />
              <circle r="4" fill="#059669" />
              <text y="-15" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold" className="font-sans">
                {language === "bn" ? "Tejgaon Hub" : "Transit Sorting"}
              </text>
            </g>

            {/* Destination Landmark Node */}
            <g transform="translate(340, 120)">
              <circle r="12" fill="#1e293b" stroke="#f43f5e" strokeWidth="2" />
              <path d="M-4,-4 L4,4 M4,-4 L-4,4" stroke="#f43f5e" strokeWidth="1.5" />
              <text y="-18" textAnchor="middle" fill="#f43f5e" fontSize="8" fontWeight="black" className="font-sans">
                {language === "bn" ? "গন্তব্য" : "Destination"}
              </text>
            </g>

            {/* Courier Rider Icon Group */}
            <g 
              transform={`translate(${riderCoords.x}, ${riderCoords.y})`}
              className="transition-all duration-300 ease-out cursor-pointer"
            >
              {isShipped && (
                <circle r="16" fill="#4f46e5" opacity="0.3" className="animate-ping" />
              )}
              <circle r="13" fill="#6366f1" stroke="#ffffff" strokeWidth="2" className="shadow-lg" />
              <g transform="translate(-6.5, -6.5)">
                <path
                  d="M1 3h7l3 3v4a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3zm10 3h1.5a.5.5 0 0 1 .5.5v3.5a.5.5 0 0 1-.5.5H11V6z"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <circle cx="3.5" cy="11.5" r="1.5" fill="#ffffff" />
                <circle cx="8.5" cy="11.5" r="1.5" fill="#ffffff" />
              </g>
            </g>
          </svg>
        </div>

        {/* Real-time Telemetry parameters footer */}
        <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-500 z-10 relative border-t border-slate-900 pt-2.5">
          <span>LAT: 23.7275° N • LON: 90.4106° E</span>
          <span className="text-emerald-400">
            {isShipped ? (language === "bn" ? "গতি: ২৮ কিমি/ঘন্টা" : "SPD: 28 km/h • ETA: 12m") : isDelivered ? (language === "bn" ? "পৌঁছেছে" : "ARRIVED") : (language === "bn" ? "প্রস্তুত হচ্ছে" : "PREPARING")}
          </span>
        </div>
      </div>

      {/* Courier Rider detail profile card */}
      <div className="p-5 w-full lg:w-72 shrink-0 bg-white flex flex-col justify-between space-y-4">
        <div className="text-left space-y-3">
          <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider block w-max">
            {language === "bn" ? "নিযুক্ত কুরিয়ার রাইডার" : "Courier Dispatch Profile"}
          </span>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border border-gray-100 text-slate-700 font-bold text-sm">
              KH
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 font-sans leading-none">
                {language === "bn" ? "কামরুল হাসান" : "Kamrul Hasan"}
              </h4>
              <span className="text-[10px] font-mono text-gray-400 block mt-1">ID: BD-RIDER-9042</span>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2 border-t border-b border-gray-50 py-3 text-left">
            <div>
              <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-wider">{language === "bn" ? "রাইডার রেটিং" : "Rider Rating"}</span>
              <span className="text-xs font-sans font-extrabold text-amber-500 mt-0.5 block flex items-center gap-0.5">★ 4.9</span>
            </div>
            <div>
              <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-wider">{language === "bn" ? "মোট ডেলিভারি" : "Total Trips"}</span>
              <span className="text-xs font-mono font-bold text-slate-800 mt-0.5 block">248+ Completed</span>
            </div>
          </div>

          {/* Live tracking logs */}
          <div className="space-y-1.5 text-left pt-1">
            <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-wider">{language === "bn" ? "রুট লগসমূহ" : "Log Dispatch Stream"}</span>
            <div className="text-[10px] text-gray-600 space-y-1">
              <p className="flex items-start gap-1 font-sans leading-tight">
                <span className="text-emerald-500 shrink-0 font-bold">•</span>
                <span>{language === "bn" ? "প্যাকেজটি হাব থেকে রিলিজ করা হয়েছে" : "02:14 PM - Dispatched from central hub"}</span>
              </p>
              {isShipped && (
                <p className="flex items-start gap-1 font-sans leading-tight text-indigo-600 animate-pulse font-medium">
                  <span className="text-indigo-600 shrink-0 font-bold">•</span>
                  <span>{language === "bn" ? "রাইডার ডেলিভারির উদ্দেশ্যে রওনা হয়েছেন" : "03:10 PM - Courier transit to destination"}</span>
                </p>
              )}
              {isDelivered && (
                <p className="flex items-start gap-1 font-sans leading-tight text-green-700 font-medium">
                  <span className="text-green-600 shrink-0 font-bold">•</span>
                  <span>{language === "bn" ? "ডেলিভারি সম্পন্ন করা হয়েছে" : "03:45 PM - Package successfully delivered"}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Quick interactions */}
        <div className="space-y-2 relative">
          <button
            onClick={handleCallRider}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] uppercase font-bold py-2.5 rounded-xl transition-all tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border-0"
          >
            <Phone className="h-3.5 w-3.5" />
            {language === "bn" ? "রাইডারকে কল করুন" : "Call Rider Hotline"}
          </button>
          
          {callRiderToast && (
            <div className="absolute bottom-11 left-0 right-0 bg-indigo-900 text-white text-[10px] font-sans font-semibold py-2 px-3 rounded-lg text-center shadow-lg animate-fade-in-up border border-indigo-700 z-50">
              {language === "bn" ? "কল করা হচ্ছে: +৮৮০১৭১২-৮৯৪৭৫১..." : "Calling Rider hotline +8801712-894751..."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
