import React, { useState, useRef } from "react";
import { X, Upload, Camera, Loader, Search, RefreshCw, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product } from "../types";

interface ImageSearchProps {
  onClose: () => void;
  allProducts: Product[];
  onFilterResults: (matchedIds: string[], query: string) => void;
}

export default function ImageSearch({ onClose, allProducts, onFilterResults }: ImageSearchProps) {
  const [dragActive, setDragActive] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [identifiedName, setIdentifiedName] = useState<string | null>(null);
  const [matchedProducts, setMatchedProducts] = useState<Product[]>([]);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setAnalysisError("Please select a valid image file.");
      return;
    }
    setImageFile(file);
    setAnalysisError(null);
    setIdentifiedName(null);
    setMatchedProducts([]);

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Convert files or dataURLs to clean base64 to send to server
  const analyzeImage = async () => {
    if (!imagePreview) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch("/api/gemini/search-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imagePreview,
          allProducts: allProducts
        })
      });

      if (!response.ok) {
        throw new Error("Failed to analyze image with server");
      }

      const data = await response.json();
      setIdentifiedName(data.identifiedName || "Product found");
      
      const matched = allProducts.filter(p => data.matches.includes(p.id));
      setMatchedProducts(matched);

      if (matched.length > 0) {
        // Trigger parent filter update so user sees these results in their main feed too
        onFilterResults(data.matches, data.identifiedName || "");
      } else {
        setAnalysisError("Gemini identified the product, but we don't have perfect matches in our active catalog.");
      }
    } catch (error: any) {
      console.error("Image analysis error:", error);
      setAnalysisError("AI analysis failed. Please verify your GEMINI_API_KEY is configured.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImageFile(null);
    setImagePreview(null);
    setIdentifiedName(null);
    setMatchedProducts([]);
    setAnalysisError(null);
  };

  return (
    <div id="image-search-modal" className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl overflow-hidden w-full max-w-xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] font-sans"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-lg text-gray-800">Visual Search</h2>
          </div>
          <button
            id="close-image-search-btn"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          <p className="text-xs text-gray-500 text-center">
            Upload an image of a sneaker, gadget, keyboard, or decor, and Gemini will scan our inventory to find similar matches instantly.
          </p>

          {/* Upload Drop Zone */}
          {!imagePreview ? (
            <div
              id="upload-dropzone"
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-indigo-600 bg-indigo-50/50"
                  : "border-gray-300 hover:border-indigo-500 hover:bg-gray-50/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="bg-indigo-50 p-4 rounded-full w-fit mx-auto text-indigo-600 mb-3">
                <Upload className="h-6 w-6" />
              </div>
              <p className="font-medium text-gray-700 text-sm">Drag and drop your image here</p>
              <p className="text-xs text-gray-400 mt-1">or click to browse from files</p>
            </div>
          ) : (
            /* Selected Image Preview */
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden max-h-64 bg-gray-50 flex items-center justify-center">
                <img
                  src={imagePreview}
                  alt="Selected preview"
                  className="max-h-64 object-contain rounded-2xl"
                />
                <button
                  id="reset-image-search-btn"
                  onClick={handleReset}
                  className="absolute top-3 right-3 bg-white/80 hover:bg-white p-2 rounded-full shadow-md text-gray-700 transition-colors"
                  title="Remove image"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              {/* Action Buttons */}
              {!identifiedName && !isAnalyzing && (
                <button
                  id="start-image-analysis-btn"
                  onClick={analyzeImage}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-xl shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
                >
                  <Search className="h-4 w-4" />
                  Analyze Image
                </button>
              )}

              {isAnalyzing && (
                <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-3 rounded-xl flex items-center justify-center gap-2 text-sm">
                  <Loader className="h-4 w-4 animate-spin" />
                  Analyzing visual features with Gemini...
                </div>
              )}
            </div>
          )}

          {/* Analysis Error */}
          {analysisError && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs text-center">
              {analysisError}
            </div>
          )}

          {/* Analysis Results Display */}
          {identifiedName && (
            <div className="space-y-4 border-t border-gray-100 pt-5">
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center justify-between text-xs">
                <span className="text-green-800">
                  AI Identification: <strong>"{identifiedName}"</strong>
                </span>
                <span className="bg-green-100 text-green-900 font-medium px-2 py-0.5 rounded-full text-[10px]">
                  Match Complete
                </span>
              </div>

              {matchedProducts.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-gray-500">
                    Matches Found in Store
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {matchedProducts.map((prod) => (
                      <div
                        key={prod.id}
                        className="border border-gray-100 hover:border-indigo-100 rounded-xl p-2 bg-gray-50/50 flex items-center gap-2.5 transition-colors cursor-pointer"
                        onClick={() => {
                          onFilterResults([prod.id], prod.name);
                          onClose();
                        }}
                      >
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="h-12 w-12 rounded-lg object-cover bg-white"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs text-gray-800 truncate">
                            {prod.name}
                          </p>
                          <p className="text-[10px] text-gray-500 font-semibold font-mono">
                            ₹ {prod.price.toLocaleString("en-BD")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    id="apply-filter-view-btn"
                    onClick={onClose}
                    className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium py-2 rounded-xl text-xs transition-colors mt-2"
                  >
                    View All Matching Store Products
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center">
                  No direct matches in our active database catalog.
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
