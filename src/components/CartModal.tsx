import React, { useState } from "react";
import { X, Trash2, Plus, Minus, CreditCard, ShieldCheck, ShoppingCart, Loader, ArrowRight, CheckCircle2 } from "lucide-react";
import { CartItem, ShippingAddress, Product } from "../types";
import { auth, db, handleFirestoreError, OperationType } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";

interface CartModalProps {
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (id: string, q: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onOrderCompleted: (orderId: string) => void;
}

export default function CartModal({
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderCompleted
}: CartModalProps) {
  const [step, setStep] = useState<"cart" | "shipping" | "payment_gateway">("cart");
  const [isProcessing, setIsProcessing] = useState(false);
  const [shipping, setShipping] = useState<ShippingAddress>({
    fullName: "",
    email: auth.currentUser?.email || "",
    phone: "",
    addressLine: "",
    city: "Dhaka",
    postalCode: ""
  });

  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [simulatorPaymentMethod, setSimulatorPaymentMethod] = useState<"card" | "bkash" | "nagad" | "rocket">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVV, setCardCVV] = useState("");

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const shippingCost = subtotal > 5000 || subtotal === 0 ? 0 : 150; // free over 5000 BDT
  const totalAmount = subtotal + shippingCost;

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipping.fullName || !shipping.phone || !shipping.addressLine || !shipping.postalCode) {
      alert("Please fill in all shipping details");
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
      userId: auth.currentUser?.uid || "guest",
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
      alert("Payment cancelled/failed. You can try checkout again.");
      setStep("cart");
    }
  };

  return (
    <div id="checkout-cart-modal" className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl overflow-hidden w-full max-w-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] font-sans"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-lg text-gray-800">
              {step === "cart" && "Shopping Cart"}
              {step === "shipping" && "Shipping Details"}
              {step === "payment_gateway" && "Secure Gateway Payment"}
            </h2>
          </div>
          <button
            id="close-cart-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-grow space-y-6">
          {step === "cart" && (
            <>
              {cartItems.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto" />
                  <p className="text-gray-500 font-medium text-sm">Your shopping cart is currently empty.</p>
                  <button onClick={onClose} className="text-xs text-indigo-600 hover:underline font-semibold">
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="divide-y divide-gray-100">
                    {cartItems.map((item) => (
                      <div key={item.product.id} className="py-3 flex items-center justify-between gap-4">
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="h-12 w-12 rounded-lg object-cover bg-gray-50 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-xs text-gray-800 truncate">{item.product.name}</h4>
                          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{item.product.category}</p>
                        </div>
                        {/* Adjust qty */}
                        <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-1 shrink-0">
                          <button
                            id={`qty-minus-${item.product.id}`}
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-semibold px-1 font-mono">{item.quantity}</span>
                          <button
                            id={`qty-plus-${item.product.id}`}
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        {/* Cost */}
                        <div className="text-right shrink-0">
                          <p className="font-mono text-xs font-bold text-gray-800">
                            ₹ {(item.product.price * item.quantity).toLocaleString("en-BD")}
                          </p>
                        </div>
                        {/* Remove */}
                        <button
                          id={`remove-item-${item.product.id}`}
                          onClick={() => onRemoveItem(item.product.id)}
                          className="text-red-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Summary Cost Block */}
                  <div className="border-t border-gray-100 pt-4 space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Subtotal</span>
                      <span className="font-mono">₹ {subtotal.toLocaleString("en-BD")}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Shipping (Free over ₹ 5,000)</span>
                      <span className="font-mono">{shippingCost === 0 ? "FREE" : `₹ ${shippingCost}`}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-sm text-gray-800 pt-1 border-t border-gray-50">
                      <span>Total Amount</span>
                      <span className="font-mono text-indigo-600">₹ {totalAmount.toLocaleString("en-BD")}</span>
                    </div>
                  </div>

                  <button
                    id="proceed-to-shipping-btn"
                    onClick={() => setStep("shipping")}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
                  >
                    Proceed to Checkout
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}

          {step === "shipping" && (
            <form onSubmit={handleShippingSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name *</label>
                  <input
                    id="shipping-fullname"
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={shipping.fullName}
                    onChange={(e) => setShipping({ ...shipping, fullName: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number *</label>
                  <input
                    id="shipping-phone"
                    type="tel"
                    required
                    placeholder="e.g. +8801700000000"
                    value={shipping.phone}
                    onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Shipping Address *</label>
                <input
                  id="shipping-addressline"
                  type="text"
                  required
                  placeholder="Street address, house, apartment"
                  value={shipping.addressLine}
                  onChange={(e) => setShipping({ ...shipping, addressLine: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">City *</label>
                  <select
                    id="shipping-city"
                    value={shipping.city}
                    onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    <option>Dhaka</option>
                    <option>Chittagong</option>
                    <option>Sylhet</option>
                    <option>Rajshahi</option>
                    <option>Khulna</option>
                    <option>Barisal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Postal Code *</label>
                  <input
                    id="shipping-postalcode"
                    type="text"
                    required
                    placeholder="e.g. 1212"
                    value={shipping.postalCode}
                    onChange={(e) => setShipping({ ...shipping, postalCode: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5 flex items-start gap-2.5">
                <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-xs text-indigo-950 font-sans">Payment Integration Security</h4>
                  <p className="text-[11px] text-indigo-700 leading-relaxed font-sans mt-0.5">
                    SSLCommerz transactions are fully encrypted. If sandbox keys are missing, you will proceed to our fully interactive simulated payment screen to test the order journey safely.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setStep("cart")}
                  className="w-1/2 text-xs border border-gray-200 hover:bg-gray-50 py-2.5 rounded-xl font-medium text-gray-600 transition-colors"
                >
                  Back to Cart
                </button>
                <button
                  id="checkout-payment-btn"
                  type="submit"
                  disabled={isProcessing}
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer"
                >
                  {isProcessing ? <Loader className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Proceed to Payment
                </button>
              </div>
            </form>
          )}

          {step === "payment_gateway" && paymentDetails && (
            // --- SSLCOMMERZ INTERACTIVE SIMULATOR ---
            <div className="space-y-6">
              <div className="bg-slate-900 rounded-2xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800 shadow-lg">
                <div>
                  <span className="text-[9px] bg-red-600 font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                    SSLCommerz Sandbox Simulator
                  </span>
                  <h3 className="font-sans font-bold text-lg mt-1">Payment Checkout</h3>
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">Txn ID: {paymentDetails.transactionId}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400">Total Billed</span>
                  <p className="font-mono font-bold text-2xl text-red-500">₹ {paymentDetails.amount.toLocaleString("en-BD")}</p>
                </div>
              </div>

              {/* Navigation Methods */}
              <div className="flex border-b border-gray-100 font-sans">
                <button
                  type="button"
                  onClick={() => setSimulatorPaymentMethod("card")}
                  className={`flex-1 text-center py-2 text-xs font-semibold border-b-2 transition-colors ${
                    simulatorPaymentMethod === "card" ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Cards (Visa/Master)
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatorPaymentMethod("bkash")}
                  className={`flex-1 text-center py-2 text-xs font-semibold border-b-2 transition-colors ${
                    simulatorPaymentMethod === "bkash" ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  bKash
                </button>
                <button
                  type="button"
                  onClick={() => setSimulatorPaymentMethod("nagad")}
                  className={`flex-1 text-center py-2 text-xs font-semibold border-b-2 transition-colors ${
                    simulatorPaymentMethod === "nagad" ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Nagad
                </button>
              </div>

              {/* Form details for specific method */}
              <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                {simulatorPaymentMethod === "card" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase">Card Number</label>
                      <input
                        type="text"
                        placeholder="4111 2222 3333 4444"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 font-mono bg-white mt-0.5"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">Expiry Date</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 font-mono bg-white mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase">CVV</label>
                        <input
                          type="password"
                          placeholder="***"
                          maxLength={3}
                          value={cardCVV}
                          onChange={(e) => setCardCVV(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 font-mono bg-white mt-0.5"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {simulatorPaymentMethod === "bkash" && (
                  <div className="text-center py-4 space-y-3">
                    <div className="bg-pink-100 text-pink-700 px-4 py-2 rounded-xl text-xs font-semibold w-fit mx-auto">
                      bKash Payment Simulation
                    </div>
                    <p className="text-xs text-gray-500">
                      Enter your bKash wallet number to receive an OTP and complete the secure SSLCommerz payment.
                    </p>
                    <input
                      type="tel"
                      placeholder="e.g. 01712345678"
                      className="max-w-xs mx-auto w-full text-xs px-3 py-2 border border-gray-200 rounded-xl text-center font-mono"
                    />
                  </div>
                )}

                {(simulatorPaymentMethod === "nagad" || simulatorPaymentMethod === "rocket") && (
                  <div className="text-center py-4 space-y-2">
                    <p className="text-xs text-gray-500">
                      SSLCommerz direct secure gateway routing active for {simulatorPaymentMethod === "nagad" ? "Nagad" : "Rocket"} mobile wallet.
                    </p>
                    <input
                      type="tel"
                      placeholder="Enter mobile wallet number"
                      className="max-w-xs mx-auto w-full text-xs px-3 py-2 border border-gray-200 rounded-xl text-center font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Action Simulation Controls */}
              <div className="flex gap-3 pt-2">
                <button
                  id="cancel-payment-btn"
                  onClick={() => handleSimulatedPayment("fail")}
                  className="w-1/2 border border-red-200 hover:bg-red-50 text-red-600 font-medium py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel / Fail Transaction
                </button>
                <button
                  id="mock-success-payment-btn"
                  onClick={() => handleSimulatedPayment("success")}
                  className="w-1/2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl shadow-md text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Complete Sandbox Payment
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
