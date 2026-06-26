import React, { useState, useEffect, useRef } from "react";
import { 
  X, Sparkles, Loader, Check, ShoppingBag, Plus, Eye, Award, 
  TrendingUp, Store, Coins, BarChart, Settings, AlertCircle, 
  Trash2, Edit, Upload, Image, Truck, Calendar, User, Phone, 
  MapPin, Bike, CheckSquare, Package, Clock, ArrowLeft, ExternalLink, Navigation,
  Video, VideoOff, Mic, MicOff, Radio, Users, Heart, Play, Square, Send
} from "lucide-react";
import { motion } from "motion/react";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { doc, setDoc, collection, onSnapshot, updateDoc, addDoc, query, orderBy, limit, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Product, Order } from "../types";
import { useToast } from "../context/ToastContext";
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, PieChart as RechartsPieChart, Pie, Cell } from "recharts";

interface AutoDescriptionProps {
  onClose?: () => void;
  onProductPublished: (newProduct: Product) => void;
  isFullPage?: boolean;
  language: "bn" | "en";
}

export default function AutoDescription({ 
  onClose, 
  onProductPublished, 
  isFullPage = false,
  language
}: AutoDescriptionProps) {
  const { toast } = useToast();
  
  // Seller Hub View tabs: 'dashboard' | 'publish' | 'settings' | 'orders' | 'live'
  const [sellerTab, setSellerTab] = useState<"dashboard" | "publish" | "settings" | "orders" | "live">("dashboard");

  // Live Streaming States
  const [isLiveBroadcasting, setIsLiveBroadcasting] = useState(false);
  const [liveStreamId, setLiveStreamId] = useState<string | null>(null);
  const [liveStreamTitle, setLiveStreamTitle] = useState("");
  const [liveStreamTitleBn, setLiveStreamTitleBn] = useState("");
  const [liveFeaturedProductIds, setLiveFeaturedProductIds] = useState<string[]>([]);
  const [liveSourceType, setLiveSourceType] = useState<"webcam" | "file">("webcam");
  const [liveVideoFile, setLiveVideoFile] = useState<File | null>(null);
  const [liveVideoUrl, setLiveVideoUrl] = useState("");
  const [liveWebcamStream, setLiveWebcamStream] = useState<MediaStream | null>(null);
  const [liveMicEnabled, setLiveMicEnabled] = useState(true);
  const [liveCameraEnabled, setLiveCameraEnabled] = useState(true);
  const [liveViewersCount, setLiveViewersCount] = useState(0);
  const [liveChatMessages, setLiveChatMessages] = useState<any[]>([]);
  const [newLiveChatMessage, setNewLiveChatMessage] = useState("");
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [cameraAttemptFailed, setCameraAttemptFailed] = useState(false);

  const liveWebcamVideoRef = useRef<HTMLVideoElement>(null);
  const liveChatEndRef = useRef<HTMLDivElement>(null);

  // Vendor Profile State
  const [shopName, setShopName] = useState(() => {
    return localStorage.getItem("vendor_shop_name") || (language === "bn" ? "বেঙ্গল এলিট টেক সোর্স" : "Bengal Elite Tech Source");
  });
  const [vendorTier, setVendorTier] = useState(() => {
    return localStorage.getItem("vendor_tier") || "Platinum Verified Seller";
  });
  const [shopAddress, setShopAddress] = useState(() => {
    return localStorage.getItem("vendor_address") || "Level 4, Multiplan Center, Dhaka";
  });

  // Local inventory lists for dashboard view
  const [vendorProducts, setVendorProducts] = useState<Product[]>([]);

  // Seller Orders & Courier assignment states
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningOrder, setAssigningOrder] = useState<Order | null>(null);

  // Assignment fields
  const [courierUid, setCourierUid] = useState("");
  const [courierName, setCourierName] = useState("Bazar Limited Rider 1");
  const [customNotes, setCustomNotes] = useState("");

  // Listen to all orders real-time
  useEffect(() => {
    try {
      const q = collection(db, "orders");
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Order);
        });
        // Sort by newest
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAllOrders(list);
      }, (error) => {
        console.warn("Could not read orders in AutoDescription:", error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Error setting up orders listener in AutoDescription:", e);
    }
  }, []);

  // Product publish states
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("10");
  const [imageUrl, setImageUrl] = useState("");
  const [features, setFeatures] = useState("");
  
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Custom photo upload states
  const [imageUploadType, setImageUploadType] = useState<"file" | "url">("file");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setAlert({
          type: "error",
          text: language === "bn" 
            ? "ফাইলের সাইজ ৫ মেগাবাইটের কম হতে হবে।" 
            : "File size must be under 5MB."
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setAlert({
          type: "error",
          text: language === "bn" 
            ? "ফাইলের সাইজ ৫ মেগাবাইটের কম হতে হবে।" 
            : "File size must be under 5MB."
        });
        return;
      }
      if (!file.type.startsWith("image/")) {
        setAlert({
          type: "error",
          text: language === "bn"
            ? "শুধুমাত্র ছবি আপলোড করা যাবে।"
            : "Only image files are allowed."
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Load dynamically published vendor products from Firestore or fallback
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
        const list: Product[] = [];
        snapshot.forEach((doc) => {
          const p = doc.data() as Product;
          list.push(p);
        });
        setVendorProducts(list);
      }, (err) => {
        console.warn("Firestore access error on Seller Hub inventory load, using defaults.", err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firestore not initialized on Seller Hub", e);
    }
  }, []);

  // Handle binding of the webcam video preview in the seller section
  useEffect(() => {
    if (liveWebcamVideoRef.current && liveWebcamStream) {
      liveWebcamVideoRef.current.srcObject = liveWebcamStream;
    }
  }, [liveWebcamStream, sellerTab, isLiveBroadcasting]);

  // Auto-scroll broadcaster live chat
  useEffect(() => {
    if (liveChatEndRef.current) {
      liveChatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [liveChatMessages]);

  // Listen to Firestore live chats for the broadcaster
  useEffect(() => {
    if (!isLiveBroadcasting || !liveStreamId) return;

    try {
      const chatsRef = collection(db, "live_chats");
      const q = query(chatsRef, orderBy("timestamp", "asc"), limit(50));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs: any[] = [];
        snapshot.forEach((doc) => {
          const d = doc.data();
          if (d.streamId === liveStreamId) {
            msgs.push({
              id: doc.id,
              user: d.user,
              text: d.text,
              userId: d.userId,
              timestamp: d.timestamp
            });
          }
        });
        setLiveChatMessages(msgs);
      }, (err) => {
        console.warn("Broadcaster live chat listener error:", err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Error setting up broadcaster chat listener:", e);
    }
  }, [isLiveBroadcasting, liveStreamId]);

  // Simulate active viewers and mock buyer questions periodically
  useEffect(() => {
    if (!isLiveBroadcasting || !liveStreamId) return;

    // Set initial viewer count
    setLiveViewersCount(15);

    // Periodically update viewer count
    const viewerInterval = setInterval(() => {
      setLiveViewersCount(prev => {
        const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
        const next = prev + change;
        return next < 5 ? 5 : next;
      });
    }, 4000);

    // Periodically add simulated messages to Firestore live chat to make the live streams real
    const mockCommenters = ["Anik Rahman", "Nabila Tabassum", "Samiul Sifat", "Amina Begum", "Robiul Robin"];
    const mockCommentsBn = [
      "ভাইয়া, এইটার প্রাইজ কত?",
      "স্টক কি লিমিটেড?",
      "ডেলিভারি চার্জ কত ঢাকাতে?",
      "আমি একটা অর্ডার করতে চাই",
      "লাইভ রিভিউ খুব সুন্দর হচ্ছে!"
    ];
    const mockCommentsEn = [
      "What is the price of this product?",
      "Is shipping fast to Chittagong?",
      "Is the stock limited?",
      "Just placed an order, please review it!",
      "Super clear video preview!"
    ];

    const chatInterval = setInterval(async () => {
      // 20% chance to append a message every 6 seconds
      if (Math.random() > 0.3) {
        const userIdx = Math.floor(Math.random() * mockCommenters.length);
        const commentIdx = Math.floor(Math.random() * mockCommentsBn.length);
        const userName = mockCommenters[userIdx];
        const commentText = language === "bn" ? mockCommentsBn[commentIdx] : mockCommentsEn[commentIdx];

        try {
          await addDoc(collection(db, "live_chats"), {
            streamId: liveStreamId,
            user: userName,
            text: commentText,
            userId: `mock-${Date.now()}`,
            timestamp: serverTimestamp()
          });
        } catch (err) {
          console.warn("Failed to add simulated chat message:", err);
        }
      }
    }, 6000);

    return () => {
      clearInterval(viewerInterval);
      clearInterval(chatInterval);
    };
  }, [isLiveBroadcasting, liveStreamId, language]);

  // Handle Requesting Camera Permission
  const requestCameraPermission = async () => {
    setPermissionRequested(true);
    try {
      const constraints = {
        video: true,
        audio: true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLiveWebcamStream(stream);
      setPermissionStatus("granted");
      setCameraAttemptFailed(false);
      toast(
        language === "bn" ? "ক্যামেরা ও মাইক্রোফোন অনুমতি সফল হয়েছে!" : "Camera and Mic permission granted successfully!",
        "success"
      );
    } catch (err) {
      console.warn("Camera permission failed or restricted inside iframe:", err);
      setPermissionStatus("denied");
      setCameraAttemptFailed(true);
      toast(
        language === "bn" 
          ? "আইফ্রেম বা ব্রাউজার সিকিউরিটির কারণে সরাসরি ক্যামেরা এক্সেস পাওয়া যায়নি। আপনার সুবিধার্থে একটি চমৎকার ডেমো লাইভ ফিড ব্যবহার করা হবে।" 
          : "Direct webcam access is restricted inside sandbox iframes. We will fallback to a premium live feed demo stream!",
        "info"
      );
    }
  };

  // Start the live broadcast session
  const handleStartBroadcast = async () => {
    if (!liveStreamTitle.trim()) {
      toast(
        language === "bn" ? "অনুগ্রহ করে লাইভ স্ট্রিমের একটি টাইটেল দিন।" : "Please provide a title for the live stream.",
        "error"
      );
      return;
    }

    if (liveFeaturedProductIds.length === 0) {
      toast(
        language === "bn" ? "অনুগ্রহ করে অন্তত ১টি ফিচারড পণ্য নির্বাচন করুন।" : "Please select at least 1 featured product.",
        "error"
      );
      return;
    }

    // Determine the video feed URL
    let finalVideoUrl = "https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c054273b167c3681b66e1d2c0d1e28ef&profile_id=139&oauth2_token_id=57447761"; // Default Tech unboxing video url

    if (liveSourceType === "file") {
      if (liveVideoFile) {
        finalVideoUrl = URL.createObjectURL(liveVideoFile);
      } else if (liveVideoUrl.trim()) {
        finalVideoUrl = liveVideoUrl.trim();
      } else {
        toast(
          language === "bn" 
            ? "কোনো ভিডিও ফাইল বা লিংক দেওয়া হয়নি! ডিফল্ট ফিড নিয়ে স্ট্রিম শুরু হচ্ছে।" 
            : "No video source provided. Starting with high-fidelity default feed.",
          "info"
        );
      }
    }

    const streamId = `stream-seller-${Date.now()}`;
    const streamTitleBn = liveStreamTitleBn.trim() || liveStreamTitle.trim();

    try {
      // Save stream session to Firestore "live_streams" collection
      await setDoc(doc(db, "live_streams", streamId), {
        id: streamId,
        title: liveStreamTitle.trim(),
        titleBn: streamTitleBn,
        sellerName: shopName,
        sellerAvatar: shopName.substring(0, 2).toUpperCase(),
        viewersCount: 1,
        featuredProductIds: liveFeaturedProductIds,
        videoUrl: finalVideoUrl,
        isBroadcasting: true,
        createdAt: new Date().toISOString()
      });

      setLiveStreamId(streamId);
      setIsLiveBroadcasting(true);
      toast(
        language === "bn" ? "আপনার লাইভ ব্রডকাস্ট সফলভাবে শুরু হয়েছে!" : "Your live broadcast has started successfully!",
        "success"
      );
    } catch (err) {
      console.error("Error creating live stream session in Firestore:", err);
      toast(
        language === "bn" ? "লাইভ স্ট্রিম তৈরি করতে সমস্যা হয়েছে।" : "Failed to initialize live stream session.",
        "error"
      );
    }
  };

  // Stop the active live broadcast session
  const handleStopBroadcast = async () => {
    if (!liveStreamId) return;

    try {
      // Update or delete the stream session in Firestore
      await updateDoc(doc(db, "live_streams", liveStreamId), {
        isBroadcasting: false
      });
      
      // Stop webcam stream tracks if running
      if (liveWebcamStream) {
        liveWebcamStream.getTracks().forEach(track => track.stop());
        setLiveWebcamStream(null);
      }

      setIsLiveBroadcasting(false);
      setLiveStreamId(null);
      setPermissionStatus("idle");
      setPermissionRequested(false);
      setLiveChatMessages([]);
      
      toast(
        language === "bn" ? "লাইভ ব্রডকাস্ট সফলভাবে সমাপ্ত হয়েছে।" : "Live broadcast ended successfully.",
        "success"
      );
    } catch (err) {
      console.error("Error stopping live stream session:", err);
      toast(
        language === "bn" ? "লাইভ স্ট্রিম বন্ধ করতে সমস্যা হয়েছে।" : "Error ending live stream session.",
        "error"
      );
    }
  };

  // Broadcaster sending chat message
  const sendBroadcasterChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLiveChatMessage.trim() || !liveStreamId) return;

    try {
      await addDoc(collection(db, "live_chats"), {
        streamId: liveStreamId,
        user: `${shopName} (Seller)`,
        text: newLiveChatMessage.trim(),
        userId: auth.currentUser?.uid || "broadcaster",
        timestamp: serverTimestamp()
      });
      setNewLiveChatMessage("");
    } catch (err) {
      console.warn("Failed to post broadcaster chat message:", err);
    }
  };

  const saveVendorSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("vendor_shop_name", shopName);
    localStorage.setItem("vendor_address", shopAddress);
    setAlert({
      type: "success",
      text: language === "bn" ? "মার্চেন্ট সেটিংস সফলভাবে সংরক্ষণ করা হয়েছে!" : "Vendor details updated successfully!"
    });
    setSellerTab("dashboard");
  };

  const generateAIDescription = async () => {
    if (!name.trim()) {
      setAlert({ 
        type: "error", 
        text: language === "bn" ? "AI বর্ণনা তৈরির আগে অনুগ্রহ করে পণ্যের নাম লিখুন।" : "Please enter a product name first before generating descriptions." 
      });
      return;
    }
    setIsGenerating(true);
    setAlert(null);

    try {
      const response = await fetch("/api/gemini/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, features })
      });

      if (!response.ok) {
        throw new Error("AI Description generator failed");
      }

      const data = await response.json();
      setDescription(data.description || "No description returned");
    } catch (error: any) {
      console.error("Description generator error:", error);
      setAlert({ 
        type: "error", 
        text: language === "bn" 
          ? "AI বিবরণ তৈরি করতে ব্যর্থ হয়েছে। চেক করুন API কী সঠিক কিনা।" 
          : "Failed to generate AI description. Make sure process.env.GEMINI_API_KEY is configured." 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const publishProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || !imageUrl.trim() || !description.trim()) {
      setAlert({ 
        type: "error", 
        text: language === "bn" ? "অনুগ্রহ করে সব তারকা চিহ্নিত (*) তথ্য পূরণ করুন এবং বিবরণ লিখুন।" : "Please fill out all required fields and generate/write a description." 
      });
      return;
    }

    setIsPublishing(true);
    setAlert(null);

    const productId = `prod-${Date.now()}`;
    const newProduct: Product = {
      id: productId,
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category,
      imageUrl: imageUrl.trim(),
      stock: parseInt(stock) || 10,
      rating: 5.0, // Initial perfect rating
      createdAt: new Date().toISOString()
    };

    try {
      const docRef = doc(db, "products", productId);
      await setDoc(docRef, newProduct);
      
      onProductPublished(newProduct);
      setAlert({ 
        type: "success", 
        text: language === "bn" 
          ? "পণ্যটি সফলভাবে প্রকাশিত হয়েছে! এটি এখন মূল ক্যাটালগে দৃশ্যমান।" 
          : "Product published successfully! It is now active in the main catalog." 
      });
      
      // Reset form
      setName("");
      setPrice("");
      setFeatures("");
      setDescription("");
      setImageUrl("");
    } catch (error: any) {
      console.error("Failed to publish product:", error);
      // Graceful local addition if offline / Firebase config not completed yet
      newProduct.id = `${productId}-local`;
      onProductPublished(newProduct);
      setAlert({ 
        type: "success", 
        text: language === "bn" 
          ? "পণ্যটি স্থানীয়ভাবে যোগ করা হয়েছে! (ফায়ারবেস রাইট এরর)" 
          : "Product added locally! (Firebase terms pending activation)" 
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const formContent = (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
      {/* LEFT COLUMN: Input form */}
      <div className="lg:col-span-7 space-y-4">
        {alert && (
          <div className={`px-4 py-3 rounded-2xl text-xs font-semibold ${
            alert.type === "success" ? "bg-green-50 border border-green-100 text-green-700" : "bg-red-50 border border-red-100 text-red-600"
          }`}>
            {alert.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {language === "bn" ? "পণ্যের নাম *" : "Product Name *"}
            </label>
            <input
              id="product-form-name"
              type="text"
              required
              placeholder="e.g. Amber Oak Scented Candle"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-gray-50/50 hover:bg-white focus:bg-white transition-all font-sans"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {language === "bn" ? "ক্যাটাগরি সিলেক্ট করুন *" : "Category *"}
            </label>
            <select
              id="product-form-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white font-sans"
            >
              <option>Electronics</option>
              <option>Footwear</option>
              <option>Accessories</option>
              <option>Home & Living</option>
              <option>Apparel</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Price */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {language === "bn" ? "মূল্য (₹ INR) *" : "Price (₹ INR) *"}
            </label>
            <input
              id="product-form-price"
              type="number"
              required
              min="1"
              placeholder="1200"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-gray-50/50 hover:bg-white focus:bg-white transition-all font-sans"
            />
          </div>

          {/* Stock */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {language === "bn" ? "স্টক সংখ্যা" : "Stock count"}
            </label>
            <input
              id="product-form-stock"
              type="number"
              min="0"
              placeholder="10"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-gray-50/50 hover:bg-white focus:bg-white transition-all font-sans"
            />
          </div>

          {/* Key Features/Keywords */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {language === "bn" ? "বৈশিষ্ট্য / কিওয়ার্ডস" : "Key Features / Keywords"}
            </label>
            <input
              id="product-form-features"
              type="text"
              placeholder="e.g. natural, soy, cardamom"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-gray-50/50 hover:bg-white focus:bg-white transition-all font-sans"
            />
          </div>
        </div>

        {/* Product Photo Selector / Upload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-gray-600">
              {language === "bn" ? "পণ্যের ছবি *" : "Product Image *"}
            </label>
            <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-150">
              <button
                type="button"
                onClick={() => setImageUploadType("file")}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  imageUploadType === "file"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {language === "bn" ? "ফটো আপলোড" : "Upload Photo"}
              </button>
              <button
                type="button"
                onClick={() => setImageUploadType("url")}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  imageUploadType === "url"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {language === "bn" ? "ইমেজ লিঙ্ক" : "Paste URL"}
              </button>
            </div>
          </div>

          {imageUploadType === "file" ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${
                isDragging
                  ? "border-indigo-500 bg-indigo-50/40"
                  : imageUrl && imageUrl.startsWith("data:")
                  ? "border-green-300 bg-green-50/10 hover:bg-green-50/20"
                  : "border-gray-200 hover:border-indigo-400 bg-gray-50/50 hover:bg-white"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {imageUrl && imageUrl.startsWith("data:") ? (
                <div className="space-y-2 flex flex-col items-center">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                    <img src={imageUrl} alt="Uploaded preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageUrl("");
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors shadow"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-[11px] font-bold text-green-700 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" />
                    {language === "bn" ? "ফটোটি সফলভাবে নির্বাচন করা হয়েছে!" : "Photo selected successfully!"}
                  </span>
                  <p className="text-[10px] text-gray-400">
                    {language === "bn" ? "পরিবর্তন করতে এখানে ক্লিক করুন বা ফাইল ড্রপ করুন" : "Click here or drag a new file to change"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="mx-auto h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-gray-700">
                      {language === "bn" ? "ডিভাইস থেকে ফাইল নির্বাচন করুন" : "Click to select a file"}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {language === "bn" ? "অথবা এখানে ড্র্যাগ অ্যান্ড ড্রপ করুন (সর্বোচ্চ ৫ মেগাবাইট)" : "or drag and drop here (max 5MB)"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <input
                id="product-form-image"
                type="url"
                required
                placeholder="e.g. https://images.unsplash.com/photo-..."
                value={imageUrl.startsWith("data:") ? "" : imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-gray-50/50 hover:bg-white focus:bg-white transition-all font-sans"
              />
              <p className="text-[9px] text-gray-400 font-sans ml-1">
                {language === "bn" ? "যেকোনো আনস্প্ল্যাশ বা ওয়েব ইমেজ লিঙ্ক ব্যবহার করতে পারেন।" : "Use any Unsplash or web image address."}
              </p>
            </div>
          )}
        </div>

        {/* Description Block */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-gray-600">
              {language === "bn" ? "পণ্যের বিবরণ *" : "Product Description *"}
            </label>
            <button
              id="generate-description-btn"
              type="button"
              onClick={generateAIDescription}
              disabled={isGenerating || !name.trim()}
              className="text-[10px] bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 px-3 py-1.5 rounded-full flex items-center gap-1 font-bold transition-all cursor-pointer font-sans"
            >
              {isGenerating ? <Loader className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-indigo-500" />}
              {language === "bn" ? "জেমিনি AI দিয়ে লিখুন" : "Auto-Generate with Gemini"}
            </button>
          </div>
          <textarea
            id="product-form-description"
            required
            rows={5}
            placeholder={
              language === "bn" 
                ? "পণ্যের বিবরণ লিখুন অথবা উপরের জেমিনি AI বাটনে ক্লিক করে স্বয়ংক্রিয়ভাবে প্রিমিয়াম কপি তৈরি করুন..." 
                : "Provide a description or use the auto-generate button to create a premium copy with Gemini..."
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 font-sans"
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          {onClose && !isFullPage && (
            <button
              id="cancel-publish-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl transition-colors font-sans"
            >
              {language === "bn" ? "বাতিল" : "Cancel"}
            </button>
          )}
          <button
            id="submit-publish-btn"
            type="submit"
            disabled={isPublishing || isGenerating}
            className="px-6 py-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md flex items-center gap-1.5 font-bold transition-colors disabled:opacity-50 cursor-pointer font-sans uppercase tracking-wide"
          >
            {isPublishing ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {language === "bn" ? "পণ্যটি পাবলিশ করুন" : "Publish Product"}
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Live Mockup Preview Card */}
      <div className="lg:col-span-5 space-y-4">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
          <Eye className="h-3.5 w-3.5 text-indigo-600" />
          {language === "bn" ? "রিয়েল-টাইম লাইভ প্রিভিউ" : "Interactive Live Mockup"}
        </span>

        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-xl p-5 relative group min-h-[420px] flex flex-col justify-between">
          <div className="space-y-4">
            {/* Mock image */}
            <div className="relative aspect-video rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback visual
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="text-center p-4">
                  <ShoppingBag className="h-10 w-10 text-gray-300 mx-auto animate-bounce" />
                  <p className="text-[10px] text-gray-400 font-sans mt-2">
                    {language === "bn" ? "ইমেজ লিঙ্ক যুক্ত করলে এখানে প্রিভিউ হবে" : "Image placeholder preview"}
                  </p>
                </div>
              )}
              <span className="absolute top-2.5 left-2.5 bg-indigo-600 text-white font-sans font-semibold text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-full shadow-md">
                {category}
              </span>
            </div>

            <div className="space-y-1 text-left">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">{category}</span>
              <h3 className="font-sans font-bold text-gray-900 text-base line-clamp-1">
                {name || (language === "bn" ? "অনিন্দ্য সুন্দর পণ্যের নাম" : "Your Product Title")}
              </h3>
              <p className="text-xs text-gray-500 font-sans line-clamp-4 leading-relaxed mt-1">
                {description || (language === "bn" ? "পণ্যের আকর্ষণীয় বিবরণ এখানে যুক্ত হবে..." : "Your professional product copywriting copy written by Gemini AI will update right here.")}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-50 flex items-center justify-between mt-4">
            <div className="text-left">
              <span className="text-[10px] text-gray-400 font-sans">Price</span>
              <p className="font-mono font-black text-lg text-gray-950 mt-0.5">
                ₹ {price ? parseFloat(price).toLocaleString("en-BD") : "0"}
              </p>
            </div>

            <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg">
              <span className="text-xs font-bold text-amber-800 font-sans flex items-center gap-1">
                ★ 5.0
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const handleQuickRestock = async (productId: string) => {
    try {
      const docRef = doc(db, "products", productId);
      await setDoc(docRef, { stock: 50 }, { merge: true });
      setVendorProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: 50 } : p));
    } catch (e) {
      console.warn("Could not restock on Firestore, doing offline restock", e);
      setVendorProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: 50 } : p));
    }
  };

  const dashboardTabContent = (() => {
    // 1. Bar Chart Data: Monthly Gross Sales Trend
    const monthlySalesData = [
      { name: language === "bn" ? "জানু" : "Jan", sales: 42000 },
      { name: language === "bn" ? "ফেব" : "Feb", sales: 60000 },
      { name: language === "bn" ? "মার্চ" : "Mar", sales: 85000 },
      { name: language === "bn" ? "এপ্রি" : "Apr", sales: 50000 },
      { name: language === "bn" ? "মে" : "May", sales: 112850 },
      { name: language === "bn" ? "জুন" : "Jun", sales: 75000 },
    ];

    // 2. Pie Chart Data: Category Contribution (Dynamic from vendorProducts)
    const categoryMap: Record<string, number> = {};
    vendorProducts.forEach(p => {
      const categoryName = p.category || "Other";
      categoryMap[categoryName] = (categoryMap[categoryName] || 0) + (Number(p.price || 0) * Number(p.stock || 0) * 0.15); // Simulated estimated revenue
    });
    
    let categorySalesData = Object.entries(categoryMap).map(([name, value]) => ({
      name: language === "bn" 
        ? (name === "Electronics" ? "ইলেকট্রনিক্স" : name === "Footwear" ? "জুতো" : name === "Apparel" ? "পোশাক" : name)
        : name,
      value: Math.round(value)
    }));

    if (categorySalesData.length === 0) {
      categorySalesData = [
        { name: language === "bn" ? "ইলেকট্রনিক্স" : "Electronics", value: 65000 },
        { name: language === "bn" ? "পোশাক" : "Apparel", value: 35000 },
        { name: language === "bn" ? "জুতো" : "Footwear", value: 25000 },
        { name: language === "bn" ? "হোম" : "Home & Kitchen", value: 18000 }
      ];
    }

    const PIE_COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

    return (
      <div className="space-y-6 text-left">
        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-tr from-indigo-500 to-indigo-600 p-5 rounded-2xl text-white shadow-md shadow-indigo-100 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">{language === "bn" ? "মোট বিক্রি" : "Total Revenue"}</span>
              <p className="text-xl font-black font-mono">₹ ৪,১২,৮৫০</p>
            </div>
            <Coins className="h-8 w-8 opacity-25" />
          </div>

          <div className="bg-white border border-gray-150 p-5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">{language === "bn" ? "মোট অর্ডার" : "Completed Orders"}</span>
              <p className="text-xl font-black text-gray-800 font-mono">১৮৪</p>
            </div>
            <TrendingUp className="h-8 w-8 text-emerald-500" />
          </div>

          <div className="bg-white border border-gray-150 p-5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">{language === "bn" ? "সক্রিয় পণ্য" : "Active Items"}</span>
              <p className="text-xl font-black text-gray-800 font-mono">{vendorProducts.length}</p>
            </div>
            <ShoppingBag className="h-8 w-8 text-indigo-500" />
          </div>

          <div className="bg-white border border-gray-150 p-5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">{language === "bn" ? "সেলার রেটিং" : "Seller Rating"}</span>
              <p className="text-xl font-black text-amber-500 font-sans flex items-center gap-1">
                ★ ৪.৯
              </p>
            </div>
            <Award className="h-8 w-8 text-amber-500 animate-pulse" />
          </div>
        </div>

        {/* Analytics Graph & Vendor info row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sales Performance Monthly Bars */}
          <div className="lg:col-span-6 bg-white border border-gray-150 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <h3 className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                <BarChart className="h-4.5 w-4.5 text-indigo-600" />
                {language === "bn" ? "মাসিক বিক্রয়ের গ্রাফ ও রিপোর্ট" : "Monthly Gross Sales Trend"}
              </h3>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold">
                {language === "bn" ? "লাইভ ট্র্যাকিং" : "Live Stats"}
              </span>
            </div>

            <div className="h-52 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={monthlySalesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹ ${v/1000}K`} />
                  <Tooltip 
                    formatter={(value: any) => [`₹ ${value.toLocaleString()}`, language === "bn" ? "বিক্রয়" : "Sales"]}
                    contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#fff", fontFamily: "sans-serif", fontSize: "11px" }}
                  />
                  <Bar dataKey="sales" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Distribution Pie Chart */}
          <div className="lg:col-span-3 bg-white border border-gray-150 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <h3 className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                <TrendingUp className="h-4.5 w-4.5 text-indigo-600" />
                {language === "bn" ? "ক্যাটেগরি ভিত্তিক আয়" : "Category Revenues"}
              </h3>
            </div>

            <div className="h-32 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={categorySalesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={48}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categorySalesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => `₹ ${value.toLocaleString()}`}
                    contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#fff", fontFamily: "sans-serif", fontSize: "10px" }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            {/* Micro legends */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-gray-500 max-h-16 overflow-y-auto pt-1 font-sans">
              {categorySalesData.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  <span className="truncate max-w-[80px]" title={item.name}>{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Shop Info Card */}
          <div className="lg:col-span-3 bg-white border border-gray-150 rounded-3xl p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-gray-500 uppercase tracking-widest">{language === "bn" ? "সেলার প্রোফাইল" : "Active Vendor Profile"}</h4>
              <div className="flex items-center gap-3">
                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-2xl">
                  <Store className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-sm text-gray-800">{shopName}</h3>
                  <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded-full mt-0.5">
                    <Award className="h-3 w-3" />
                    {vendorTier}
                  </span>
                </div>
              </div>
              <div className="border-t border-gray-50 pt-3 space-y-2 text-xs text-gray-600">
                <p><strong>{language === "bn" ? "ঠিকানা:" : "Pickup Hub:"}</strong> {shopAddress}</p>
              </div>
            </div>

            <button
              onClick={() => setSellerTab("settings")}
              className="w-full mt-4 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold py-2 px-3 rounded-xl text-[10px] uppercase tracking-wider transition-colors border border-gray-200 cursor-pointer text-center"
            >
              {language === "bn" ? "প্রোফাইল পরিবর্তন করুন" : "Edit Vendor Settings"}
            </button>
          </div>
        </div>

      {/* Active Inventory List */}
      <div className="bg-white border border-gray-150 rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-50 pb-3">
          <h3 className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
            <ShoppingBag className="h-4.5 w-4.5 text-indigo-600" />
            {language === "bn" ? "আপনার সক্রিয় পণ্য ও ইনভেন্টরি তালিকা" : "Published Inventory Management"}
          </h3>
          <button
            onClick={() => setSellerTab("publish")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            {language === "bn" ? "নতুন পণ্য যোগ করুন" : "Add New Item"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                <th className="pb-3 pt-1">{language === "bn" ? "পণ্য" : "Product Details"}</th>
                <th className="pb-3 pt-1">{language === "bn" ? "ক্যাটেগরি" : "Category"}</th>
                <th className="pb-3 pt-1">{language === "bn" ? "মূল্য" : "Price"}</th>
                <th className="pb-3 pt-1">{language === "bn" ? "ইনভেন্টরি স্টক" : "Stock Count"}</th>
                <th className="pb-3 pt-1 text-right">{language === "bn" ? "অ্যাকশন" : "Quick Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vendorProducts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 flex items-center gap-2.5">
                    <img src={p.imageUrl} className="h-10 w-10 rounded-lg object-cover border border-gray-100" />
                    <div>
                      <span className="font-bold text-gray-800 block line-clamp-1">{p.name}</span>
                      <span className="text-[10px] text-gray-400">★ {p.rating} (Verified)</span>
                    </div>
                  </td>
                  <td className="py-3 font-semibold text-gray-500">{p.category}</td>
                  <td className="py-3 font-mono font-bold text-gray-950 font-sans">₹ {p.price.toLocaleString("en-BD")}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      p.stock < 5 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                    }`}>
                      {p.stock} pcs {p.stock < 5 && `(${language === "bn" ? "অল্প স্টক" : "Low stock"})`}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => handleQuickRestock(p.id)}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded-lg text-[9px] uppercase tracking-wider transition-colors cursor-pointer border border-indigo-100"
                    >
                      {language === "bn" ? "স্টক রিসেট করুন" : "Quick Restock (50)"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    );
  })();

  const handleAssignCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningOrder) return;
    if (!courierUid.trim()) {
      toast(
        language === "bn" ? "দয়া করে রাইডার আইডি (UID) প্রদান করুন।" : "Please provide a Rider UID.",
        { type: "error" }
      );
      return;
    }

    try {
      const orderRef = doc(db, "orders", assigningOrder.id);
      await updateDoc(orderRef, {
        assignedCourierUid: courierUid,
        assignedCourierName: courierName,
        deliveryNotes: customNotes,
        status: "out_for_delivery", // Mark as out for delivery / transit instantly
        updatedAt: new Date().toISOString()
      });

      toast(
        language === "bn" 
          ? "অর্ডারটি সফলভাবে রাইডারের কাছে অ্যাসাইন করা হয়েছে!" 
          : "Order successfully assigned to courier!",
        { type: "success", title: language === "bn" ? "অ্যাসাইন সফল" : "Assigned Successfully" }
      );

      // Clean states
      setShowAssignModal(false);
      setAssigningOrder(null);
      setCustomNotes("");
    } catch (err) {
      console.error("Error assigning courier:", err);
      toast(
        language === "bn" ? "অ্যাসাইন করতে সমস্যা হয়েছে।" : "Failed to assign courier.",
        { type: "error" }
      );
    }
  };

  const ordersTabContent = (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left font-sans">
      {/* Left List of Orders */}
      <div className="lg:col-span-5 bg-white border border-gray-150 rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-50 pb-3">
          <h3 className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
            <Package className="h-4.5 w-4.5 text-indigo-600" />
            {language === "bn" ? "অর্ডার ট্র্যাকিং ও ম্যানেজমেন্ট" : "Store Inbound Orders"}
          </h3>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full">
            {allOrders.length} {language === "bn" ? "মোট" : "Total"}
          </span>
        </div>

        {allOrders.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-150 rounded-2xl bg-gray-50/20">
            <ShoppingBag className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">
              {language === "bn" ? "এখনো কোনো অর্ডার আসেনি।" : "No store orders available yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
            {allOrders.map((order) => {
              const isSelected = selectedOrder?.id === order.id;
              
              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`p-4 border rounded-2xl transition-all cursor-pointer text-left relative ${
                    isSelected 
                      ? "border-indigo-600 bg-indigo-50/10 ring-1 ring-indigo-600/20" 
                      : "border-gray-150 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-indigo-950 bg-indigo-50/60 px-2 py-0.5 rounded-lg">
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
                        ? (language === "bn" ? "চলমান" : "Transit")
                        : (language === "bn" ? "পেন্ডিং" : "Pending")
                      }
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-1 text-xs">
                    <p className="font-bold text-gray-800 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      {order.shippingAddress.fullName}
                    </p>
                    <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{order.shippingAddress.addressLine}, {order.shippingAddress.city}</span>
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[9px] text-gray-400 font-semibold block uppercase">
                        {language === "bn" ? "পেমেন্ট পরিমাণ" : "Invoice Value"}
                      </span>
                      <span className="font-mono font-bold text-gray-950">₹ {order.totalAmount.toLocaleString("en-BD")}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-gray-400 block font-semibold uppercase">
                        {language === "bn" ? "কুরিয়ার স্ট্যাটাস" : "Delivery Assignment"}
                      </span>
                      <span className={`text-[10px] font-bold ${order.assignedCourierUid ? "text-indigo-600" : "text-amber-600"}`}>
                        {order.assignedCourierUid 
                          ? `${order.assignedCourierName}` 
                          : (language === "bn" ? "অ্যাসাইনড নেই ⚠️" : "Unassigned ⚠️")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Details Panel */}
      <div className="lg:col-span-7">
        {selectedOrder ? (
          <div className="bg-white border border-gray-150 rounded-3xl p-5 md:p-6 text-left space-y-6">
            
            {/* Header Details */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block">
                  {language === "bn" ? "অর্ডার ট্র্যাকিং ও বিস্তারিত" : "Order Fulfillment Center"}
                </span>
                <h3 className="font-sans font-bold text-base text-gray-900 mt-0.5">
                  #{selectedOrder.id.toUpperCase()}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(selectedOrder.createdAt).toLocaleDateString(language === "bn" ? "bn-BD" : "en-US", {
                  year: "numeric", month: "long", day: "numeric"
                })}
              </div>
            </div>

            {/* Courier Assignment Section */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-indigo-100/50 pb-3">
                <Truck className="h-5 w-5 text-indigo-600" />
                <div>
                  <h4 className="font-bold text-xs text-indigo-950 uppercase tracking-wider">
                    {language === "bn" ? "কুরিয়ার এবং ডেলিভারি অ্যাসাইনমেন্ট" : "Courier Assignment & Tracking"}
                  </h4>
                  <p className="text-[10px] text-indigo-600">
                    {language === "bn" 
                      ? "পণ্য প্রস্তুত করে কুরিয়ারের কাছে হস্তান্তর করতে এখানে অ্যাসাইন করুন।" 
                      : "Assign a professional rider to deliver this package and track its status."}
                  </p>
                </div>
              </div>

              {selectedOrder.assignedCourierUid ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-3.5 rounded-xl border border-indigo-100/60 space-y-2 text-left">
                    <span className="text-[9px] text-indigo-400 font-black uppercase tracking-wider block">
                      {language === "bn" ? "অ্যাসাইনকৃত রাইডার" : "Assigned Rider"}
                    </span>
                    <p className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Bike className="h-4 w-4 text-indigo-600" />
                      {selectedOrder.assignedCourierName}
                    </p>
                    <p className="text-[10px] font-mono text-indigo-500/80 truncate">
                      UID: {selectedOrder.assignedCourierUid}
                    </p>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-indigo-100/60 space-y-2 flex flex-col justify-between text-left">
                    <div>
                      <span className="text-[9px] text-indigo-400 font-black uppercase tracking-wider block">
                        {language === "bn" ? "ডেলিভারি স্ট্যাটাস" : "Delivery Status"}
                      </span>
                      <p className="text-xs font-black text-indigo-950 mt-1 uppercase flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
                        {selectedOrder.status === 'completed' 
                          ? (language === "bn" ? "ডেলিভারড (সম্পন্ন) ✅" : "Delivered (Paid) ✅")
                          : (language === "bn" ? "রাস্তায় চলমান (Transit) 🚚" : "Out For Delivery (Transit) 🚚")
                        }
                      </p>
                    </div>
                    
                    {selectedOrder.status !== "completed" && (
                      <button
                        onClick={() => {
                          setAssigningOrder(selectedOrder);
                          setCourierUid(selectedOrder.assignedCourierUid || "");
                          setCourierName(selectedOrder.assignedCourierName || "Bazar Limited Rider 1");
                          setCustomNotes(selectedOrder.deliveryNotes || "");
                          setShowAssignModal(true);
                        }}
                        className="text-left text-[9px] font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        {language === "bn" ? "রাইডার পরিবর্তন করুন" : "Re-assign or Edit Assignment"}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-4 text-center space-y-3">
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1">
                    ⚠️ {language === "bn" ? "এই অর্ডারটি এখনো কোনো কুরিয়ার বয়ের কাছে অ্যাসাইন করা হয়নি।" : "This order has not been assigned to any courier yet."}
                  </p>
                  <button
                    onClick={() => {
                      setAssigningOrder(selectedOrder);
                      setCourierUid("");
                      setCourierName("Bazar Limited Rider 1");
                      setCustomNotes("");
                      setShowAssignModal(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded-xl text-xs uppercase tracking-wide cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                  >
                    <Truck className="h-4 w-4" />
                    {language === "bn" ? "কুরিয়ার বা ডেলিভারি অ্যাসাইন করুন" : "Assign Courier Rider Now"}
                  </button>
                </div>
              )}
            </div>

            {/* Recipient Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-100 bg-gray-50/30 rounded-2xl p-4 space-y-2 text-left">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                  {language === "bn" ? "গ্রাহকের তথ্য" : "Customer Shipping Details"}
                </span>
                <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-gray-400" />
                  {selectedOrder.shippingAddress.fullName}
                </p>
                <p className="text-xs text-gray-600 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                  {selectedOrder.shippingAddress.phone}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1.5 leading-relaxed">
                  <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span>{selectedOrder.shippingAddress.addressLine}, {selectedOrder.shippingAddress.city}</span>
                </p>
              </div>

              <div className="border border-gray-100 bg-gray-50/30 rounded-2xl p-4 space-y-2 flex flex-col justify-between text-left">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                    {language === "bn" ? "পেমেন্ট সারাংশ" : "Payment Ledger Summary"}
                  </span>
                  <span className="text-base font-mono font-black text-gray-950 mt-1 block">
                    ₹ {selectedOrder.totalAmount.toLocaleString("en-BD")}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 inline-block ${
                    selectedOrder.paymentStatus === 'paid' ? "text-green-700 bg-green-50 px-2 py-0.5 rounded-lg" : "text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg"
                  }`}>
                    {selectedOrder.paymentStatus === 'paid' ? (language === "bn" ? "পরিশোধিত" : "PAID") : (language === "bn" ? "বকেয়া (COD)" : "UNPAID")}
                  </span>
                </div>
              </div>
            </div>

            {/* Items breakdown list */}
            <div className="border border-gray-150 rounded-2xl p-4 space-y-3 bg-white">
              <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider text-left">
                {language === "bn" ? "অর্ডারের অন্তর্ভুক্ত পণ্যসমূহ" : "Package Inclusions & Items List"}
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

          </div>
        ) : (
          <div className="h-full min-h-[480px] bg-white border border-gray-150 rounded-3xl flex flex-col items-center justify-center p-8 text-center space-y-3 shadow-sm border-dashed">
            <div className="bg-indigo-50 p-4 rounded-full text-indigo-600 animate-bounce" style={{ animationDuration: "2s" }}>
              <Package className="h-10 w-10" />
            </div>
            <h3 className="font-sans font-bold text-gray-800 text-sm">
              {language === "bn" ? "একটি অর্ডার নির্বাচন করুন" : "Select an Order to Deliver"}
            </h3>
            <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
              {language === "bn" 
                ? "বাম পাশের পেন্ডিং বা পেইড কাস্টমার তালিকা থেকে অর্ডার সিলেক্ট করুন। এতে কুরিয়ার এসাইনমেন্ট প্রক্রিয়া চালু হবে।" 
                : "Select any active customer invoice from the left panel to execute Courier allocations."}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const liveTabContent = (
    <div className="space-y-6 text-left">
      {!isLiveBroadcasting ? (
        /* SETUP BROADCAST MODE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Broadcaster Configuration Form */}
          <div className="lg:col-span-7 bg-white border border-gray-100 p-6 rounded-3xl shadow-xs space-y-5">
            <div className="border-b border-gray-50 pb-3 flex items-center gap-2">
              <Radio className="h-5 w-5 text-indigo-600 animate-pulse" />
              <h3 className="font-sans font-bold text-base text-gray-800">
                {language === "bn" ? "নতুন লাইভ স্ট্রিম সেটআপ করুন" : "Setup New Live Stream"}
              </h3>
            </div>

            {/* Stream Title Inputs */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                  {language === "bn" ? "লাইভ স্ট্রিম টাইটেল (English)" : "Stream Title (English)"}
                </label>
                <input
                  type="text"
                  value={liveStreamTitle}
                  onChange={(e) => setLiveStreamTitle(e.target.value)}
                  placeholder="e.g. Unboxing Next-Gen Mechanical Keyboards!"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-sans focus:outline-none focus:border-indigo-500 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                  {language === "bn" ? "লাইভ স্ট্রিম টাইটেল (বাংলা - ঐচ্ছিক)" : "Stream Title (Bengali - Optional)"}
                </label>
                <input
                  type="text"
                  value={liveStreamTitleBn}
                  onChange={(e) => setLiveStreamTitleBn(e.target.value)}
                  placeholder="যেমন: নতুন মেকানিক্যাল কিবোর্ড আনবক্সিং এবং লাইভ রিভিউ!"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-sans focus:outline-none focus:border-indigo-500 bg-white"
                />
              </div>
            </div>

            {/* Video Source Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                {language === "bn" ? "ব্রডকাস্ট সোর্স নির্বাচন করুন" : "Select Broadcast Source"}
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLiveSourceType("webcam")}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all border-0 cursor-pointer ${
                    liveSourceType === "webcam"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-transparent text-gray-500 hover:text-gray-950"
                  }`}
                >
                  <Video className="inline h-3.5 w-3.5 mr-1" />
                  {language === "bn" ? "ক্যামেরা ও মাইক" : "Webcam & Microphone"}
                </button>
                <button
                  type="button"
                  onClick={() => setLiveSourceType("file")}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all border-0 cursor-pointer ${
                    liveSourceType === "file"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-transparent text-gray-500 hover:text-gray-955"
                  }`}
                >
                  <Plus className="inline h-3.5 w-3.5 mr-1" />
                  {language === "bn" ? "ভিডিও ফাইল / লিংক" : "Video File / Link"}
                </button>
              </div>
            </div>

            {/* Conditional Inputs */}
            {liveSourceType === "file" && (
              <div className="border border-gray-100 p-4 rounded-2xl bg-gray-50/50 space-y-3">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-gray-700 block">
                    {language === "bn" ? "১. ভিডিও ফাইল সিলেক্ট করুন (.mp4)" : "1. Select MP4 Video File:"}
                  </span>
                  <label className="cursor-pointer bg-white border border-gray-200 hover:border-indigo-500 rounded-xl px-3 py-2 flex items-center justify-between gap-2 transition-all">
                    <span className="text-[11px] font-sans text-gray-500 truncate max-w-[200px]">
                      {liveVideoFile ? `✓ ${liveVideoFile.name}` : (language === "bn" ? "কম্পিউটার থেকে ব্রাউজ করুন..." : "Browse from device...")}
                    </span>
                    <span className="bg-indigo-55 text-indigo-700 text-[10px] font-extrabold px-2 py-1 rounded-lg shrink-0">
                      {language === "bn" ? "ফাইল খুঁজুন" : "Browse File"}
                    </span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setLiveVideoFile(file);
                      }}
                    />
                  </label>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink mx-2 text-[10px] text-gray-400 font-bold uppercase">{language === "bn" ? "অথবা" : "OR"}</span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-gray-700 block">
                    {language === "bn" ? "২. পাবলিক ডাইরেক্ট লিংক (MP4 URL)" : "2. Direct Video URL (MP4 Link):"}
                  </span>
                  <input
                    type="url"
                    value={liveVideoUrl}
                    onChange={(e) => setLiveVideoUrl(e.target.value)}
                    placeholder="https://example.com/live_broadcast_source.mp4"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-sans focus:outline-none focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>
            )}

            {/* Showcase Featured Products Checklist */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">
                {language === "bn" ? "লাইভে ফিচার করার জন্য পণ্য নির্বাচন করুন" : "Select Featured Products for Stream"}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                {vendorProducts.map((p) => {
                  const isChecked = liveFeaturedProductIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-2.5 p-2.5 border rounded-xl cursor-pointer transition-all ${
                        isChecked 
                          ? "border-indigo-500 bg-indigo-50/20" 
                          : "border-gray-100 hover:border-gray-200 bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setLiveFeaturedProductIds(prev => prev.filter(id => id !== p.id));
                          } else {
                            setLiveFeaturedProductIds(prev => [...prev, p.id]);
                          }
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="h-8 w-8 rounded-lg object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 text-left">
                        <p className="text-[11px] font-bold text-gray-800 truncate">{p.name}</p>
                        <p className="text-[10px] text-gray-500 font-medium">৳{p.price}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              {vendorProducts.length === 0 && (
                <p className="text-xs text-gray-400 font-medium">
                  {language === "bn" ? "কোনো পণ্য খুঁজে পাওয়া যায়নি। আগে পণ্য পাবলিশ করুন!" : "No products found in inventory. Please publish a product first."}
                </p>
              )}
            </div>

            {/* Launch Broadcasting Control */}
            <button
              onClick={handleStartBroadcast}
              className="w-full bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-700 hover:to-indigo-700 text-white font-bold py-3 px-5 rounded-xl text-xs transition-all cursor-pointer shadow-md text-center flex items-center justify-center gap-2"
            >
              <Radio className="h-4 w-4" />
              {language === "bn" ? "লাইভ ব্রডকাস্ট শুরু করুন" : "Go Live Now"}
            </button>
          </div>

          {/* Stream Preview Panel */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-6 rounded-3xl text-center text-white flex flex-col justify-between min-h-[400px]">
            <div className="space-y-1.5 text-left border-b border-slate-800 pb-3">
              <h3 className="font-sans font-extrabold text-sm text-indigo-400 tracking-wider uppercase">
                {language === "bn" ? "ব্রডকাস্ট প্রিভিউ মনিটর" : "Stream Preview Monitor"}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">
                {language === "bn" ? "লাইভে যাওয়ার আগে ক্যামেরা এবং মাইক্রোফোন পরীক্ষা করুন।" : "Initialize and verify your feeds before going live."}
              </p>
            </div>

            <div className="flex-grow my-4 flex items-center justify-center relative rounded-2xl bg-slate-950 overflow-hidden border border-slate-800/80 min-h-[220px]">
              {liveSourceType === "webcam" && liveWebcamStream ? (
                <video
                  ref={liveWebcamVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : liveSourceType === "file" && liveVideoFile ? (
                <div className="text-center space-y-2 p-4">
                  <Video className="h-10 w-10 text-emerald-400 mx-auto animate-pulse" />
                  <p className="text-xs font-bold text-white truncate max-w-[220px]">✓ {liveVideoFile.name}</p>
                  <p className="text-[10px] text-slate-400">{language === "bn" ? "সরাসরি ব্রডকাস্টে এটি প্লে হবে" : "This file is ready to broadcast!"}</p>
                </div>
              ) : liveSourceType === "file" && liveVideoUrl.trim() ? (
                <div className="text-center space-y-2 p-4">
                  <ExternalLink className="h-10 w-10 text-emerald-400 mx-auto animate-pulse" />
                  <p className="text-xs font-bold text-white truncate max-w-[220px]">{liveVideoUrl}</p>
                  <p className="text-[10px] text-slate-400">{language === "bn" ? "এক্সটার্নাল লিঙ্ক রেডি" : "External direct URL loaded!"}</p>
                </div>
              ) : (
                <div className="text-center p-6 space-y-3 z-10">
                  <div className="h-12 w-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto">
                    <Video className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-xs font-bold text-slate-300">
                    {language === "bn" ? "কোনো ফিড সোর্স একটিভ নেই" : "No Live Feed Active"}
                  </p>
                  <p className="text-[10px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                    {liveSourceType === "webcam" 
                      ? (language === "bn" ? "নিচের বাটনে ক্লিক করে ক্যামেরা ও মাইকের পারমিশন দিন।" : "Grant camera and microphone permissions via the setup button below.")
                      : (language === "bn" ? "বাম পাশে ভিডিও আপলোড অথবা একটি পাবলিক MP4 লিঙ্ক দিন।" : "Please specify a direct MP4 link or select an MP4 file on the left.")
                    }
                  </p>
                </div>
              )}

              {/* Status Tags */}
              <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-[9px] font-bold py-1 px-2.5 rounded-lg border border-slate-800 text-slate-300">
                {liveSourceType === "webcam" ? "WEBCAM PREVIEW" : "FILE PREVIEW"}
              </div>
            </div>

            {liveSourceType === "webcam" && (
              <div className="space-y-3">
                {permissionStatus !== "granted" ? (
                  <button
                    onClick={requestCameraPermission}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Check className="h-4 w-4" />
                    {language === "bn" ? "ক্যামেরা ও মাইক টেস্ট করুন" : "Initialize Camera & Mic"}
                  </button>
                ) : (
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setLiveCameraEnabled(!liveCameraEnabled);
                        if (liveWebcamStream) {
                          liveWebcamStream.getVideoTracks().forEach(track => track.enabled = !liveCameraEnabled);
                        }
                      }}
                      className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors ${
                        liveCameraEnabled ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {liveCameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                      {liveCameraEnabled ? (language === "bn" ? "ক্যামেরা বন্ধ" : "Camera On") : (language === "bn" ? "ক্যামেরা চালু" : "Camera Off")}
                    </button>
                    <button
                      onClick={() => {
                        setLiveMicEnabled(!liveMicEnabled);
                        if (liveWebcamStream) {
                          liveWebcamStream.getAudioTracks().forEach(track => track.enabled = !liveMicEnabled);
                        }
                      }}
                      className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors ${
                        liveMicEnabled ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {liveMicEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                      {liveMicEnabled ? (language === "bn" ? "মাইক বন্ধ" : "Mic On") : (language === "bn" ? "মাইক চালু" : "Mic Off")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* LIVE BROADCAST DASHBOARD MODE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Broadcaster Feed Monitor (8 Columns) */}
          <div className="lg:col-span-8 bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden flex flex-col justify-between min-h-[500px] relative shadow-2xl">
            {/* Webcam video or stock simulation player */}
            <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
              {liveSourceType === "webcam" && liveWebcamStream && liveCameraEnabled ? (
                <video
                  ref={liveWebcamVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center space-y-4 p-8 z-10">
                  <div className="relative inline-block">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center shadow-lg mx-auto">
                      <span className="font-extrabold text-2xl text-white">
                        {shopName.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <span className="absolute bottom-0 right-1 h-5 w-5 bg-green-500 border-2 border-slate-950 rounded-full animate-pulse" />
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-black text-white tracking-wide uppercase">{shopName}</h4>
                    <p className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-widest mt-1">
                      {language === "bn" ? "লাইভ ব্রডকাস্ট ফিড সচল" : "Broadcaster Studio Feed Active"}
                    </p>
                  </div>

                  <div className="flex justify-center gap-1.5">
                    <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-md border border-emerald-500/20">
                      AUDIO ON
                    </span>
                    <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-bold px-2 py-0.5 rounded-md border border-indigo-500/20">
                      STUDIO MIXER
                    </span>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-black/10 pointer-events-none" />
            </div>

            {/* Overlays */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20">
              {/* Live Badge */}
              <div className="flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                {language === "bn" ? "লাইভ" : "LIVE"}
              </div>

              {/* Viewers & Stream Title overlay */}
              <div className="flex items-center gap-2.5 bg-slate-900/80 backdrop-blur-md border border-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl">
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{liveViewersCount}</span>
                </div>
                <div className="h-3 w-px bg-slate-800" />
                <span className="truncate max-w-[150px]">{language === "bn" ? liveStreamTitleBn : liveStreamTitle}</span>
              </div>
            </div>

            {/* Stream Mixer controls overlay at bottom */}
            <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap gap-2.5 justify-between items-center bg-slate-900/95 backdrop-blur-lg border border-slate-800 p-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <span className="text-[10px] text-slate-300 font-mono font-bold uppercase tracking-wider">
                  {language === "bn" ? "অডিও-ভিডিও সিঙ্কড" : "A/V Streams Synchronized"}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setLiveCameraEnabled(!liveCameraEnabled);
                    if (liveWebcamStream) {
                      liveWebcamStream.getVideoTracks().forEach(track => track.enabled = !liveCameraEnabled);
                    }
                  }}
                  className={`p-2 rounded-xl transition-all border-0 cursor-pointer ${
                    liveCameraEnabled ? "bg-slate-850 text-white hover:bg-slate-750" : "bg-red-500 text-white"
                  }`}
                >
                  {liveCameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => {
                    setLiveMicEnabled(!liveMicEnabled);
                    if (liveWebcamStream) {
                      liveWebcamStream.getAudioTracks().forEach(track => track.enabled = !liveMicEnabled);
                    }
                  }}
                  className={`p-2 rounded-xl transition-all border-0 cursor-pointer ${
                    liveMicEnabled ? "bg-slate-850 text-white hover:bg-slate-750" : "bg-red-500 text-white"
                  }`}
                >
                  {liveMicEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </button>
                
                {/* End Stream Button */}
                <button
                  onClick={handleStopBroadcast}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl border-0 cursor-pointer flex items-center gap-1.5 shadow-md shadow-red-900/20"
                >
                  <Square className="h-3.5 w-3.5" />
                  {language === "bn" ? "লাইভ বন্ধ করুন" : "End Broadcast"}
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Broadcaster Chat Mixer (4 Columns) */}
          <div className="lg:col-span-4 bg-white border border-gray-100 rounded-3xl p-5 flex flex-col justify-between h-[500px] shadow-sm">
            <div className="border-b border-gray-50 pb-3 text-left">
              <h3 className="font-sans font-bold text-sm text-gray-800 flex items-center gap-1.5">
                <Radio className="h-4 w-4 text-red-500 animate-pulse" />
                {language === "bn" ? "ক্রেতাদের লাইভ চ্যাট" : "Live Customer Chat"}
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {language === "bn" ? "আপনার দর্শকদের সাথে সরাসরি চ্যাট করুন ও তাদের প্রশ্নের উত্তর দিন।" : "Communicate with your live buyers dynamically."}
              </p>
            </div>

            {/* Chat message display area */}
            <div className="flex-grow my-4 overflow-y-auto space-y-3 pr-1 text-left min-h-[280px]">
              {liveChatMessages.map((msg, index) => {
                const isSeller = msg.user.includes("Seller");
                return (
                  <div key={msg.id || index} className={`flex flex-col ${isSeller ? "items-end" : "items-start"}`}>
                    <span className="text-[10px] font-extrabold text-gray-400 mb-0.5 px-1">{msg.user}</span>
                    <div className={`rounded-2xl px-3.5 py-2 max-w-[85%] text-xs leading-relaxed font-sans ${
                      isSeller 
                        ? "bg-indigo-600 text-white rounded-tr-none" 
                        : "bg-gray-100 text-gray-800 rounded-tl-none"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={liveChatEndRef} />
              {liveChatMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <Users className="h-8 w-8 text-gray-300 animate-pulse" />
                  <p className="text-xs text-gray-400 font-bold mt-2">
                    {language === "bn" ? "কোনো দর্শক এখনো চ্যাট করেনি" : "Waiting for buyer comments..."}
                  </p>
                </div>
              )}
            </div>

            {/* Chat Send Form */}
            <form onSubmit={sendBroadcasterChatMessage} className="flex gap-2">
              <input
                type="text"
                value={newLiveChatMessage}
                onChange={(e) => setNewLiveChatMessage(e.target.value)}
                placeholder={language === "bn" ? "মেসেজ লিখুন..." : "Type seller response..."}
                className="flex-grow px-3 py-2 rounded-xl border border-gray-200 text-xs font-sans focus:outline-none focus:border-indigo-500 bg-white"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl border-0 cursor-pointer shadow-sm shadow-indigo-100 flex items-center justify-center shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const settingsTabContent = (
    <form onSubmit={saveVendorSettings} className="bg-white border border-gray-150 p-6 rounded-3xl shadow-sm text-left max-w-xl space-y-4 font-sans">
      <h3 className="font-bold text-sm text-gray-800 border-b border-gray-50 pb-2">{language === "bn" ? "মার্চেন্ট সেটিংস পরিবর্তন করুন" : "Update Vendor Information"}</h3>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">{language === "bn" ? "দোকানের নাম" : "Shop Name"}</label>
        <input
          type="text"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">{language === "bn" ? "পিকআপ হাবের ঠিকানা" : "Pickup Hub Warehouse Address"}</label>
        <textarea
          rows={2}
          value={shopAddress}
          onChange={(e) => setShopAddress(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
        />
      </div>
      <button
        type="submit"
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wide cursor-pointer transition-all"
      >
        {language === "bn" ? "সংরক্ষণ করুন" : "Save Preferences"}
      </button>
    </form>
  );

  const assignModalContent = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl overflow-hidden w-full max-w-md shadow-2xl border border-gray-100 flex flex-col font-sans text-left"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-950">
            <Truck className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-sm uppercase tracking-wide">
              {language === "bn" ? "কুরিয়ার ও রাইডার অ্যাসাইনমেন্ট" : "Assign Rider Delivery Ticket"}
            </h3>
          </div>
          <button
            onClick={() => {
              setShowAssignModal(false);
              setAssigningOrder(null);
            }}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleAssignCourier} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              {language === "bn" ? "ডেলিভারি রাইডার নির্বাচন করুন" : "Select Courier Delivery Service"}
            </label>
            
            <div className="space-y-2">
              {/* Option 1: Rahim Cargo */}
              <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                courierUid === "rahim-rider-1" ? "border-indigo-600 bg-indigo-50/20" : "border-gray-200 hover:bg-gray-50"
              }`}>
                <input
                  type="radio"
                  name="riderSelect"
                  checked={courierUid === "rahim-rider-1"}
                  onChange={() => {
                    setCourierUid("rahim-rider-1");
                    setCourierName("Rahim Cargo (Bazar Rider 1)");
                  }}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-xs">
                  <p className="font-bold text-gray-800">Rahim Cargo (Bazar Rider 1)</p>
                  <p className="text-[10px] text-gray-400 font-mono">UID: rahim-rider-1</p>
                </div>
              </label>

              {/* Option 2: Karim Express */}
              <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                courierUid === "karim-rider-2" ? "border-indigo-600 bg-indigo-50/20" : "border-gray-200 hover:bg-gray-50"
              }`}>
                <input
                  type="radio"
                  name="riderSelect"
                  checked={courierUid === "karim-rider-2"}
                  onChange={() => {
                    setCourierUid("karim-rider-2");
                    setCourierName("Karim Express (Bazar Rider 2)");
                  }}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-xs">
                  <p className="font-bold text-gray-800">Karim Express (Bazar Rider 2)</p>
                  <p className="text-[10px] text-gray-400 font-mono">UID: karim-rider-2</p>
                </div>
              </label>

              {/* Option 3: Current User (Self-Assign for testing!) */}
              {auth.currentUser && (
                <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                  courierUid === auth.currentUser.uid ? "border-indigo-600 bg-indigo-50/20" : "border-gray-200 hover:bg-gray-50"
                }`}>
                  <input
                    type="radio"
                    name="riderSelect"
                    checked={courierUid === auth.currentUser.uid}
                    onChange={() => {
                      if (!auth.currentUser) return;
                      setCourierUid(auth.currentUser.uid);
                      setCourierName(`${auth.currentUser.displayName || auth.currentUser.email?.split("@")[0] || "Bazar Limited Rider"} (Self)`);
                    }}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xs">
                    <p className="font-bold text-indigo-700 flex items-center gap-1">
                      <Bike className="h-3.5 w-3.5" />
                      {language === "bn" ? "নিজের অ্যাকাউন্টে অ্যাসাইন করুন (টেস্ট করার জন্য)" : "Assign to Yourself (Easy Testing)"}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono truncate max-w-[280px]">UID: {auth.currentUser.uid}</p>
                  </div>
                </label>
              )}

              {/* Option 4: Custom UID Input */}
              <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                (courierUid !== "rahim-rider-1" && courierUid !== "karim-rider-2" && (!auth.currentUser || courierUid !== auth.currentUser.uid)) ? "border-indigo-600 bg-indigo-50/20" : "border-gray-200 hover:bg-gray-50"
              }`}>
                <input
                  type="radio"
                  name="riderSelect"
                  checked={courierUid !== "rahim-rider-1" && courierUid !== "karim-rider-2" && (!auth.currentUser || courierUid !== auth.currentUser?.uid)}
                  onChange={() => {
                    setCourierUid("");
                    setCourierName("Custom Rider Service");
                  }}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <div className="text-xs flex-grow">
                  <p className="font-bold text-gray-800">{language === "bn" ? "অন্য কাস্টম রাইডার আইডি" : "Custom Rider UID"}</p>
                  <p className="text-[10px] text-gray-400">{language === "bn" ? "অন্য ডিভাইসের রাইডার আইডি এখানে লিখুন" : "Paste custom driver User UID"}</p>
                </div>
              </label>
            </div>
          </div>

          {/* Custom UID text field (Conditional) */}
          {(courierUid !== "rahim-rider-1" && courierUid !== "karim-rider-2" && (!auth.currentUser || courierUid !== auth.currentUser?.uid)) && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
                {language === "bn" ? "রাইডার আইডি (UID) লিখুন" : "Enter Rider User UID"}
              </label>
              <input
                type="text"
                value={courierUid}
                onChange={(e) => setCourierUid(e.target.value)}
                placeholder="e.g. jA9mK8s2u9z1L2d3..."
                className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
              <label className="block text-[10px] font-bold text-indigo-950 uppercase tracking-wider mt-2">
                {language === "bn" ? "রাইডারের নাম লিখুন" : "Enter Rider Display Name"}
              </label>
              <input
                type="text"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                placeholder="e.g. Kabir Delivery Boy"
                className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
          )}

          {/* Delivery notes / custom instructions */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              {language === "bn" ? "রাইডারের জন্য বিশেষ নির্দেশনা (ঐচ্ছিক)" : "Instructions / Notes for Rider (Optional)"}
            </label>
            <textarea
              rows={2}
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder={language === "bn" ? "উদা: বাসায় ঢোকার আগে ফোন দিতে বলবেন" : "e.g. Call before delivery, handle package gently"}
              className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-3">
            <button
              type="button"
              onClick={() => {
                setShowAssignModal(false);
                setAssigningOrder(null);
              }}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer text-center"
            >
              {language === "bn" ? "বাতিল" : "Cancel"}
            </button>
            <button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer text-center shadow-md shadow-indigo-100"
            >
              {language === "bn" ? "অ্যাসাইন নিশ্চিত করুন" : "Confirm Assignment"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );

  // Tab switcher component layout
  const sellerHubSwitcher = (
    <div className="flex flex-wrap border-b border-gray-100 bg-gray-50/50 p-2 gap-2 rounded-2xl mb-6">
      <button
        onClick={() => setSellerTab("dashboard")}
        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
          sellerTab === "dashboard" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        <Store className="h-4 w-4" />
        {language === "bn" ? "ড্যাশবোর্ড ও ইনভেন্টরি" : "Dashboard & Inventory"}
      </button>
      <button
        onClick={() => setSellerTab("publish")}
        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
          sellerTab === "publish" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        <Sparkles className="h-4 w-4" />
        {language === "bn" ? "নতুন পণ্য প্রকাশ (Gemini AI)" : "Add Product (Gemini AI)"}
      </button>
      <button
        onClick={() => setSellerTab("orders")}
        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
          sellerTab === "orders" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        <Truck className="h-4 w-4" />
        {language === "bn" ? "অর্ডার ও কুরিয়ার অ্যাসাইন" : "Orders & Courier Delivery"}
      </button>
      <button
        onClick={() => setSellerTab("settings")}
        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
          sellerTab === "settings" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        <Settings className="h-4 w-4" />
        {language === "bn" ? "মার্চেন্ট সেটিংস" : "Merchant Settings"}
      </button>
      <button
        onClick={() => setSellerTab("live")}
        className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
          sellerTab === "live" ? "bg-indigo-600 text-white shadow-md shadow-indigo-105 animate-pulse" : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        <Radio className="h-4 w-4" />
        {language === "bn" ? "লাইভে যান (Go Live)" : "Go Live Panel"}
      </button>
    </div>
  );

  if (isFullPage) {
    return (
      <div id="seller-console-full" className="space-y-6">
        <div className="border-b border-gray-100 pb-5 text-left">
          <h2 className="font-sans font-bold text-2xl text-gray-900 tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-600 animate-spin" style={{ animationDuration: "12s" }} />
            {language === "bn" ? "সেলার ও মার্চেন্ট প্যানেল" : "Merchant Console & Publisher"}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {language === "bn" 
              ? "জেমিনি AI টেক্সট এআই অ্যাসিস্ট্যান্ট ব্যবহার করে নতুন পণ্য যোগ করুন ও ক্যাটালগে সাবমিট করুন।" 
              : "Instantly draft creative copy via Google Gemini model and deploy items to the live market."}
          </p>
        </div>

        {sellerHubSwitcher}

        {sellerTab === "dashboard" && dashboardTabContent}

        {sellerTab === "publish" && (
          <form onSubmit={publishProduct} className="bg-white border border-gray-100 p-6 md:p-8 rounded-3xl shadow-sm">
            {formContent}
          </form>
        )}

        {sellerTab === "orders" && ordersTabContent}

        {sellerTab === "settings" && settingsTabContent}

        {sellerTab === "live" && liveTabContent}

        {/* Assign Courier Modal inside Full Page View */}
        {showAssignModal && assignModalContent}
      </div>
    );
  }

  return (
    <div id="seller-console-modal" className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl overflow-hidden w-full max-w-6xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] font-sans"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between text-left">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-lg text-gray-800 font-sans">
              {language === "bn" ? "মার্চেন্ট অ্যাসিস্ট্যান্ট (Gemini)" : "Seller Console (Gemini)"}
            </h2>
          </div>
          {onClose && (
            <button
              id="close-seller-console-btn"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="p-6 overflow-y-auto flex-grow bg-gray-50/10">
          {sellerHubSwitcher}

          {sellerTab === "dashboard" && dashboardTabContent}

          {sellerTab === "publish" && (
            <form onSubmit={publishProduct}>
              {formContent}
            </form>
          )}

          {sellerTab === "orders" && ordersTabContent}

          {sellerTab === "settings" && settingsTabContent}

          {sellerTab === "live" && liveTabContent}
        </div>

        {/* Assign Courier Modal inside Popup View */}
        {showAssignModal && assignModalContent}
      </motion.div>
    </div>
  );
}
