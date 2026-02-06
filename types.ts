export interface Position {
  x: number;
  y: number;
}

export interface ImageItem {
  id: string;
  url: string;
  isUploaded: boolean;
  transform: string; // CSS transform string for 3D positioning
  rotX: number; // Latitude angle in degrees
  rotY: number; // Longitude angle in degrees
}

export interface CameraState {
  rotationX: number;
  rotationY: number;
  scale: number;
}