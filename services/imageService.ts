import { ImageItem } from '../types';
import { GLOBE_RADIUS, MAX_IMAGES } from '../constants';

export const generateGlobeImages = (customUrls?: string[]): ImageItem[] => {
  const images: ImageItem[] = [];
  const count = customUrls ? Math.min(customUrls.length, MAX_IMAGES) : MAX_IMAGES;
  const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

  for (let i = 0; i < count; i++) {
    const isUploaded = !!customUrls;
    const url = customUrls ? customUrls[i] : `https://picsum.photos/300/300?random=${i}`;
    
    // Fibonacci Sphere Algorithm
    // y goes from 1 to -1
    const y = 1 - (i / (count - 1)) * 2; 
    
    // theta is longitude
    const theta = phi * i;

    // Convert to CSS Rotation angles
    // Longitude (Y-axis rotation)
    const rotY = (theta * 180) / Math.PI;
    // Latitude (X-axis rotation) - asin(y) gives the elevation angle
    const rotX = (Math.asin(y) * 180) / Math.PI;

    // We rotate the object to face the center (or out from center)
    // rotateY spins it around the pole
    // rotateX tilts it up/down
    // translateZ pushes it out to the sphere surface
    const transform = `rotateY(${rotY}deg) rotateX(${-rotX}deg) translateZ(${GLOBE_RADIUS}px)`;

    images.push({
      id: `img-${i}`,
      url,
      isUploaded,
      transform,
      rotX,
      rotY
    });
  }
  return images;
};