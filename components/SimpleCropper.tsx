import React, { useState, useRef, useEffect } from 'react';

interface SimpleCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImageBase64: string) => void;
  aspectRatio?: number; // width / height
}

export const SimpleCropper: React.FC<SimpleCropperProps> = ({ imageSrc, onCropComplete, aspectRatio = 4/3 }) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const isDragging = useRef(false);
  const startPan = useRef({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const newScale = Math.min(Math.max(0.5, scale - e.deltaY * 0.001), 3);
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startPan.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setOffset({
      x: e.clientX - startPan.current.x,
      y: e.clientY - startPan.current.y,
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const generateCrop = () => {
    if (!imgRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    const targetWidth = 800;
    const targetHeight = targetWidth / aspectRatio;
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Draw logic: mapped from screen coordinates back to image coordinates
    // This is a simplified approximate crop for this demo.
    // For production, exact coordinate mapping is required.
    
    // Clear
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Calculate position relative to the center "window"
    // The visual window is fixed, the image moves behind it.
    
    // We want to draw the image such that what is seen in the "window" is drawn to canvas.
    const image = imgRef.current;
    
    // Center of container
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    
    // Box dimensions
    let boxW = cw * 0.8;
    let boxH = boxW / aspectRatio;
    if (boxH > ch * 0.8) {
      boxH = ch * 0.8;
      boxW = boxH * aspectRatio;
    }
    
    // The "viewport" on screen is (cx - boxW/2, cy - boxH/2) to (cx + boxW/2, cy + boxH/2)
    // The image is at (cx + offset.x, cy + offset.y) scaled by `scale`
    
    // We map the crop area to the original image
    
    // Draw the image onto the new canvas
    // We can simulate this by drawing the image at the offset * (target/box) scale
    
    const renderScale = targetWidth / boxW;
    
    ctx.save();
    // Move to center of canvas
    ctx.translate(targetWidth / 2, targetHeight / 2);
    // Apply offset and scale
    ctx.translate(offset.x * renderScale, offset.y * renderScale);
    ctx.scale(scale * renderScale, scale * renderScale);
    // Draw centered
    ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    ctx.restore();

    onCropComplete(canvas.toDataURL('image/jpeg', 0.85));
  };

  return (
    <div className="flex flex-col gap-4">
      <div 
        ref={containerRef}
        className="relative w-full h-80 bg-gray-900 rounded-xl overflow-hidden cursor-move flex items-center justify-center shadow-inner"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <img 
          ref={imgRef}
          src={imageSrc} 
          alt="To crop" 
          className="absolute origin-center transition-transform duration-75 pointer-events-none select-none"
          style={{ 
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          }}
          draggable={false}
        />
        
        {/* Overlay with a hole */}
        <div className="absolute inset-0 pointer-events-none bg-black/60">
           {/* This implementation uses a simple centered transparent box approach */}
        </div>
        
        {/* The Crop Box Frame */}
        <div 
          className="absolute border-2 border-white pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
          style={{
             width: '80%',
             aspectRatio: `${aspectRatio}`,
             maxWidth: '100%',
             maxHeight: '100%'
          }}
        />
      </div>

      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">Scroll to Zoom, Drag to Move</p>
        <button 
          onClick={generateCrop}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm transition shadow-lg shadow-indigo-500/30"
        >
          Confirm Crop
        </button>
      </div>
    </div>
  );
};