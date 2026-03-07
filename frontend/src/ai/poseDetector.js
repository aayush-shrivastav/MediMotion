/**
 * Pose Detection Module using MediaPipe Pose
 * Handles camera access, pose landmark extraction, and normalization
 */

import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';

class PoseDetector {
  constructor() {
    this.pose = null;
    this.camera = null;
    this.isInitialized = false;
    this.onResults = null;
    this.landmarks = null;
  }

  /**
   * Initialize MediaPipe Pose
   */
  async initialize() {
    if (this.isInitialized) return;

    this.pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    this.pose.setOptions({
      modelComplexity: 1, // 0, 1, or 2. Higher = more accurate but slower
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    let frameCounter = 0;
    this.pose.onResults((results) => {
      frameCounter++;
      if (frameCounter <= 3) {
        console.log(`Pose results ${frameCounter}:`, {
          hasPoseLandmarks: !!results.poseLandmarks,
          landmarksCount: results.poseLandmarks?.length
        });
      }
      
      if (results.poseLandmarks) {
        this.landmarks = this.normalizeLandmarks(results.poseLandmarks);
        if (this.onResults) {
          this.onResults(this.landmarks);
        }
      }
    });

    this.isInitialized = true;
  }

  /**
   * Start camera and pose detection
   * @param {HTMLVideoElement} videoElement - Video element to stream camera
   * @param {Function} callback - Called on each frame with landmarks
   */
  async startCamera(videoElement, callback) {
    if (!videoElement) {
      throw new Error('Video element is required');
    }

    await this.initialize();
    this.onResults = callback;

    // Ensure camera is not already running
    if (this.camera) {
      try {
        this.camera.stop();
      } catch (e) {
        console.warn('Error stopping existing camera:', e);
      }
      this.camera = null;
    }

    try {
      // Ensure video element is properly configured
      videoElement.setAttribute('playsinline', '');
      videoElement.setAttribute('autoplay', '');
      videoElement.setAttribute('muted', '');

      console.log('Configuring video element:', {
        hasElement: !!videoElement,
        tagName: videoElement.tagName,
        readyState: videoElement.readyState,
        width: videoElement.width,
        height: videoElement.height
      });

      // Create Camera with MediaPipe - it handles permissions internally
      this.camera = new Camera(videoElement, {
        onFrame: async () => {
          if (this.pose && videoElement && videoElement.readyState >= 2) {
            try {
              await this.pose.send({ image: videoElement });
            } catch (e) {
              console.warn('Pose detection frame error:', e);
            }
          }
        },
        width: 640,
        height: 480,
        facingMode: 'user'
      });

      console.log('Camera instance created, starting...');
      await this.camera.start();
      console.log('Camera started successfully, video ready:', {
        readyState: videoElement.readyState,
        width: videoElement.width,
        height: videoElement.height,
        srcObject: !!videoElement.srcObject
      });
    } catch (err) {
      console.error('Camera initialization error:', err);
      
      // Map browser errors to user-friendly messages
      if (err.name === 'NotAllowedError') {
        throw new Error('Permission denied. Please allow camera access when prompted.');
      } else if (err.name === 'NotFoundError') {
        throw new Error('No camera device found. Please connect a camera.');
      } else if (err.name === 'NotReadableError') {
        throw new Error('Camera is already in use by another app. Please close it and try again.');
      } else if (err.name === 'SecurityError') {
        throw new Error('HTTPS required for camera access. Please use a secure connection.');
      } else {
        throw new Error(`Camera error: ${err.message || err.name}`);
      }
    }
  }

  /**
   * Stop camera and detection
   */
  stopCamera() {
    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }
    this.onResults = null;
    this.landmarks = null;
  }

  /**
   * Normalize landmarks to device-independent coordinates
   * @param {Array} rawLandmarks - Raw landmarks from MediaPipe
   * @returns {Array} Normalized landmarks
   */
  normalizeLandmarks(rawLandmarks) {
    // MediaPipe landmarks are already normalized 0-1 for x,y
    // z is relative depth
    return rawLandmarks.map((lm, index) => ({
      index,
      x: lm.x,
      y: lm.y,
      z: lm.z,
      visibility: lm.visibility || 1.0
    }));
  }

  /**
   * Calculate angle between three points
   * @param {Object} a - First point {x, y}
   * @param {Object} b - Middle point {x, y}
   * @param {Object} c - Third point {x, y}
   * @returns {Number} Angle in degrees
   */
  calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - 
                    Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    
    return angle;
  }

  /**
   * Calculate distance between two points
   * @param {Object} a - First point {x, y, z}
   * @param {Object} b - Second point {x, y, z}
   * @returns {Number} Euclidean distance
   */
  calculateDistance(a, b) {
    return Math.sqrt(
      Math.pow(b.x - a.x, 2) + 
      Math.pow(b.y - a.y, 2) + 
      Math.pow(b.z - a.z, 2)
    );
  }

  /**
   * Get current landmarks
   * @returns {Array} Current pose landmarks
   */
  getCurrentLandmarks() {
    return this.landmarks;
  }

  /**
   * Check if pose is detected
   * @returns {Boolean}
   */
  isPoseDetected() {
    return this.landmarks !== null && this.landmarks.length > 0;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopCamera();
    if (this.pose) {
      this.pose.close();
      this.pose = null;
    }
    this.isInitialized = false;
  }
}

// MediaPipe Pose Landmark indices
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32
};

export default PoseDetector;
