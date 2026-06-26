import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, RefreshCw } from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "../firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import { ChatMessage } from "../types";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "gemini",
      text: "Hi! I'm Gemini Commerce Assistant. How can I help you today? I can recommend products, answer shipping queries, and assist with checkout!",
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionDocId, setSessionDocId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Load user's chat history from Firestore if logged in
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Use user's UID as the chat session document ID to persist across reloads
        const docId = `chat-${user.uid}`;
        setSessionDocId(docId);

        try {
          const docRef = doc(db, "chats", docId);
          
          // Get historical snapshot
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.messages && Array.isArray(data.messages)) {
              setMessages(data.messages);
            }
          }

          // Listen in real-time
          const unsubSnapshot = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              if (data.messages && Array.isArray(data.messages)) {
                setMessages(data.messages);
              }
            }
          }, (err) => {
            console.error("Realtime Chat Snapshot Error:", err);
          });

          return () => unsubSnapshot();
        } catch (error) {
          console.error("Failed to fetch chat history:", error);
        }
      } else {
        // Reset message log to initial on sign out
        setSessionDocId(null);
        setMessages([
          {
            id: "welcome",
            sender: "gemini",
            text: "Hi! I'm Gemini Commerce Assistant. How can I help you today? I can recommend products, answer shipping queries, and assist with checkout!",
            timestamp: new Date().toISOString()
          }
        ]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Save conversation progress to Firebase Firestore if logged in
  const syncChatWithFirestore = async (newMessages: ChatMessage[]) => {
    if (!sessionDocId || !auth.currentUser) return;
    try {
      const docRef = doc(db, "chats", sessionDocId);
      await setDoc(docRef, {
        id: sessionDocId,
        userId: auth.currentUser.uid,
        messages: newMessages,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${sessionDocId}`);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: "user",
      text: inputText.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText("");
    setIsLoading(true);

    // Sync user message to Firestore
    await syncChatWithFirestore(updatedMessages);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          userEmail: auth.currentUser?.email || null
        })
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const data = await response.json();
      
      const geminiMsg: ChatMessage = {
        id: `msg-${Date.now()}-gemini`,
        sender: "gemini",
        text: data.text,
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, geminiMsg];
      setMessages(finalMessages);
      
      // Sync complete conversation to Firestore
      await syncChatWithFirestore(finalMessages);
    } catch (err: any) {
      console.error("Chatbot response error:", err);
      const errMsg: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        sender: "gemini",
        text: "I am experiencing connectivity trouble right now. Please verify your secrets are configured and check my console logs.",
        timestamp: new Date().toISOString()
      };
      setMessages([...updatedMessages, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = async () => {
    const initialMsg: ChatMessage = {
      id: "welcome",
      sender: "gemini",
      text: "Hi! I'm Gemini Commerce Assistant. How can I help you today? I can recommend products, answer shipping queries, and assist with checkout!",
      timestamp: new Date().toISOString()
    };
    setMessages([initialMsg]);
    if (sessionDocId && auth.currentUser) {
      await syncChatWithFirestore([initialMsg]);
    }
  };

  return (
    <div id="support-chatbot-container" className="fixed bottom-6 right-6 z-50 font-sans">
      <AnimatePresence>
        {isOpen ? (
          // Chat window open
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 md:w-96 h-[480px] flex flex-col overflow-hidden"
          >
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 px-4 py-3 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 bg-white/20 p-1 rounded-lg" />
                <div>
                  <h4 className="font-semibold text-sm leading-tight">AI Chat Support</h4>
                  <span className="text-[10px] text-indigo-200">Powered by Gemini</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  id="reset-chat-btn"
                  onClick={handleResetChat}
                  title="Clear conversation logs"
                  className="p-1 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button
                  id="close-chat-btn"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex gap-2 max-w-[80%] ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                      msg.sender === "user" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700"
                    }`}>
                      {msg.sender === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    </div>
                    <div className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-indigo-600 text-white rounded-tr-none"
                        : "bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-xs"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2 max-w-[80%] items-center">
                    <div className="h-6 w-6 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center shrink-0">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs shadow-xs flex items-center gap-1 text-gray-500">
                      <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 flex gap-2 items-center bg-white">
              <input
                id="chatbot-message-input"
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask support..."
                className="flex-grow text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 font-sans"
              />
              <button
                id="send-chat-message-btn"
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2 rounded-xl transition-colors cursor-pointer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        ) : (
          // Floating toggle button
          <motion.button
            id="chatbot-toggle-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="bg-gradient-to-tr from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white p-4 rounded-full shadow-2xl flex items-center justify-center cursor-pointer border border-indigo-500/20"
          >
            <MessageSquare className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
