import { Product } from "../types";
import { Star, ShoppingCart, Heart, GitCompare } from "lucide-react";
import { motion } from "motion/react";

interface ProductCardProps {
  key?: string;
  product: Product;
  onAddToCart: (p: Product) => void;
  isRecommended?: boolean;
  isWishlisted?: boolean;
  onToggleWishlist?: (p: Product) => void;
  onSelect?: (p: Product) => void;
  isComparing?: boolean;
  onToggleCompare?: (p: Product) => void;
  language?: "bn" | "en";
}

export default function ProductCard({ 
  product, 
  onAddToCart, 
  isRecommended = false,
  isWishlisted = false,
  onToggleWishlist,
  onSelect,
  isComparing = false,
  onToggleCompare,
  language = "en"
}: ProductCardProps) {
  return (
    <motion.div
      id={`product-card-${product.id}`}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.2 }}
      onClick={() => onSelect?.(product)}
      className={`group relative bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all flex flex-col cursor-pointer ${
        isRecommended ? "ring-2 ring-indigo-500/30" : ""
      }`}
    >
      {/* Recommended Tag */}
      {isRecommended && (
        <span className="absolute top-3 left-3 z-10 bg-indigo-600 text-white font-sans font-medium text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full shadow-md">
          Recommended for you
        </span>
      )}

      {/* Compare Floating Button */}
      {onToggleCompare && (
        <button
          id={`compare-btn-${product.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompare(product);
          }}
          className={`absolute z-10 p-2 rounded-full shadow-md backdrop-blur-md transition-all duration-250 cursor-pointer ${
            isRecommended ? "top-12" : "top-3"
          } left-3 ${
            isComparing 
              ? "bg-indigo-600 text-white hover:bg-indigo-700" 
              : "bg-white/80 hover:bg-white text-gray-500 hover:text-indigo-600"
          }`}
          title={isComparing ? (language === "bn" ? "তুলনা থেকে সরান" : "Remove from Comparison") : (language === "bn" ? "তুলনা করুন" : "Compare Product")}
        >
          <GitCompare className="h-4 w-4" />
        </button>
      )}

      {/* Product Image Container */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={product.imageUrl}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Wishlist Heart Button */}
        {onToggleWishlist && (
          <button
            id={`wishlist-btn-${product.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(product);
            }}
            className="absolute top-3 right-3 z-10 bg-white/80 backdrop-blur-md hover:bg-white p-2 rounded-full shadow-md text-gray-500 hover:text-rose-500 transition-all duration-250 cursor-pointer group/heart-btn"
            title={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
          >
            <Heart className={`h-4 w-4 transition-transform active:scale-125 duration-150 ${isWishlisted ? "fill-rose-500 text-rose-500 scale-110" : "text-gray-500 group-hover/heart-btn:scale-110"}`} />
          </button>
        )}

        {product.stock <= 5 && product.stock > 0 && (
          <span className="absolute bottom-3 right-3 bg-red-500/90 backdrop-blur-sm text-white font-sans font-semibold text-[9px] uppercase tracking-wider px-2 py-1 rounded-md">
            Only {product.stock} left
          </span>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center">
            <span className="bg-gray-800 text-white font-sans font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-sm">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Card Details */}
      <div className="p-4 md:p-5 flex flex-col flex-grow">
        {/* Category */}
        <span className="text-[11px] font-medium tracking-wider text-indigo-600 uppercase font-sans mb-1.5">
          {product.category}
        </span>

        {/* Title */}
        <h3 className="font-sans font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors text-base line-clamp-1 mb-1">
          {product.name}
        </h3>

        {/* Description */}
        <p className="text-xs text-gray-500 font-sans line-clamp-2 mb-4 leading-relaxed">
          {product.description}
        </p>

        <div className="mt-auto flex items-center justify-between">
          {/* Price (Formatted to BDT or standard formatting) */}
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 font-sans">Price</span>
            <span className="font-mono font-bold text-lg text-gray-900">
              ₹ {product.price.toLocaleString("en-BD")}
            </span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold text-amber-800 font-sans">{product.rating}</span>
          </div>
        </div>
      </div>

      {/* Hover Action Strip */}
      <div className="px-4 pb-4 md:px-5 md:pb-5">
        <button
          id={`add-to-cart-btn-${product.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product);
          }}
          disabled={product.stock === 0}
          className="w-full bg-gray-50 hover:bg-indigo-600 group-hover:bg-indigo-50 hover:text-white border border-gray-100 group-hover:border-indigo-100 hover:border-indigo-600 rounded-xl py-2 px-3 text-xs font-sans font-medium text-gray-700 flex items-center justify-center gap-2 transition-all duration-200"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          <span>Add to Cart</span>
        </button>
      </div>
    </motion.div>
  );
}
