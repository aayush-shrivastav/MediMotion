/**
 * Exercise Verifier - Main coordinator for AI exercise verification
 * SQUAT ONLY - MVP version
 * Integrates pose detection, rep counting, and form analysis
 * Captures pose landmarks + keyframes for audit trail
 */

import PoseDetector from './poseDetector';
import ExerciseClassifier from './exerciseClassifier';
import RepCounter from './repCounter';
import FormAnalyzer from './formAnalyzer';

class ExerciseVerifier {
  constructor(exerciseType) {
    this.exerciseType = 'squat'; // MVP: Force squat only
    this.poseDetector = new PoseDetector();
    this.classifier = new ExerciseClassifier(this.poseDetector);
    this.repCounter = new RepCounter(this.exerciseType, this.poseDetector);
    this.formAnalyzer = new FormAnalyzer(this.exerciseType, this.poseDetector);
    
    this.isRunning = false;
    this.sessionStartTime = null;
    this.currentLandmarks = null;
    this.currentFormAccuracy = 0;
    this.currentFeedback = [];
    this.currentBreakdown = null;
    this.frameCount = 0;
    
    // Capture landmarks and keyframes for audit trail
    this.poseLandmarksHistory = [];
    this.keyframeBlobs = [];
    this.formBreakdownHistory = [];
    this.videoElement = null;
    
    // Callbacks
    this.onUpdate = null;
    this.onComplete = null;
  }

  /**
   * Start exercise verification session
   * @param {HTMLVideoElement} videoElement - Video element for camera
   * @param {Function} onUpdate - Callback for real-time updates
   */
  async start(videoElement, onUpdate) {
    if (this.isRunning) return;

    if (!videoElement) {
      throw new Error('Video element is required to start verification');
    }

    try {
      this.isRunning = true;
      this.sessionStartTime = Date.now();
      this.onUpdate = onUpdate;
      this.videoElement = videoElement;
      this.poseLandmarksHistory = [];
      this.keyframeBlobs = [];
      this.repCounter.reset();
      this.formAnalyzer.reset();
      this.formBreakdownHistory = [];

      // Start pose detection
      await this.poseDetector.startCamera(videoElement, (landmarks) => {
        this.processFrame(landmarks);
      });
    } catch (err) {
      this.isRunning = false;
      console.error('Verification start error:', err);
      throw err;
    }
  }

  /**
   * Process each frame from pose detector
   * @param {Array} landmarks - Pose landmarks
   */
  processFrame(landmarks) {
    if (!this.isRunning) return;

    this.currentLandmarks = landmarks;
    this.frameCount++;

    if (this.frameCount <= 3) {
      console.log(`Frame ${this.frameCount}: Received ${landmarks?.length} landmarks`);
    }

    // Only analyze every few frames for performance (15 FPS effectively)
    if (this.frameCount % 2 !== 0) return;

    try {
      // Verify exercise type (should always be squat in MVP)
      const detection = this.classifier.classify(landmarks);
      const confidenceScore = detection.confidence;

      if (this.frameCount <= 10) {
        console.log(`Detection ${this.frameCount}:`, {
          detected: detection.exerciseType,
          confidence: detection.confidence
        });
      }

      // Count reps or track duration
      const repStatus = this.repCounter.processFrame(landmarks);

      // Analyze form quality
      const formAnalysis = this.formAnalyzer.analyzeForm(landmarks);
      this.currentFormAccuracy = formAnalysis.formAccuracy;
      this.currentFeedback = formAnalysis.feedback;
      this.currentBreakdown = this.mapBreakdown(formAnalysis.breakdown);

      if (this.frameCount <= 10) {
        console.log(`Form ${this.frameCount}:`, {
          accuracy: formAnalysis.formAccuracy,
          feedbackCount: formAnalysis.feedback.length
        });
      }

      // **CAPTURE LANDMARKS FOR AUDIT TRAIL**
      // Store every 15th frame
      if (this.frameCount % 15 === 0) {
        this.poseLandmarksHistory.push({
          timestamp: Date.now() - this.sessionStartTime,
          landmarks: landmarks,
          formAccuracy: this.currentFormAccuracy,
          reps: repStatus.reps
        });

        if (this.currentBreakdown) {
          this.formBreakdownHistory.push(this.currentBreakdown);
        }
      }

      // **CAPTURE KEYFRAMES**
      // Record 4 keyframe images throughout session
      if (this.keyframeBlobs.length < 4 && this.frameCount % 75 === 0) {
        this.captureKeyframe();
      }

      // Send real-time update to UI
      if (this.onUpdate) {
        const updateData = {
          exerciseType: this.exerciseType,
          detectedExercise: detection.exerciseType,
          confidenceScore,
          reps: repStatus.reps,
          duration: repStatus.duration,
          state: repStatus.state,
          isHolding: repStatus.isHolding,
          formAccuracy: this.currentFormAccuracy,
          feedback: this.currentFeedback.slice(0, 2), // Top feedback only
          formBreakdown: this.currentBreakdown,
          sessionTime: Math.floor((Date.now() - this.sessionStartTime) / 1000)
        };
        
        if (this.frameCount <= 10) {
          console.log(`Update ${this.frameCount}:`, {
            reps: updateData.reps,
            formAccuracy: updateData.formAccuracy
          });
        }
        
        this.onUpdate(updateData);
      }
    } catch (err) {
      console.warn('Frame processing error:', err);
      // Don't crash on frame error, continue
    }
  }

