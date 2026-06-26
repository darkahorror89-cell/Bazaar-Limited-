import { Product } from "./types";

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "Gemini Quantum Sneakers",
    description: "Futuristic running shoes designed with dual-density foam midsoles for high impact absorption. Breathable mesh knit keeps your feet fresh on long runs.",
    price: 4500, // in BDT
    category: "Footwear",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
    stock: 24,
    rating: 4.8,
    createdAt: new Date().toISOString()
  },
  {
    id: "prod-2",
    name: "AeroGlow Mechanical Keyboard",
    description: "Compact 75% layout mechanical keyboard with hot-swappable tactile switches, dynamic per-key RGB backlighting, and a premium volume dial.",
    price: 6800,
    category: "Electronics",
    imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
    stock: 12,
    rating: 4.9,
    createdAt: new Date().toISOString()
  },
  {
    id: "prod-3",
    name: "Nordic Minimalist Backpack",
    description: "Water-resistant commuter backpack with a dedicated padded 16-inch laptop pocket, hidden anti-theft back compartment, and clean, streamlined silhouette.",
    price: 3200,
    category: "Accessories",
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80",
    stock: 18,
    rating: 4.5,
    createdAt: new Date().toISOString()
  },
  {
    id: "prod-4",
    name: "StudioPro Active Noise Cancelling Headphones",
    description: "Over-ear wireless headphones with custom-tuned 40mm drivers, active hybrid noise cancellation, 40-hour playtime, and premium leather earcups.",
    price: 11500,
    category: "Electronics",
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
    stock: 8,
    rating: 4.7,
    createdAt: new Date().toISOString()
  },
  {
    id: "prod-5",
    name: "Amber Oak Scented Candle",
    description: "Hand-poured natural soy wax candle infused with essential oils of smoked oakwood, rich amber, and subtle cardamom. Burns clean for 50 hours.",
    price: 1200,
    category: "Home & Living",
    imageUrl: "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=600&q=80",
    stock: 35,
    rating: 4.6,
    createdAt: new Date().toISOString()
  },
  {
    id: "prod-6",
    name: "Classic Stainless Steel Water Flask",
    description: "Double-walled vacuum insulated flask that keeps beverages ice cold for up to 24 hours or steaming hot for 12 hours. Sweat-free powder coat finish.",
    price: 1800,
    category: "Accessories",
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80",
    stock: 40,
    rating: 4.4,
    createdAt: new Date().toISOString()
  }
];
