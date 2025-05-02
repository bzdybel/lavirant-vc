import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showZoom, setShowZoom] = useState(false);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const toggleZoom = () => {
    setShowZoom(!showZoom);
  };

  return (
    <div className="relative">
      {/* Main image with zoom capability */}
      <div 
        className="rounded-lg overflow-hidden shadow-lg relative cursor-zoom-in"
        onClick={toggleZoom}
      >
        <img 
          src={images[currentIndex]} 
          alt={`Gallery image ${currentIndex + 1}`} 
          className="w-full h-auto object-cover"
        />
        <button 
          className="absolute bottom-4 right-4 bg-white/70 p-2 rounded-full text-gray-800 hover:bg-white transition-colors z-10"
          onClick={(e) => {
            e.stopPropagation();
            toggleZoom();
          }}
        >
          <ZoomIn className="h-5 w-5" />
        </button>
      </div>

      {/* Thumbnail navigation */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        {images.map((img, index) => (
          <div 
            key={index}
            className={`
              rounded-md overflow-hidden cursor-pointer border-2 
              ${currentIndex === index ? 'border-secondary-500' : 'border-transparent'}
            `}
            onClick={() => setCurrentIndex(index)}
          >
            <img 
              src={img} 
              alt={`Thumbnail ${index + 1}`} 
              className="w-full h-20 object-cover"
            />
          </div>
        ))}
      </div>

      {/* Navigation buttons */}
      <button 
        className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/70 p-2 rounded-full text-gray-800 hover:bg-white transition-colors"
        onClick={handlePrevious}
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button 
        className="absolute top-1/2 right-2 -translate-y-1/2 bg-white/70 p-2 rounded-full text-gray-800 hover:bg-white transition-colors"
        onClick={handleNext}
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Zoom modal */}
      <AnimatePresence>
        {showZoom && (
          <motion.div 
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleZoom}
          >
            <motion.img 
              src={images[currentIndex]} 
              alt={`Zoomed image ${currentIndex + 1}`} 
              className="max-w-[90%] max-h-[90vh] object-contain"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={(e) => e.stopPropagation()}
            />
            <button 
              className="absolute top-4 right-4 bg-white/10 p-2 rounded-full text-white hover:bg-white/30 transition-colors"
              onClick={toggleZoom}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
            </button>
            <button 
              className="absolute top-1/2 left-4 -translate-y-1/2 bg-white/10 p-2 rounded-full text-white hover:bg-white/30 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <button 
              className="absolute top-1/2 right-4 -translate-y-1/2 bg-white/10 p-2 rounded-full text-white hover:bg-white/30 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
