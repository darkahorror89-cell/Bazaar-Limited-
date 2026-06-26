import React, { useState, useEffect, useRef, FormEvent } from "react";
import { 
  Tv, 
  Heart, 
  Send, 
  Users, 
  Share2, 
  ShoppingBag, 
  Sparkles, 
  Plus, 
  X, 
  MessageSquare, 
  Flame, 
  Volume2, 
  VolumeX, 
  Camera, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Clock, 
  ArrowRight,
  ChevronRight,
  Play,
  Pause,
  AlertCircle
} from "lucide-react";
import { Product } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../firebase";
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";

interface LiveShoppingViewProps {
  products: Product[];
  onAddToCart: (product: Product, quantity?: number) => void;
  language: "bn" | "en";
  user: any;
  onOpenProductModal: (product: Product) => void;
}

interface StreamSession {
  id: string;
  title: string;
  titleBn: string;
  sellerName: string;
  sellerAvatar: string;
  viewersCount: number;
  featuredProductIds: string[];
  videoUrl: string;
  isBroadcasting: boolean;
}

interface ChatMsg {
  id: string;
  user: string;
  text: string;
  timestamp: any;
  isMe?: boolean;
}

// Float heart particle type definition
interface HeartParticle {
  id: number;
  x: number;
  y: number;
  scale: number;
  color: string;
}

