import React, { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, CheckCircle, Info, AlertTriangle, ShoppingCart, Heart, Truck } from "lucide-react";

export type ToastType = "success" | "info" | "warning" | "error" | "cart" | "wishlist" | "order";

export interface Toast {
  id: string;
  message: string;
  title?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, options?: { title?: string; type?: ToastType; duration?: number }) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, options?: { title?: string; type?: ToastType; duration?: number }) => {
    const id = Math.random().toString(36).substring(2, 9);
    const type = options?.type || "info";
    
    // Default dynamic titles
    const title = options?.title || (
      type === "success" ? "Success" :
      type === "error" ? "Error" :
      type === "warning" ? "Warning" :
      type === "cart" ? "Cart Updated" :
      type === "wishlist" ? "Wishlist Updated" :
      type === "order" ? "Order Update" : "Notification"
    );
    
    const duration = options?.duration || 4000;

    const newToast: Toast = {
      id,
      message,
      title,
      type,
      duration,
    };

    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      {/* Toast Container - Float above footer/bottom tab on mobile */}
      <div className="fixed bottom-20 md:bottom-6 right-0 md:right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 md:px-0">
        <AnimatePresence>
          {toasts.map((t) => {
            let Icon = Info;
            let iconBg = "bg-blue-50 text-blue-600 border-blue-100";
            let borderTheme = "border-l-4 border-l-blue-500";

            switch (t.type) {
              case "success":
                Icon = CheckCircle;
                iconBg = "bg-green-50 text-green-600 border-green-100";
                borderTheme = "border-l-4 border-l-green-500";
                break;
              case "error":
                Icon = X;
                iconBg = "bg-red-50 text-red-600 border-red-100";
                borderTheme = "border-l-4 border-l-red-500";
                break;
              case "warning":
                Icon = AlertTriangle;
                iconBg = "bg-amber-50 text-amber-600 border-amber-100";
                borderTheme = "border-l-4 border-l-amber-500";
                break;
              case "cart":
                Icon = ShoppingCart;
                iconBg = "bg-indigo-50 text-indigo-600 border-indigo-100";
                borderTheme = "border-l-4 border-l-indigo-600";
                break;
              case "wishlist":
                Icon = Heart;
                iconBg = "bg-rose-50 text-rose-500 border-rose-100";
                borderTheme = "border-l-4 border-l-rose-500";
                break;
              case "order":
                Icon = Truck;
                iconBg = "bg-indigo-50 text-indigo-600 border-indigo-100";
                borderTheme = "border-l-4 border-l-indigo-600";
                break;
            }

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 40, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85, y: -20, transition: { duration: 0.2 } }}
                className={`bg-white rounded-2xl shadow-xl border border-gray-150 p-4 flex items-start gap-3 pointer-events-auto transition-shadow hover:shadow-2xl ${borderTheme}`}
              >
                <div className={`p-2 rounded-xl border shrink-0 ${iconBg}`}>
                  <Icon className="h-4 w-4 shrink-0" />
                </div>
                <div className="flex-grow text-left space-y-0.5">
                  <h4 className="text-xs font-bold text-gray-800 font-sans">{t.title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed font-sans">{t.message}</p>
                </div>
                <button
                  onClick={() => removeToast(t.id)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition-all shrink-0 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
