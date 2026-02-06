import React, { useEffect, useRef } from 'react';
import { CameraState, ImageItem } from '../types';
import { INITIAL_SCALE } from '../constants';

interface SpatialCanvasProps {
  images: ImageItem[];
  targetCamera: React.MutableRefObject<CameraState>;
  isInteracting: boolean;
}

const SpatialCanvas: React.FC<SpatialCanvasProps> = ({ 
  images, 
  targetCamera,
  isInteracting
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Current interpolated state
  const currentCamera = useRef<CameraState>({ rotationX: 0, rotationY: 0, scale: INITIAL_SCALE });
  
  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      // 1. Auto Rotation (Drift) if not interacting
      if (!isInteracting) {
        targetCamera.current.rotationY += 0.05; // Slow, subtle spin
      }

      // 2. Smooth interpolation (Lerp)
      // Slightly lower factor for smoother "float" feel
      const lerpFactor = 0.08;
      currentCamera.current.rotationX += (targetCamera.current.rotationX - currentCamera.current.rotationX) * lerpFactor;
      currentCamera.current.rotationY += (targetCamera.current.rotationY - currentCamera.current.rotationY) * lerpFactor;
      currentCamera.current.scale += (targetCamera.current.scale - currentCamera.current.scale) * lerpFactor;

      const { rotationX, rotationY, scale } = currentCamera.current;

      // 3. Update Container Transform
      if (contentRef.current) {
        contentRef.current.style.transform = `scale(${scale}) rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;
      }

      // 4. Calculate Depth/Opacity for each item
      const rad = Math.PI / 180;
      const cx = rotationX * rad;
      const cy = rotationY * rad;

      images.forEach((img) => {
        const el = itemRefs.current.get(img.id);
        if (el) {
          const ix = img.rotX * rad;
          const iy = img.rotY * rad;
          
          const thetaTotal = cy + iy;
          const phi = ix;

          // Normal Vector Z-component calculation
          const zNorm = Math.cos(phi) * Math.cos(thetaTotal) * Math.cos(cx) + Math.sin(phi) * Math.sin(cx);

          // Calculate Opacity
          let visualOpacity = 1;
          if (zNorm < 0.2) {
             visualOpacity = Math.max(0.15, 0.15 + (zNorm + 0.2) * 1.5);
          }
          
          el.style.opacity = visualOpacity.toString();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [targetCamera, images, isInteracting]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-white perspective-[1000px] flex items-center justify-center">
      {/* 3D Scene Container */}
      <div 
        ref={contentRef}
        className="relative w-0 h-0 will-change-transform"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {images.map((img) => (
          <div
            key={img.id}
            ref={(el) => {
              if (el) itemRefs.current.set(img.id, el);
              else itemRefs.current.delete(img.id);
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 backface-hidden will-change-opacity"
            style={{
              width: '200px',
              height: '200px',
              transform: img.transform,
              transformStyle: 'preserve-3d',
            }}
          >
            <div className={`w-full h-full p-2 rounded-lg shadow-lg border border-black/5 hover:scale-105 transition-transform duration-300 ${img.isUploaded ? 'bg-transparent' : 'bg-white/40 backdrop-blur-md'}`}>
               <img 
                src={img.url} 
                alt="Globe Item" 
                className={`w-full h-full rounded shadow-sm pointer-events-none select-none ${img.isUploaded ? 'object-contain' : 'object-cover'}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpatialCanvas;