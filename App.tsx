import React, { useState, useRef, useCallback } from 'react';
import SpatialCanvas from './components/SpatialCanvas';
import HandTracker from './components/HandTracker';
import { generateGlobeImages } from './services/imageService';
import { CameraState, ImageItem, Position } from './types';
import { INITIAL_SCALE, ZOOMED_OUT_SCALE, MAX_IMAGES } from './constants';
import { Upload, Hand, MousePointer2 } from 'lucide-react';

// Helper to clamp values
const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

// Helper to map ranges
const mapRange = (value: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

const App: React.FC = () => {
  // --- State ---
  const [images, setImages] = useState<ImageItem[]>(() => generateGlobeImages());
  const [isHandTrackingActive, setIsHandTrackingActive] = useState(false);
  
  // Track if user is actively interacting to pause auto-rotation
  const [isInteracting, setIsInteracting] = useState(false);

  // --- Refs ---
  const targetCamera = useRef<CameraState>({ rotationX: 0, rotationY: 0, scale: INITIAL_SCALE });
  const lastInteractPos = useRef<Position | null>(null);

  // --- Hand Tracking Handler ---
  const handleHandMove = useCallback((x: number | null, y: number | null, pinchDistance: number) => {
    // If hand is lost (x/y null), reset interaction state
    if (x === null || y === null) {
      setIsInteracting(false);
      lastInteractPos.current = null;
      // Optionally reset scale here, or let it stay at last state
      // We'll gently drift back to initial scale if hand is removed
      targetCamera.current.scale = INITIAL_SCALE;
      return;
    }

    setIsInteracting(true);

    // 1. Rotation Logic (Continuous on Hand Movement)
    // Check if we have a previous position to calculate delta
    if (lastInteractPos.current) {
      const dx = x - lastInteractPos.current.x;
      const dy = y - lastInteractPos.current.y;
      
      // Sensitivity factor
      const sensitivity = 80;
      targetCamera.current.rotationY += dx * sensitivity; 
      targetCamera.current.rotationX -= dy * sensitivity;
    }
    
    // Update last position
    lastInteractPos.current = { x, y };

    // 2. Zoom Logic (Continuous on Pinch Distance)
    // Distance typically ranges from ~0.02 (closed) to ~0.20 (open)
    // We want: Close = Zoom Out (0.25 scale), Open = Zoom In (1.0 scale)
    
    const distMin = 0.03; // Fully pinched
    const distMax = 0.15; // Open hand
    
    // Clamp distance to expected range
    const clampedDist = clamp(pinchDistance, distMin, distMax);
    
    // Map distance to scale
    // Low dist (pinch) -> Low Scale (ZOOMED_OUT_SCALE)
    // High dist (open) -> High Scale (INITIAL_SCALE)
    const targetScale = mapRange(clampedDist, distMin, distMax, ZOOMED_OUT_SCALE, INITIAL_SCALE);
    
    // Apply to camera
    targetCamera.current.scale = targetScale;

  }, []);

  // --- Mouse Fallback Handlers ---
  const isDraggingMouse = useRef(false);
  const lastMousePos = useRef<Position>({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isHandTrackingActive) return;
    isDraggingMouse.current = true;
    setIsInteracting(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingMouse.current) return;
    
    const dx = (e.clientX - lastMousePos.current.x) / window.innerWidth * 2;
    const dy = (e.clientY - lastMousePos.current.y) / window.innerHeight * 2;

    targetCamera.current.rotationY += dx * 100;
    targetCamera.current.rotationX -= dy * 100;

    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingMouse.current = false;
    setIsInteracting(false);
  };

  // --- Image Upload ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const selectedFiles = files.slice(0, MAX_IMAGES); // Limit count
      
      const promises = selectedFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
      });

      Promise.all(promises).then(urls => {
        const newImages = generateGlobeImages(urls);
        setImages(newImages);
      });
    }
  };

  return (
    <div 
      className="relative w-screen h-screen overflow-hidden bg-white font-sans text-neutral-800 select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 3D Stage */}
      <SpatialCanvas 
        images={images}
        targetCamera={targetCamera}
        isInteracting={isInteracting}
      />

      {/* Hand Controller */}
      <div className="[&_button]:text-neutral-800 [&_button]:border-neutral-300 [&_button]:bg-white/80 [&_div]:text-neutral-800">
        <HandTracker 
            isActive={isHandTrackingActive}
            onToggle={() => setIsHandTrackingActive(!isHandTrackingActive)}
            onHandMove={handleHandMove}
        />
      </div>

      {/* UI Overlay */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50">
        {/* Upload Button */}
        <div className="relative group">
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            className="hidden" 
            id="img-upload"
            onChange={handleImageUpload}
          />
          <label 
            htmlFor="img-upload"
            className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-neutral-50 rounded-full border border-neutral-200 cursor-pointer transition-all shadow-lg hover:shadow-xl text-neutral-800 active:scale-95"
          >
            <Upload size={20} className="text-neutral-600" />
            <span className="font-medium">Upload Photos</span>
          </label>
        </div>
      </div>

      {/* Instructions */}
      <div className="fixed top-8 right-8 text-right space-y-1 pointer-events-none opacity-40 mix-blend-multiply">
        <h1 className="text-xl font-bold tracking-tight text-black">Spatial Globe</h1>
        <p className="text-sm font-medium text-neutral-600">Drag/Move Hand to Rotate • Pinch to Zoom Out</p>
      </div>

       {/* Mode Indicator */}
       <div className="fixed bottom-8 left-8 z-40 pointer-events-none opacity-50 mix-blend-multiply">
        <div className="flex items-center gap-2 text-neutral-800">
          {isHandTrackingActive ? (
            <>
              <Hand size={20} className="text-indigo-600" />
              <span className="text-xs uppercase tracking-wider font-semibold">Hand Control</span>
            </>
          ) : (
            <>
              <MousePointer2 size={20} />
              <span className="text-xs uppercase tracking-wider font-semibold">Mouse Control</span>
            </>
          )}
        </div>
      </div>

    </div>
  );
};

export default App;