export default function LiveShoppingView({
  products,
  onAddToCart,
  language,
  user,
  onOpenProductModal
}: LiveShoppingViewProps) {
  // Pre-defined Live Streams
  const INITIAL_STREAM_SESSIONS: StreamSession[] = [
    {
      id: "stream-1",
      title: "Tech Gadgets Live Review & Special Flash Sale!",
      titleBn: "টেক গ্যাজেট লাইভ রিভিউ এবং বিশেষ ফ্ল্যাশ সেল!",
      sellerName: "Tanvir Rahman (Tech Lead)",
      sellerAvatar: "TR",
      viewersCount: 1424,
      featuredProductIds: ["prod-2", "prod-4"], // Mechanical keyboard, StudioPro Headphones
      videoUrl: "https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c054273b167c3681b66e1d2c0d1e28ef&profile_id=139&oauth2_token_id=57447761",
      isBroadcasting: false
    },
    {
      id: "stream-2",
      title: "Unboxing Gemini Quantum Sneakers - Live Walking Comfort Test",
      titleBn: "জেমিনি কোয়ান্টাম স্নিকার্স আনবক্সিং - লাইভ ওয়াকিং আরাম টেস্ট",
      sellerName: "Nusrat Jahan (Fashion Hub)",
      sellerAvatar: "NJ",
      viewersCount: 847,
      featuredProductIds: ["prod-1", "prod-3"], // Sneakers, Backpack
      videoUrl: "https://player.vimeo.com/external/435674703.sd.mp4?s=72403980757d559868c6a0c5f22e8fb7a3c31de4&profile_id=139&oauth2_token_id=57447761",
      isBroadcasting: false
    }
  ];

  // Shorts / Video Reviews definition
  const INITIAL_SHORTS_REVIEWS = [
    {
      id: "short-1",
      title: "Why I switched to AeroGlow Keyboard",
      titleBn: "কেন আমি অ্যারোগ্লো কিবোর্ড ব্যবহার শুরু করলাম",
      reviewer: "Sabbir Hasan",
      productId: "prod-2",
      videoUrl: "https://player.vimeo.com/external/384761655.sd.mp4?s=3824eeaa9b80b72c9bc401b34ea6a1b8026118d3&profile_id=139&oauth2_token_id=57447761",
      likes: "12.4K"
    },
    {
      id: "short-2",
      title: "StudioPro Headphones: Honest 1-min review",
      titleBn: "স্টুডিওপ্রো হেডফোন: ১ মিনিটের সৎ রিভিউ",
      reviewer: "Zara Islam",
      productId: "prod-4",
      videoUrl: "https://player.vimeo.com/external/517614057.sd.mp4?s=bc63ae2f28148b1117180bc48f3fb4fa4c49ba9c&profile_id=139&oauth2_token_id=57447761",
      likes: "8.9K"
    },
    {
      id: "short-3",
      title: "Inside the Nordic Minimalist Backpack",
      titleBn: "নর্ডিক মিনিমালিস্ট ব্যাকপ্যাকের ভেতরের অংশ",
      reviewer: "Anik Ahmed",
      productId: "prod-3",
      videoUrl: "https://player.vimeo.com/external/384761655.sd.mp4?s=3824eeaa9b80b72c9bc401b34ea6a1b8026118d3&profile_id=139&oauth2_token_id=57447761",
      likes: "15.2K"
    }
  ];

  // State Management
  const [streamSessions, setStreamSessions] = useState<StreamSession[]>(INITIAL_STREAM_SESSIONS);
  const [shortsReviews, setShortsReviews] = useState<any[]>(INITIAL_SHORTS_REVIEWS);
  const [activeStream, setActiveStream] = useState<StreamSession>(INITIAL_STREAM_SESSIONS[0]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [hearts, setHearts] = useState<HeartParticle[]>([]);
  const [activeShort, setActiveShort] = useState<any | null>(null);
  
  // Dynamic Real-time Live Viewer Counter State
  const [dynamicViewers, setDynamicViewers] = useState<number>(INITIAL_STREAM_SESSIONS[0].viewersCount);
  const [viewerTrend, setViewerTrend] = useState<"up" | "down" | "stable">("stable");

  // Keep the dynamic viewer state synchronized with the active stream changes
  useEffect(() => {
    setDynamicViewers(activeStream.viewersCount);
    setViewerTrend("stable");
  }, [activeStream.id, activeStream.viewersCount]);

  // Real-time viewer fluctuation simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setDynamicViewers((prev) => {
        // Decide fluctuation size based on stream size
        const maxFluctuation = Math.max(1, Math.floor(activeStream.viewersCount * 0.005)); // 0.5% max fluctuation
        const change = Math.floor(Math.random() * (maxFluctuation * 2 + 1)) - maxFluctuation;
        
        if (change > 0) {
          setViewerTrend("up");
        } else if (change < 0) {
          setViewerTrend("down");
        } else {
          setViewerTrend("stable");
        }
        
        const nextValue = prev + change;
        // Make sure it doesn't drop below 1
        return nextValue < 1 ? 1 : nextValue;
      });
    }, 4000); // update every 4 seconds

    return () => clearInterval(interval);
  }, [activeStream.id, activeStream.viewersCount]);
  
  // Custom Merchant Live Broadcaster state
  const [isMerchantMode, setIsMerchantMode] = useState(false);
  const [customStreamTitle, setCustomStreamTitle] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  // Real broadcast options (webcam vs file)
  const [broadcastSourceType, setBroadcastSourceType] = useState<"webcam" | "file">("webcam");
  const [broadcastVideoFile, setBroadcastVideoFile] = useState<File | null>(null);
  const [broadcastVideoUrl, setBroadcastVideoUrl] = useState("");
  
  // Video uploading state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState("");
  const [uploadReviewerName, setUploadReviewerName] = useState("");
  const [uploadTitleEn, setUploadTitleEn] = useState("");
  const [uploadTitleBn, setUploadTitleBn] = useState("");
  const [uploadSelectedProductId, setUploadSelectedProductId] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const heartIdCounter = useRef(0);

  // Synchronize stream sessions from Firestore "live_streams" collection
  useEffect(() => {
    try {
      const q = collection(db, "live_streams");
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const dbStreams: StreamSession[] = [];
        snapshot.forEach((doc) => {
          const d = doc.data();
          if (d.isBroadcasting) {
            dbStreams.push({
              id: doc.id,
              title: d.title,
              titleBn: d.titleBn || d.title,
              sellerName: d.sellerName,
              sellerAvatar: d.sellerAvatar,
              viewersCount: d.viewersCount || 1,
              featuredProductIds: d.featuredProductIds || [],
              videoUrl: d.videoUrl,
              isBroadcasting: d.isBroadcasting
            });
          }
        });
        
        setStreamSessions((prev) => {
          const defaultStreams = INITIAL_STREAM_SESSIONS.filter(s => !dbStreams.some(ds => ds.id === s.id));
          const nextStreams = [...dbStreams, ...defaultStreams];
          
          // Keep active stream synchronized if its fields updated in real-time
          setActiveStream((currActive) => {
            const updatedActive = nextStreams.find(s => s.id === currActive.id);
            if (updatedActive) {
              if (
                updatedActive.viewersCount !== currActive.viewersCount ||
                updatedActive.videoUrl !== currActive.videoUrl ||
                updatedActive.title !== currActive.title ||
                updatedActive.featuredProductIds.join(",") !== currActive.featuredProductIds.join(",")
              ) {
                return updatedActive;
              }
            } else if (dbStreams.length > 0 && currActive.id.startsWith("stream-seller-")) {
              // If a real stream is active but no longer in dbStreams, default to first available
              return dbStreams[0];
            }
            return currActive;
          });

          return nextStreams;
        });
      }, (err) => {
        console.warn("Firestore live streams access error, using defaults.", err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Error setting up live streams listener:", e);
    }
  }, [language]);

  // Filter products featured in active stream
  const featuredProducts = products.filter(p => activeStream.featuredProductIds.includes(p.id));

  // Load chats from Firestore + Simulates background comments
  useEffect(() => {
    // 1. Subscribe to Firestore live chat for the current stream
    const chatsRef = collection(db, "live_chats");
    const q = query(chatsRef, orderBy("timestamp", "asc"), limit(40));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbMsgs: ChatMsg[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        if (d.streamId === activeStream.id) {
          dbMsgs.push({
            id: doc.id,
            user: d.user,
            text: d.text,
            timestamp: d.timestamp,
            isMe: d.userId === user?.uid
          });
        }
      });
      
      // Merge Firestore chats with initial welcome chats
      setChatMessages(prev => {
        const unique = [...prev];
        dbMsgs.forEach(m => {
          if (!unique.some(u => u.id === m.id)) {
            unique.push(m);
          }
        });
        return unique.slice(-50); // Keep last 50
      });
    }, (err) => {
      console.warn("Firestore live chat connection error:", err);
    });

    // Populate initial welcome chats
    const defaultMessages: ChatMsg[] = [
      { id: "init-1", user: "Kamal Uddin", text: language === "bn" ? "দারুণ প্রোডাক্ট! রিভিউ দেখতে আসলাম।" : "Superb products! Came to see reviews.", timestamp: null },
      { id: "init-2", user: "Sadia Rahman", text: language === "bn" ? "অ্যারোগ্লো কিবোর্ডের লাইভ টাইপিং সাউন্ড শোনাবেন প্লিজ?" : "Can you play the mechanical key sound?", timestamp: null },
      { id: "init-3", user: "Nayeem Islam", text: language === "bn" ? "স্নিকার্সের ডেলিভারি কতদিনে হবে?" : "How many days for sneakers shipping?", timestamp: null }
    ];
    setChatMessages(defaultMessages);

    return () => unsubscribe();
  }, [activeStream.id, language]);

  // Simulation of background viewers typing periodically
  useEffect(() => {
    if (isBroadcasting && !isMerchantMode) return; // Wait if it's seller's preview

    const sampleUsernames = [
      "Amina Khatun", "Rafiqul Islam", "Tariq Jamil", "Sumaiya Akter", 
      "Mehedi Hasan", "Farhana Yesmin", "Imran Khan", "Taskeen Ahmed"
    ];

    const sampleCommentsEn = [
      "Is this product on discount right now?",
      "Wow, the quality looks premium!",
      "Just added this to my cart!",
      "Are you delivering to Chittagong?",
      "Show the backpack closer please!",
      "The RGB lighting is awesome on that keyboard.",
      "Just bought one, hoping for fast delivery!",
      "What is the warranty period?"
    ];

    const sampleCommentsBn = [
      "ডিসকাউন্ট কোডটা কাজ করছে কি?",
      "কোয়ালিটি আসলেই দারুণ মনে হচ্ছে!",
      "আমি একটা অর্ডার করে দিলাম মাত্র!",
      "ডেলিভারি চার্জ কত ভাইয়া?",
      "কিবোর্ডটা কাছ থেকে দেখান প্লিজ।",
      "স্নিকার্সটা কি ওয়াটারপ্রুফ?",
      "অসাধারণ লাইভ সেশন!",
      "ওয়ারেন্টি কতদিনের পাবো?"
    ];

    const interval = setInterval(() => {
      // 20% chance to append a message every 4 seconds to simulate active traffic
      if (Math.random() > 0.4) {
        const randomUser = sampleUsernames[Math.floor(Math.random() * sampleUsernames.length)];
        const comments = language === "bn" ? sampleCommentsBn : sampleCommentsEn;
        const randomText = comments[Math.floor(Math.random() * comments.length)];
        
        const newSimMsg: ChatMsg = {
          id: `sim-${Date.now()}-${Math.random()}`,
          user: randomUser,
          text: randomText,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, newSimMsg].slice(-45));
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [language, isBroadcasting, isMerchantMode]);

  // Handle auto-scroll of chat window
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Sync Video Play/Pause
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, activeStream.id]);

  // Send new chat message to Firestore + local
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const textToSend = newMessage.trim();
    setNewMessage("");

    // Add local optimistic message
    const tempId = `local-${Date.now()}`;
    const localMsg: ChatMsg = {
      id: tempId,
      user: user ? user.displayName || user.email.split("@")[0] : (language === "bn" ? "ভিজিটর" : "Anonymous"),
      text: textToSend,
      timestamp: new Date(),
      isMe: true
    };
    setChatMessages(prev => [...prev, localMsg]);

    try {
      await addDoc(collection(db, "live_chats"), {
        streamId: activeStream.id,
        user: user ? user.displayName || user.email.split("@")[0] : (language === "bn" ? "ভিজিটর" : "Anonymous"),
        userId: user?.uid || "anonymous",
        text: textToSend,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.warn("Could not sync message to Firestore:", err);
    }
  };

  // Trigger floating heart reactions
  const spawnHearts = () => {
    const colors = ["#f43f5e", "#ec4899", "#d946ef", "#a855f7", "#6366f1", "#3b82f6"];
    const newHearts: HeartParticle[] = Array.from({ length: 4 }).map(() => {
      const id = heartIdCounter.current++;
      return {
        id,
        x: Math.random() * 80 - 40, // offset range
        y: 0,
        scale: Math.random() * 0.4 + 0.8,
        color: colors[Math.floor(Math.random() * colors.length)]
      };
    });

    setHearts(prev => [...prev, ...newHearts]);

    // Clean up particles after animation completes to avoid DOM clutter
    setTimeout(() => {
      setHearts(prev => prev.filter(h => !newHearts.some(nh => nh.id === h.id)));
    }, 2000);
  };

  // Launch Broadcaster Stream (Webcam or File Broadcast)
  const startBroadcasting = async () => {
    if (!customStreamTitle.trim()) {
      alert(language === "bn" ? "অনুগ্রহ করে লাইভ স্ট্রিমের একটি টাইটেল দিন।" : "Please provide a title for the live stream.");
      return;
    }
    if (selectedProductIds.length === 0) {
      alert(language === "bn" ? "অনুগ্রহ করে কমপক্ষে ১টি পণ্য নির্বাচন করুন।" : "Please select at least 1 product to feature.");
      return;
    }

    let finalVideoUrl = "https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c054273b167c3681b66e1d2c0d1e28ef&profile_id=139&oauth2_token_id=57447761"; // Real tech gadget stream URL

    if (broadcastSourceType === "webcam") {
      let stream: MediaStream | null = null;
      try {
        const constraints = {
          video: true,
          audio: true
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        setWebcamStream(stream);
      } catch (err) {
        console.warn("Camera access restricted:", err);
        alert(language === "bn" 
          ? "আইফ্রেম বা ব্রাউজার সিকিউরিটির কারণে সরাসরি ক্যামেরা এক্সেস পাওয়া যায়নি। আপনার সুবিধার্থে একটি রিয়েল হাই-ডেফিনিশন ডেমো লাইভ ফিড দিয়ে ব্রডকাস্ট চালু করা হলো! আপনি চাইলে 'ভিডিও ফাইল ব্রডকাস্ট' সিলেক্ট করে যেকোনো কাস্টম ভিডিও দিয়েও লাইভ করতে পারেন।" 
          : "Direct webcam access is restricted inside sandbox iframes. For your convenience, we are launching your broadcast using a high-definition real camera simulation feed! You can also toggle 'Video File Broadcast' to stream any MP4 file from your device.");
      }
    } else {
      // File broadcast mode
      if (broadcastVideoFile) {
        finalVideoUrl = URL.createObjectURL(broadcastVideoFile);
      } else if (broadcastVideoUrl.trim()) {
        finalVideoUrl = broadcastVideoUrl.trim();
      } else {
        alert(language === "bn" 
          ? "কোনো ভিডিও ফাইল সিলেক্ট করা হয়নি! একটি চমৎকার স্টক ভিডিও ফিড দিয়ে লাইভ শুরু হচ্ছে।" 
          : "No video file was selected. Starting broadcast with a high-fidelity stock streaming source.");
      }
    }

    setIsBroadcasting(true);

    // Create an actual, real merchant stream session
    const merchantSession: StreamSession = {
      id: `merchant-${Date.now()}`,
      title: customStreamTitle,
      titleBn: customStreamTitle,
      sellerName: user?.displayName || user?.email?.split("@")[0] || "Authorized Seller",
      sellerAvatar: "MS",
      viewersCount: 1, // Will simulate climbing
      featuredProductIds: selectedProductIds,
      videoUrl: finalVideoUrl,
      isBroadcasting: true
    };

    // Add this to our dynamic list so customers can see it
    setStreamSessions(prev => [merchantSession, ...prev]);
    setActiveStream(merchantSession);

    // Simulate stream viewers growing
    let count = 1;
    const viewInterval = setInterval(() => {
      count += Math.floor(Math.random() * 8) + 1;
      setActiveStream(prev => ({
        ...prev,
        viewersCount: count
      }));
    }, 3000);

    // Store cleanup on webcam stream
    (merchantSession as any).intervalRef = viewInterval;
  };

  // Stop Broadcast
  const stopBroadcasting = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
    }
    
    if ((activeStream as any).intervalRef) {
      clearInterval((activeStream as any).intervalRef);
    }

    setIsBroadcasting(false);
    setIsMerchantMode(false);
    
    // Remove the custom stream session from active lists
    setStreamSessions(prev => prev.filter(s => s.id !== activeStream.id));
    // Reset to default active stream
    setActiveStream(streamSessions[0] || INITIAL_STREAM_SESSIONS[0]);
  };

  // Handle webcam video mounting
  useEffect(() => {
    if (isBroadcasting && webcamStream && webcamVideoRef.current) {
      webcamVideoRef.current.srcObject = webcamStream;
    }
  }, [isBroadcasting, webcamStream]);

  // Toggle Camera/Mic tracks
  const toggleCamera = () => {
    if (webcamStream) {
      const track = webcamStream.getVideoTracks()[0];
      if (track) {
        track.enabled = !cameraEnabled;
        setCameraEnabled(!cameraEnabled);
      }
    }
  };

  const toggleMic = () => {
    if (webcamStream) {
      const track = webcamStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !micEnabled;
        setMicEnabled(!micEnabled);
      }
    }
  };

  // Toggle custom featured selection
  const handleProductSelectionToggle = (productId: string) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId) 
        : [...prev, productId]
    );
  };

  // Handle new video review upload submit
  const handleUploadReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadReviewerName.trim()) {
      alert(language === "bn" ? "অনুগ্রহ করে আপনার নাম দিন।" : "Please provide your reviewer name.");
      return;
    }
    if (!uploadTitleEn.trim() && !uploadTitleBn.trim()) {
      alert(language === "bn" ? "অনুগ্রহ করে একটি টাইটেল দিন।" : "Please provide a review title.");
      return;
    }
    if (!uploadSelectedProductId) {
      alert(language === "bn" ? "অনুগ্রহ করে একটি প্রোডাক্ট সিলেক্ট করুন।" : "Please select a product.");
      return;
    }

    // Set video url
    let videoUrlToUse = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"; // robust default
    if (uploadedVideoFile) {
      videoUrlToUse = URL.createObjectURL(uploadedVideoFile);
    } else if (uploadedVideoUrl.trim()) {
      videoUrlToUse = uploadedVideoUrl.trim();
    }

    const newShort = {
      id: `uploaded-short-${Date.now()}`,
      title: uploadTitleEn || uploadTitleBn,
      titleBn: uploadTitleBn || uploadTitleEn,
      reviewer: uploadReviewerName.trim(),
      productId: uploadSelectedProductId,
      videoUrl: videoUrlToUse,
      likes: "0"
    };

    setShortsReviews(prev => [newShort, ...prev]);
    setIsUploadModalOpen(false);

    // Reset fields
    setUploadedVideoFile(null);
    setUploadedVideoUrl("");
    setUploadReviewerName("");
    setUploadTitleEn("");
    setUploadTitleBn("");
    setUploadSelectedProductId("");

    alert(language === "bn" 
      ? "আপনার ভিডিও রিভিউটি সফলভাবে আপলোড হয়েছে! শর্টস গ্যালারিতে এটি দেখতে পাবেন।" 
      : "Your video review was successfully uploaded! You can watch it now in the reels carousel.");
  };

  return (
    <div className="space-y-10 font-sans pb-16">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-rose-500 via-pink-600 to-indigo-600 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none" />
        
        <div className="space-y-2 text-left z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <Flame className="h-4 w-4 text-amber-300 animate-pulse" />
            {language === "bn" ? "সরাসরি সম্প্রচার ও শপিং" : "Immersive Live Shopping"}
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
            {language === "bn" ? "লাইভ স্ট্রিম দেখে কিনুন এক ক্লিকে!" : "Shop Live, Chat, & Check Out Instantly!"}
          </h2>
          <p className="text-sm opacity-90 leading-relaxed font-medium">
            {language === "bn" 
              ? "ফেসবুক লাইভের মতোই বিক্রেতারা পণ্য সরাসরি দেখাচ্ছেন। স্ক্রিনের নিচে থাকা পণ্য সরাসরি ১-ক্লিকে কার্টে যুক্ত করুন!" 
              : "Interact with brand representatives live, watch live video reviews, ask questions in real-time, and grab exclusive deals."}
          </p>
        </div>

        {/* Action Toggle to Broadcaster Studio */}
        <div className="z-10 shrink-0">
          <button
            onClick={() => setIsMerchantMode(!isMerchantMode)}
            className="bg-white text-rose-600 hover:bg-rose-50 text-xs font-black uppercase px-5 py-3 rounded-2xl shadow-lg transition-all tracking-wider flex items-center gap-2 cursor-pointer border-0"
          >
            <Tv className="h-4 w-4" />
            {isMerchantMode 
              ? (language === "bn" ? "গ্রাহক ভিউতে ফিরুন" : "Switch to Customer View") 
              : (language === "bn" ? "ব্রডকাস্টার স্টুডিও (লাইভে যান)" : "Broadcaster Studio (Go Live)")}
          </button>
        </div>
      </div>

      {isMerchantMode ? (
        // -------------------------------------------------------------
        // BROADCASTER STUDIO PORTAL (SELLER DASHBOARD)
        // -------------------------------------------------------------
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Broadcaster Configuration Form */}
          <div className="lg:col-span-4 bg-white border border-gray-150 rounded-3xl p-6 shadow-sm text-left space-y-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-600 block animate-ping" />
                {language === "bn" ? "লাইভ স্ট্রিম কনফিগারেশন" : "Broadcast Studio Controls"}
              </h3>
              <p className="text-[11px] text-gray-400 mt-1 leading-normal font-medium">
                {language === "bn" ? "আপনার কাস্টমারদের জন্য সরাসরি লাইভে গিয়ে পণ্য প্রমোট করুন।" : "Prepare your video workspace, choose featured items, and stream live."}
              </p>
            </div>

            {!isBroadcasting ? (
              <div className="space-y-5">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 block">
                    {language === "bn" ? "লাইভ স্ট্রিম টাইটেল *" : "Live Stream Title *"}
                  </label>
                  <input
                    type="text"
                    value={customStreamTitle}
                    onChange={(e) => setCustomStreamTitle(e.target.value)}
                    placeholder={language === "bn" ? "যেমন: নতুন গেমার কীবোর্ড আনবক্সিং!" : "e.g. Unboxing our new Quantum Sneakers!"}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-sans focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Broadcast Source Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 block">
                    {language === "bn" ? "লাইভ ব্রডকাস্ট সোর্স নির্বাচন করুন" : "Select Live Broadcast Source"}
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setBroadcastSourceType("webcam")}
                      className={`py-2 px-3 text-xs font-bold rounded-lg transition-all border-0 cursor-pointer ${
                        broadcastSourceType === "webcam"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-transparent text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      {language === "bn" ? "ক্যামেরা ও মাইক (Webcam)" : "Webcam & Mic"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBroadcastSourceType("file")}
                      className={`py-2 px-3 text-xs font-bold rounded-lg transition-all border-0 cursor-pointer ${
                        broadcastSourceType === "file"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-transparent text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      {language === "bn" ? "ভিডিও ফাইল ব্রডকাস্ট" : "Video File / URL"}
                    </button>
                  </div>
                </div>

                {/* Conditional Source Inputs */}
                {broadcastSourceType === "file" && (
                  <div className="border border-gray-100 p-3.5 rounded-2xl bg-gray-50/50 space-y-3">
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-gray-700 block">
                        {language === "bn" ? "১. ভিডিও ফাইল আপলোড করুন" : "1. Choose MP4/MOV Video File:"}
                      </span>
                      <label className="cursor-pointer bg-white border border-gray-200 hover:border-indigo-500 rounded-xl px-3 py-2 flex items-center justify-between gap-2 transition-all">
                        <span className="text-[11px] font-sans text-gray-500 truncate max-w-[180px]">
                          {broadcastVideoFile ? `✓ ${broadcastVideoFile.name}` : (language === "bn" ? "ব্রাউজ করুন..." : "Browse file...")}
                        </span>
                        <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2 py-1 rounded-lg shrink-0">
                          {language === "bn" ? "ফাইল সিলেক্ট" : "Select File"}
                        </span>
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setBroadcastVideoFile(file);
                          }}
                        />
                      </label>
                    </div>

                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-gray-200"></div>
                      <span className="flex-shrink mx-2 text-[10px] text-gray-400 font-bold uppercase">{language === "bn" ? "অথবা" : "OR"}</span>
                      <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-bold text-gray-700 block">
                        {language === "bn" ? "২. পাবলিক ভিডিও লিংক (MP4 URL)" : "2. Direct Video URL (MP4 Link):"}
                      </span>
                      <input
                        type="url"
                        value={broadcastVideoUrl}
                        onChange={(e) => setBroadcastVideoUrl(e.target.value)}
                        placeholder="https://example.com/stream.mp4"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-sans focus:outline-none focus:border-indigo-500 bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Featured Products List */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 block">
                    {language === "bn" ? "ফিচার করার জন্য পণ্য নির্বাচন করুন (কমপক্ষে ১টি) *" : "Select Products to Feature (Min 1) *"}
                  </label>
                  
                  <div className="max-h-56 overflow-y-auto border border-gray-100 rounded-2xl divide-y divide-gray-50 p-1 bg-gray-50/50">
                    {products.map(p => {
                      const isSelected = selectedProductIds.includes(p.id);
                      return (
                        <div 
                          key={p.id}
                          onClick={() => handleProductSelectionToggle(p.id)}
                          className={`p-2.5 flex items-center gap-3 cursor-pointer rounded-xl transition-all ${
                            isSelected ? "bg-indigo-50/70 border border-indigo-100" : "hover:bg-white"
                          }`}
                        >
                          <img src={p.imageUrl} alt={p.name} className="h-10 w-10 object-cover rounded-lg bg-white" />
                          <div className="flex-grow text-left leading-tight">
                            <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{p.name}</h4>
                            <span className="text-[10px] font-mono text-gray-500 font-bold">₹ {p.price}</span>
                          </div>
                          <div className={`h-4 w-4 rounded-md border flex items-center justify-center ${
                            isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300"
                          }`}>
                            {isSelected && <span className="text-[10px]">✓</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={startBroadcasting}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase py-3 rounded-2xl transition-all tracking-wider flex items-center justify-center gap-2 border-0 cursor-pointer shadow-md shadow-rose-100"
                >
                  <Camera className="h-4 w-4" />
                  {language === "bn" ? "লাইভ সম্প্রচার শুরু করুন" : "Launch Live Stream Now"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-800 leading-normal font-sans font-medium">
                    {language === "bn" ? "আপনি এখন লাইভে আছেন! কাস্টমাররা আপনার ভিডিও এবং ফিচার করা পণ্য দেখতে পাচ্ছেন।" : "Your live session is broadcasting! Customers are engaging with your video stream."}
                  </div>
                </div>

                <div className="border border-gray-100 rounded-2xl p-3 bg-gray-50 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-semibold">{language === "bn" ? "ক্যামেরা ফিড:" : "Camera state:"}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={toggleCamera}
                      className={`p-2 rounded-xl transition-all ${cameraEnabled ? "bg-indigo-100 text-indigo-700" : "bg-red-100 text-red-700"}`}
                    >
                      {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={toggleMic}
                      className={`p-2 rounded-xl transition-all ${micEnabled ? "bg-indigo-100 text-indigo-700" : "bg-red-100 text-red-700"}`}
                    >
                      {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={stopBroadcasting}
                  className="w-full bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold uppercase py-3 rounded-2xl transition-all tracking-wider flex items-center justify-center gap-2 border-0 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                  {language === "bn" ? "লাইভ স্ট্রিম শেষ করুন" : "Stop Broadcast Session"}
                </button>
              </div>
            )}
          </div>

          {/* Broadcaster Stream Preview / Live Monitor */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-slate-950 rounded-3xl overflow-hidden aspect-video relative flex items-center justify-center text-white border border-slate-900 shadow-2xl h-[450px]">
              
              {isBroadcasting ? (
                webcamStream ? (
                  // Real Webcam stream video element
                  <video
                    ref={webcamVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  // Real Video File/URL Broadcast Feed
                  <div className="w-full h-full relative">
                    <video
                      key={activeStream.videoUrl}
                      src={activeStream.videoUrl}
                      autoPlay
                      loop
                      playsInline
                      muted
                      className="w-full h-full object-cover animate-fade-in"
                    />
                    <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                  </div>
                )
              ) : (
                <div className="text-center space-y-3 p-8">
                  <div className="h-16 w-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <Video className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-100">
                      {language === "bn" ? "ক্যামেরা প্রিভিউ বন্ধ আছে" : "Studio Feed Offline"}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-normal">
                      {language === "bn" 
                        ? "ডানদিকের কনফিগারেশন সম্পন্ন করে লাইভে চাপ দিলে আপনার ক্যামেরা চালু হয়ে এখানে রিয়েল-টাইম প্রিভিউ দেখাবে।" 
                        : "Configure stream parameters and click launch to test your webcam transmission feeds."}
                    </p>
                  </div>
                </div>
              )}

              {/* Status overlays if broadcasting */}
              {isBroadcasting && (
                <>
                  <div className="absolute top-4 left-4 z-10 flex gap-2">
                    <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg tracking-widest flex items-center gap-1.5 animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-white block" />
                      LIVE
                    </span>
                    <div className="bg-slate-900/85 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 shadow-lg relative group">
                      <Users className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                      <motion.span 
                        key={dynamicViewers}
                        initial={{ opacity: 0.6, y: -2 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="font-mono text-white font-extrabold flex items-center gap-0.5"
                      >
                        {dynamicViewers.toLocaleString()}
                        {viewerTrend === "up" && <span className="text-emerald-400 text-[8px]">▲</span>}
                        {viewerTrend === "down" && <span className="text-rose-400 text-[8px]">▼</span>}
                      </motion.span>
                    </div>
                  </div>

                  <div className="absolute top-4 right-4 z-10">
                    <span className="bg-slate-900/85 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg">
                      {language === "bn" ? "রেজোলিউশন: 1080p HD" : "HD 1080p • 60 FPS"}
                    </span>
                  </div>

                  {/* Dynamic hearts overlays simulated on broadcaster side */}
                  <div className="absolute bottom-16 right-6 z-10 flex flex-col items-center pointer-events-none">
                    <div className="relative h-48 w-16">
                      <AnimatePresence>
                        {hearts.map((h) => (
                          <motion.div
                            key={h.id}
                            initial={{ opacity: 1, y: 180, x: h.x, scale: 0.2 }}
                            animate={{ opacity: 0, y: 0, x: h.x + (Math.sin(h.id) * 30), scale: h.scale }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.8, ease: "easeOut" }}
                            className="absolute bottom-0 text-xl pointer-events-none"
                            style={{ color: h.color }}
                          >
                            ♥
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Broadcast Footer Info */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 text-left flex justify-between items-end">
                    <div className="space-y-1">
                      <span className="text-[9px] text-indigo-400 font-mono font-bold uppercase tracking-wider">{activeStream.sellerName}</span>
                      <h3 className="text-sm font-bold text-white line-clamp-1">{activeStream.title}</h3>
                    </div>
                    
                    <button
                      onClick={spawnHearts}
                      className="bg-rose-500 hover:bg-rose-600 text-white p-3.5 rounded-full shadow-lg transition-all border-0 cursor-pointer active:scale-95"
                    >
                      <Heart className="h-5 w-5 fill-white" />
                    </button>
                  </div>
                </>
              )}
            </div>
            
            {/* Live broadcast metrics */}
            {isBroadcasting && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-150 p-4 rounded-2xl text-left space-y-1 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-gray-400">{language === "bn" ? "ডাইরেক্ট সেলস" : "Stream Conversion Revenue"}</span>
                  <p className="text-lg font-black font-mono text-gray-950">₹ ১,২৮,৫০০</p>
                </div>
                <div className="bg-white border border-gray-150 p-4 rounded-2xl text-left space-y-1 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-gray-400">{language === "bn" ? "মোট ভিউয়ার্স" : "Peak Concurrent Viewers"}</span>
                  <p className="text-lg font-black font-mono text-indigo-600">{activeStream.viewersCount} active</p>
                </div>
                <div className="bg-white border border-gray-150 p-4 rounded-2xl text-left space-y-1 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-gray-400">{language === "bn" ? "মোট লাইক" : "Total Stream Likes"}</span>
                  <p className="text-lg font-black font-mono text-rose-600">8.4K ♥</p>
                </div>
              </div>
            )}
          </div>

        </div>
      ) : (
        // -------------------------------------------------------------
        // CUSTOMER LIVE VIEWING ARENA
        // -------------------------------------------------------------
        <div className="space-y-12">
          
          {/* Main Streaming & Chat Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* 1. Interactive Video Player Column */}
            <div className="lg:col-span-8 flex flex-col bg-slate-950 rounded-3xl overflow-hidden border border-slate-900 shadow-xl relative min-h-[480px] lg:h-[550px]">
              
              {/* Loop Showcase Video Player */}
              <div className="flex-grow relative overflow-hidden flex items-center justify-center">
                {activeStream.id.startsWith("merchant-") && webcamStream ? (
                  <video
                    key="webcam-viewer-active"
                    autoPlay
                    playsInline
                    muted={isMuted}
                    ref={(el) => {
                      if (el && el.srcObject !== webcamStream) {
                        el.srcObject = webcamStream;
                      }
                    }}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    key={activeStream.videoUrl}
                    src={activeStream.videoUrl}
                    autoPlay={isPlaying}
                    loop
                    playsInline
                    muted={isMuted}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}

                {/* Dark overlay gradients for labels */}
                <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 via-black/20 to-transparent p-4 flex justify-between items-center z-10" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5 z-10" />

                {/* Player Top Controls Overlay */}
                <div className="absolute top-4 inset-x-4 flex justify-between items-center z-20">
                  <div className="flex items-center gap-2">
                    <span className="bg-rose-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg tracking-widest flex items-center gap-1.5 animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-white block" />
                      {language === "bn" ? "সরাসরি" : "LIVE"}
                    </span>
                    <div className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-xl border border-white/10 hover:border-white/20 transition-all flex items-center gap-2 shadow-lg group relative cursor-pointer">
                      <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </div>
                      <span className="font-sans font-medium text-gray-300">
                        {language === "bn" ? "দর্শক:" : "Viewers:"}
                      </span>
                      <motion.span 
                        key={dynamicViewers}
                        initial={{ opacity: 0.6, y: -2 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="font-mono text-white font-extrabold flex items-center gap-1"
                      >
                        {dynamicViewers.toLocaleString()}
                        {viewerTrend === "up" && (
                          <span className="text-emerald-400 font-sans text-[9px] font-black leading-none animate-bounce">▲</span>
                        )}
                        {viewerTrend === "down" && (
                          <span className="text-rose-400 font-sans text-[9px] font-black leading-none animate-bounce">▼</span>
                        )}
                      </motion.span>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1.5 hidden group-hover:block bg-slate-900 border border-slate-800 text-[9px] font-bold text-slate-300 px-2 py-1 rounded-md whitespace-nowrap z-30 shadow-xl">
                        {language === "bn" ? "রিয়েল-টাইম সক্রিয় দর্শক" : "Real-time Active Connections"}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-2 bg-black/40 backdrop-blur-xs text-white hover:bg-black/60 rounded-xl transition-all border-0 cursor-pointer"
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-2 bg-black/40 backdrop-blur-xs text-white hover:bg-black/60 rounded-xl transition-all border-0 cursor-pointer"
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Floating Hearts Reaction Canvas Overlay */}
                <div className="absolute bottom-20 right-6 z-20 flex flex-col items-center pointer-events-none">
                  <div className="relative h-64 w-20">
                    <AnimatePresence>
                      {hearts.map((h) => (
                        <motion.div
                          key={h.id}
                          initial={{ opacity: 1, y: 220, x: h.x, scale: 0.2 }}
                          animate={{ opacity: 0, y: 0, x: h.x + (Math.sin(h.id) * 40), scale: h.scale }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 1.8, ease: "easeOut" }}
                          className="absolute bottom-0 text-2xl pointer-events-none"
                          style={{ color: h.color }}
                        >
                          ♥
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Interactive Heart Button Floating in player */}
                <div className="absolute bottom-6 right-6 z-20">
                  <button
                    onClick={spawnHearts}
                    className="bg-gradient-to-tr from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white p-4 rounded-full shadow-lg transition-all border-0 cursor-pointer active:scale-90 flex items-center justify-center shadow-rose-900/50"
                  >
                    <Heart className="h-6 w-6 fill-white" />
                  </button>
                </div>

                {/* Title & Seller details Overlay bottom-left */}
                <div className="absolute bottom-6 left-6 right-24 text-left z-20 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-[10px] text-white border border-white/20">
                      {activeStream.sellerAvatar}
                    </div>
                    <span className="text-xs font-bold text-gray-200">{activeStream.sellerName}</span>
                  </div>
                  <h3 className="text-base md:text-lg font-extrabold text-white leading-snug drop-shadow-sm">
                    {language === "bn" ? activeStream.titleBn : activeStream.title}
                  </h3>
                </div>

              </div>

              {/* Instant purchase scroll drawer overlay at the absolute bottom of stream player */}
              <div className="bg-slate-900/95 border-t border-slate-800 p-4 text-left z-20 shrink-0">
                <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider block mb-2.5">
                  ⚡ {language === "bn" ? "লাইভ স্ট্রিমের বিশেষ প্রডাক্টসমূহ (১-ক্লিক অর্ডার)" : "Featured Products Shown in Live (1-Click Add)"}
                </span>

                <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-thin">
                  {featuredProducts.map((p) => (
                    <div 
                      key={p.id}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-2.5 flex items-center gap-3 shrink-0 w-64 md:w-72"
                    >
                      <img 
                        src={p.imageUrl} 
                        alt={p.name} 
                        className="h-11 w-11 object-cover rounded-xl bg-white cursor-pointer"
                        onClick={() => onOpenProductModal(p)} 
                      />
                      <div className="flex-grow text-left leading-tight min-w-0">
                        <h4 className="text-xs font-bold text-white truncate hover:text-indigo-400 cursor-pointer" onClick={() => onOpenProductModal(p)}>
                          {p.name}
                        </h4>
                        <span className="text-[11px] font-mono font-bold text-indigo-300 mt-0.5 block">₹ {p.price.toLocaleString("en-BD")}</span>
                      </div>
                      
                      <button
                        onClick={() => onAddToCart(p)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase px-3 py-2 rounded-xl transition-all tracking-wider border-0 cursor-pointer"
                      >
                        {language === "bn" ? "কার্ট" : "Buy"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* 2. Chat stream Column */}
            <div className="lg:col-span-4 bg-white border border-gray-150 rounded-3xl p-5 shadow-sm flex flex-col justify-between h-[500px] lg:h-[550px]">
              
              {/* Chat Header */}
              <div className="border-b border-gray-50 pb-3 flex justify-between items-center text-left">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-indigo-600" />
                    {language === "bn" ? "লাইভ কমেন্ট বক্স" : "Live Streaming Chat"}
                  </h4>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    {language === "bn" ? "অন্যান্য ক্রেতাদের সাথে আলোচনা করুন" : "Discuss and request details with hosts"}
                  </span>
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-grow overflow-y-auto py-4 space-y-3.5 pr-1 max-h-[380px]">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="text-left space-y-0.5 text-xs">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`font-bold ${msg.isMe ? "text-indigo-600" : "text-gray-800"} font-sans`}>
                        {msg.user}
                      </span>
                      {msg.isMe && (
                        <span className="text-[8px] font-bold uppercase bg-indigo-50 text-indigo-600 px-1 rounded">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 leading-normal font-sans bg-gray-50/50 p-2 rounded-xl border border-gray-50 max-w-[92%]">
                      {msg.text}
                    </p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="pt-3 border-t border-gray-50 flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={language === "bn" ? "মন্তব্য লিখুন..." : "Type a live comment..."}
                  className="flex-grow px-4 py-2.5 rounded-full border border-gray-200 focus:outline-none focus:border-indigo-500 text-xs font-sans bg-gray-50"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-full transition-all border-0 cursor-pointer shadow-sm shadow-indigo-100 flex items-center justify-center"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>

            </div>

          </div>

          {/* Selector Stream Sessions Grid */}
          <div className="space-y-4">
            <div className="text-left">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                {language === "bn" ? "চলমান অন্যান্য লাইভ শোগুলো" : "Other Active Brand Live Shows"}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {language === "bn" ? "ক্লিক করে যেকোনো লাইভে যোগ দিন" : "Switch between active seller broadcast rooms"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {streamSessions.map((session) => {
                const isActive = session.id === activeStream.id;
                return (
                  <div 
                    key={session.id}
                    onClick={() => {
                      setActiveStream(session);
                      setIsPlaying(true);
                    }}
                    className={`bg-white border border-gray-150 p-4 rounded-3xl flex gap-4 cursor-pointer hover:shadow-md transition-all text-left ${
                      isActive ? "ring-2 ring-indigo-600 shadow-md shadow-indigo-50" : ""
                    }`}
                  >
                    <div className="relative h-20 w-32 rounded-2xl overflow-hidden bg-slate-900 shrink-0">
                      <span className="absolute top-2 left-2 z-10 bg-rose-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase animate-pulse">
                        LIVE
                      </span>
                      {/* static image fallback representing stream snapshot */}
                      <div className="h-full w-full bg-slate-900 flex items-center justify-center text-white/55 text-xs">
                        <Tv className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="flex-grow flex flex-col justify-between leading-tight py-0.5">
                      <div className="space-y-1">
                        <span className="text-[9px] text-indigo-600 font-bold uppercase tracking-wider">{session.sellerName}</span>
                        <h4 className="text-xs font-black text-gray-950 line-clamp-2">
                          {language === "bn" ? session.titleBn : session.title}
                        </h4>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-semibold text-gray-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-gray-400" />
                          {(session.id === activeStream.id ? dynamicViewers : session.viewersCount).toLocaleString()} {language === "bn" ? "দর্শক" : "watching"}
                        </span>
                        <span className="text-indigo-600 font-bold uppercase tracking-widest flex items-center gap-0.5">
                          {language === "bn" ? "যোগ দিন" : "JOIN"}
                          <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shorts / Video Reviews Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-pink-500 animate-pulse" />
                  {language === "bn" ? "শর্টস ও ভিডিও রিভিউ (Shop Reels)" : "Video Reviews & Shorts Carousel"}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {language === "bn" ? "রিভিউ দেখতে দেখতে পণ্য কিনুন" : "Watch high-engagement short reviews with swipe shopping integrations"}
                </p>
              </div>
              
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold uppercase px-4 py-2.5 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 border-0 cursor-pointer w-fit shrink-0 font-sans"
              >
                <Plus className="h-4 w-4" />
                {language === "bn" ? "রিভিউ ভিডিও আপলোড" : "Upload Video Review"}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {shortsReviews.map((short) => {
                const prod = products.find(p => p.id === short.productId);
                return (
                  <div 
                    key={short.id}
                    onClick={() => setActiveShort(short)}
                    className="relative rounded-3xl overflow-hidden aspect-[9/16] bg-slate-950 group cursor-pointer border border-gray-100 shadow-sm hover:shadow-lg transition-all h-[360px] max-w-[240px] mx-auto w-full"
                  >
                    {/* Loop review video preview */}
                    <video
                      src={short.videoUrl}
                      autoPlay
                      loop
                      playsInline
                      muted
                      className="h-full w-full object-cover opacity-85 group-hover:scale-105 transition-all duration-500"
                    />

                    {/* Gradient shading */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/30 p-4 flex flex-col justify-between text-left" />

                    {/* Likes top badge */}
                    <div className="absolute top-3 left-3 z-10 bg-black/40 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
                      {short.likes}
                    </div>

                    {/* Review text & Shop Button bottom */}
                    <div className="absolute bottom-3 inset-x-3 space-y-2.5 z-10">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-pink-400 font-bold">@{short.reviewer}</span>
                        <h4 className="text-[11px] font-extrabold text-white leading-snug line-clamp-2">
                          {language === "bn" ? short.titleBn : short.title}
                        </h4>
                      </div>

                      {prod && (
                        <div className="bg-white/10 backdrop-blur-md border border-white/10 p-2 rounded-2xl flex items-center justify-between gap-2">
                          <img src={prod.imageUrl} alt={prod.name} className="h-8 w-8 object-cover rounded-lg bg-white shrink-0" />
                          <div className="flex-grow leading-none min-w-0">
                            <span className="text-[10px] font-extrabold text-white truncate block">{prod.name}</span>
                            <span className="text-[9px] font-mono text-pink-300 font-bold block mt-1">₹ {prod.price}</span>
                          </div>
                          <span className="bg-indigo-600 text-white p-1 rounded-full shrink-0">
                            <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* -------------------------------------------------------------
          VERTICAL SHORTS POPUP MODEL (TIKTOK/REELS THEATRE)
          ------------------------------------------------------------- */}
      {activeShort && (() => {
        const prod = products.find(p => p.id === activeShort.productId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden max-w-sm w-full aspect-[9/16] h-[640px] relative flex flex-col justify-between shadow-2xl">
              
              {/* Back close button */}
              <button
                onClick={() => setActiveShort(null)}
                className="absolute top-4 right-4 z-30 p-2 bg-black/40 backdrop-blur-xs text-white hover:bg-black/60 rounded-full cursor-pointer border-0"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Full height active video player */}
              <div className="absolute inset-0 z-0">
                <video
                  src={activeShort.videoUrl}
                  autoPlay
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-black/40" />
              </div>

              {/* Header Label top left */}
              <div className="absolute top-4 left-4 z-20 flex gap-2">
                <span className="bg-indigo-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider">
                  {language === "bn" ? "ভিডিও রিভিউ" : "REEL REVIEW"}
                </span>
              </div>

              {/* Floating product shop card bottom overlay */}
              <div className="mt-auto p-5 space-y-4 z-20 relative text-left">
                <div className="space-y-1">
                  <span className="text-xs text-pink-400 font-bold">@{activeShort.reviewer}</span>
                  <h3 className="text-sm font-extrabold text-white leading-snug">
                    {language === "bn" ? activeShort.titleBn : activeShort.title}
                  </h3>
                </div>

                {prod && (
                  <div className="bg-white border border-gray-100 p-3 rounded-2xl flex items-center gap-3.5 shadow-xl">
                    <img src={prod.imageUrl} alt={prod.name} className="h-12 w-12 object-cover rounded-xl bg-white" />
                    <div className="flex-grow leading-tight min-w-0">
                      <h4 className="text-xs font-black text-gray-900 truncate">{prod.name}</h4>
                      <p className="text-[10px] text-gray-400 font-semibold line-clamp-1 mt-0.5">{prod.description}</p>
                      <span className="text-xs font-mono font-black text-indigo-600 mt-1 block">₹ {prod.price.toLocaleString("en-BD")}</span>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => {
                          onAddToCart(prod);
                          setActiveShort(null);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase px-3 py-2 rounded-xl transition-all tracking-wider border-0 cursor-pointer"
                      >
                        {language === "bn" ? "কিনুন" : "Buy Now"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* -------------------------------------------------------------
          VIDEO REVIEW UPLOAD MODAL
          ------------------------------------------------------------- */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans overflow-y-auto">
          <div className="bg-white border border-gray-150 rounded-3xl max-w-lg w-full p-6 md:p-8 relative shadow-2xl my-8">
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full transition-all border-0 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-left space-y-4">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Video className="h-5 w-5 text-pink-500" />
                  {language === "bn" ? "নতুন ভিডিও রিভিউ আপলোড করুন" : "Upload Video Product Review"}
                </h3>
                <p className="text-xs text-gray-400 leading-normal mt-0.5 font-medium">
                  {language === "bn" 
                    ? "গ্রাহকদের আকৃষ্ট করতে ছোট ভিডিও রিভিউ আপলোড করুন এবং যেকোনো প্রডাক্টের সাথে ট্যাগ করুন।" 
                    : "Create high-converting user generated content. Drag an MP4 file or paste any video link to add to our reels."}
                </p>
              </div>

              <form onSubmit={handleUploadReview} className="space-y-4">
                {/* 1. Reviewer Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 block">
                    {language === "bn" ? "আপনার নাম / রিভিউয়ার নাম *" : "Your Name / Reviewer Handle *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadReviewerName}
                    onChange={(e) => setUploadReviewerName(e.target.value)}
                    placeholder={language === "bn" ? "যেমন: সাব্বির আহমেদ" : "e.g. Rachel Green"}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-sans focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 2. Titles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 block">
                      {language === "bn" ? "টাইটেল (বাংলা)" : "Review Title (Bengali)"}
                    </label>
                    <input
                      type="text"
                      value={uploadTitleBn}
                      onChange={(e) => setUploadTitleBn(e.target.value)}
                      placeholder="যেমন: অসাধারণ কীবোর্ড!"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-sans focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 block">
                      {language === "bn" ? "টাইটেল (English) *" : "Review Title (English) *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={uploadTitleEn}
                      onChange={(e) => setUploadTitleEn(e.target.value)}
                      placeholder="e.g. Best headphones ever!"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-sans focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* 3. Product Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 block">
                    {language === "bn" ? "কোন পণ্যের সাথে ট্যাগ করবেন? *" : "Select Linked Product *"}
                  </label>
                  <select
                    required
                    value={uploadSelectedProductId}
                    onChange={(e) => setUploadSelectedProductId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-sans focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="">{language === "bn" ? "-- একটি পণ্য সিলেক্ট করুন --" : "-- Choose a Product --"}</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{p.price})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Video Selector */}
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center bg-gray-50/50 space-y-2.5">
                  <label className="cursor-pointer block space-y-1.5">
                    <Video className="h-6 w-6 text-gray-400 mx-auto animate-bounce" />
                    <span className="text-xs font-bold text-indigo-600 block">
                      {language === "bn" ? "একটি ভিডিও ফাইল সিলেক্ট করুন" : "Browse MP4/Video File"}
                    </span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setUploadedVideoFile(file);
                      }}
                    />
                  </label>
                  
                  {uploadedVideoFile ? (
                    <div className="bg-emerald-50 text-emerald-800 text-[11px] font-bold p-2 rounded-xl flex items-center justify-between border border-emerald-100 font-sans">
                      <span className="truncate max-w-[240px]">✓ {uploadedVideoFile.name}</span>
                      <button 
                        type="button" 
                        onClick={() => setUploadedVideoFile(null)} 
                        className="text-red-500 hover:text-red-700 bg-transparent border-0 cursor-pointer font-black text-xs font-sans"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-gray-400 block font-semibold">
                        {language === "bn" ? "অথবা একটি টেস্ট ভিডিও লিঙ্ক দিন:" : "OR paste a public MP4 Video URL:"}
                      </span>
                      <input
                        type="url"
                        value={uploadedVideoUrl}
                        onChange={(e) => setUploadedVideoUrl(e.target.value)}
                        placeholder="https://example.com/demo.mp4"
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] font-sans focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 italic">
                    {language === "bn" 
                      ? "পরামর্শ: টেস্ট করার জন্য কোনো ফাইল সিলেক্ট না করলেও আমাদের চমৎকার স্টক ডেমো ভিডিওটি স্বয়ংক্রিয়ভাবে লোড হয়ে যাবে!" 
                      : "Tip: If left blank, we will automatically load a professional demo stock video to test!"}
                  </p>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs font-bold uppercase py-3 rounded-2xl transition-all tracking-wider flex items-center justify-center gap-2 border-0 cursor-pointer shadow-md shadow-pink-100 font-sans"
                >
                  <Tv className="h-4 w-4" />
                  {language === "bn" ? "রিভিউ পাবলিশ করুন" : "Publish Video Review"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