  /**
   * Capture keyframe image from video (compressed JPEG for smaller size)
   */
  captureKeyframe() {
    try {
      if (!this.videoElement) return;

      const canvas = document.createElement('canvas');
      // Reduce resolution to 480x360 to minimize file size
      canvas.width = 480;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(this.videoElement, 0, 0, 480, 360);
      
      // Use JPEG compression (0.6 quality = smaller file) instead of PNG
      canvas.toBlob(
        (blob) => {
          if (blob && this.keyframeBlobs.length < 4) {
            this.keyframeBlobs.push(blob);
          }
        },
        'image/jpeg',
        0.6  // Lower quality for smaller size
      );
    } catch (err) {
      console.warn('Keyframe capture error:', err);
    }
  }

  /**
   * Stop verification and generate final results
   * @returns {Object} Final workout verification results
   */
  async stop() {
    if (!this.isRunning) return null;

    this.isRunning = false;

    // Stop camera
    this.poseDetector.stopCamera();

    // Get final stats
    const repStatus = this.repCounter.getStatus();
    const sessionAvgFormAccuracy = this.formAnalyzer.getSessionAverage();
    const finalFeedback = this.generateFinalFeedback(sessionAvgFormAccuracy);

    // Calculate session duration
    const sessionDurationSeconds = Math.floor((Date.now() - this.sessionStartTime) / 1000);

    // Convert keyframes to base64
    let keyframeData = [];
    try {
      keyframeData = await Promise.all(
        this.keyframeBlobs.map(blob => this.blobToBase64(blob))
      );
    } catch (err) {
      console.warn('Keyframe conversion error:', err);
    }

    // Calculate average form breakdown
    const averagedBreakdown = this.calculateAverageBreakdown();

    // Build result object
    const result = {
      exerciseType: this.exerciseType,
      reps: repStatus.reps || 0,
      durationSeconds: sessionDurationSeconds,
      formAccuracy: sessionAvgFormAccuracy,
      formBreakdown: averagedBreakdown,
      feedback: finalFeedback,
      confidenceScore: this.calculateConfidenceScore(repStatus, sessionAvgFormAccuracy),
      timestamp: new Date().toISOString(),
      sessionDurationSeconds,
      // Include audit trail data
      poseLandmarks: this.poseLandmarksHistory,
      keyframeImages: keyframeData
    };

    console.log('Session complete:', {
      reps: result.reps,
      formAccuracy: result.formAccuracy,
      confidence: result.confidenceScore,
      landmarksSamples: this.poseLandmarksHistory.length,
      keyframes: keyframeData.length
    });

    return result;
  }

  mapBreakdown(breakdown) {
    if (!breakdown) return null;

    if (this.exerciseType === 'squat') {
      return {
        depth: breakdown.depth || 0,
        alignment: breakdown.kneeAlignment || 0,
        posture: breakdown.backAngle || 0
      };
    }

    return breakdown;
  }

  calculateAverageBreakdown() {
    if (!this.formBreakdownHistory.length) {
      return { depth: 0, alignment: 0, posture: 0 };
    }

    const totals = this.formBreakdownHistory.reduce(
      (acc, item) => {
        acc.depth += item.depth || 0;
        acc.alignment += item.alignment || 0;
        acc.posture += item.posture || 0;
        return acc;
      },
      { depth: 0, alignment: 0, posture: 0 }
    );

    const count = this.formBreakdownHistory.length;
    return {
      depth: Math.round(totals.depth / count),
      alignment: Math.round(totals.alignment / count),
      posture: Math.round(totals.posture / count)
    };
  }

  /**
   * Generate final feedback summary
   */
  generateFinalFeedback(avgFormAccuracy) {
    const feedback = [];

    if (avgFormAccuracy >= 85) {
      feedback.push("Excellent form throughout!");
      feedback.push("Keep up this quality");
    } else if (avgFormAccuracy >= 70) {
      feedback.push("Good effort with minor form issues");
      feedback.push("Focus on knee depth and alignment");
    } else if (avgFormAccuracy >= 50) {
      feedback.push("Form needs improvement");
      feedback.push("Go deeper - bend knees more");
      feedback.push("Keep knees aligned with toes");
    } else {
      feedback.push("Review proper squat form");
      feedback.push("Watch demonstration video");
      feedback.push("Practice with lighter intensity");
    }

    return feedback.slice(0, 3);
  }

  /**
   * Calculate confidence score
   */
  calculateConfidenceScore(repStatus, formAccuracy) {
    const formConfidence = formAccuracy / 100;
    const activityConfidence = Math.min(repStatus.reps / 5, 1); // Any reps > 5 is good
    const confidence = (formConfidence * 0.6) + (activityConfidence * 0.4);
    return Math.round(confidence * 100) / 100;
  }

  /**
   * Convert blob to base64
   */
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1]; // Remove data:image/png;base64,
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get current real-time stats
   */
  getCurrentStats() {
    const repStatus = this.repCounter.getStatus();
    return {
      reps: repStatus.reps,
      duration: repStatus.duration,
      state: repStatus.state,
      formAccuracy: this.currentFormAccuracy,
      feedback: this.currentFeedback,
      sessionTime: this.sessionStartTime ? 
        Math.floor((Date.now() - this.sessionStartTime) / 1000) : 0
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stop();
    if (this.poseDetector) {
      this.poseDetector.stopCamera();
    }
  }
}

export default ExerciseVerifier;
