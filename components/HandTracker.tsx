import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { MP_VISION_TASK_URL, HAND_MODEL_URL } from '../constants';
import { Camera, Loader2 } from 'lucide-react';

interface HandTrackerProps {
  onHandMove: (x: number | null, y: number | null, pinchDistance: number) => void;
  isActive: boolean;
  onToggle: () => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onHandMove, isActive, onToggle }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number | null>(null);
  const lastDetectionTime = useRef<number>(0);

  // Initialize MediaPipe
  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(MP_VISION_TASK_URL);
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: HAND_MODEL_URL,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        setIsLoaded(true);
      } catch (err) {
        console.error("Failed to load MediaPipe:", err);
        setError("Failed to load AI model");
      }
    };

    initMediaPipe();

    return () => {
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
    };
  }, []);

  // Detection Loop
  const detect = () => {
    if (!isActive || !videoRef.current || !handLandmarkerRef.current || !canvasRef.current) return;

    if (videoRef.current.readyState >= 2) {
      const results = handLandmarkerRef.current.detectForVideo(videoRef.current, performance.now());
      
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          
          // Debugging Visuals (Optional - currently hidden as per request to remove crosshair/cursor, but this is the debug view on the webcam feed which is small)
          // We'll keep the debug view on the webcam preview for feedback
          const drawingUtils = new DrawingUtils(ctx);
          drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 2
          });
          drawingUtils.drawLandmarks(landmarks, {
            color: "#FF0000",
            lineWidth: 1,
            radius: 3
          });

          // Index tip is 8, Thumb tip is 4
          const indexTip = landmarks[8];
          const thumbTip = landmarks[4];
          
          // Calculate Euclidean distance between index and thumb
          // Coordinates are normalized 0-1
          const distance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
          
          // Hand Position (Center of interaction - use Index tip or mid point)
          // Invert X because webcam is mirrored
          const x = (1 - indexTip.x) * 2 - 1; 
          const y = indexTip.y * 2 - 1;

          onHandMove(x, y, distance);
          lastDetectionTime.current = Date.now();
        } else {
           // If no hand detected for a short grace period, signal loss
           // This prevents jitter if detection flickers for 1 frame
           if (Date.now() - lastDetectionTime.current > 100) {
              onHandMove(null, null, 0);
           }
        }
      }
    }

    requestRef.current = requestAnimationFrame(detect);
  };

  // Start/Stop Camera
  useEffect(() => {
    if (isActive && isLoaded) {
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: 320,
              height: 240,
              facingMode: "user"
            }
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener('loadeddata', detect);
          }
        } catch (err) {
          console.error("Camera error:", err);
          setError("Camera access denied");
        }
      };

      startCamera();
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      // Reset state
      onHandMove(null, null, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isLoaded]);


  return (
    <div className="fixed top-4 left-4 z-50 flex flex-col items-start gap-2">
      <button 
        onClick={onToggle}
        className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border transition-all shadow-sm ${
          isActive 
            ? 'bg-red-50 text-red-600 border-red-200' 
            : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
        }`}
      >
        <Camera size={20} />
        {isActive ? 'Stop Tracking' : 'Start Hand Tracking'}
      </button>
      
      {error && <div className="text-red-400 text-xs px-2">{error}</div>}
      {!isLoaded && isActive && !error && <div className="text-blue-500 text-xs px-2 flex items-center gap-1"><Loader2 className="animate-spin" size={12}/> Loading Model...</div>}

      <div className={`relative overflow-hidden rounded-lg border border-neutral-200 bg-black/5 transition-all duration-500 ${isActive ? 'w-32 h-24 opacity-100 shadow-md' : 'w-0 h-0 opacity-0'}`}>
        <video 
          ref={videoRef} 
          className="absolute inset-0 w-full h-full object-cover -scale-x-100" 
          autoPlay 
          playsInline
          muted
        />
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full object-cover -scale-x-100" 
          width={320} 
          height={240}
        />
      </div>
      
      {isActive && isLoaded && (
        <div className="text-[10px] text-neutral-500 px-2 max-w-[200px]">
          <p>✋ Move hand to rotate</p>
          <p>🤏 Pinch to zoom out</p>
        </div>
      )}
    </div>
  );
};

export default HandTracker;