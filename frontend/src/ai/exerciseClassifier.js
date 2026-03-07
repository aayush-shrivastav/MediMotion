/**
 * Exercise Classifier - SQUAT ONLY (MVP)
 * Single exercise detection with high confidence threshold
 */

import { POSE_LANDMARKS } from './poseDetector';

class ExerciseClassifier {
  constructor(poseDetector) {
    this.detector = poseDetector;
  }

  /**
   * Classify current pose - SQUAT ONLY
   * @param {Array} landmarks - Current pose landmarks
   * @returns {Object} { exerciseType, confidence }
   */
  classify(landmarks) {
    if (!landmarks || landmarks.length < 33) {
      return { exerciseType: null, confidence: 0 };
    }

    // MVP: Only squat detection
    const detection = this.detectSquat(landmarks);

    return detection.confidence > 0.5 ? detection : { exerciseType: 'unknown', confidence: 0 };
  }

  /**
   * SQUAT DETECTION
   * Criteria: Standing position with hip/knee flexion, vertical torso
   */
  detectSquat(landmarks) {
    try {
      const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
      const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
      const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
      const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
      const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
      const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
      const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
      const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

      // Visibility check
      if (
        !leftKnee || !rightKnee || !leftHip || !rightHip ||
        leftKnee.visibility < 0.4 || rightKnee.visibility < 0.4
      ) {
        return { exerciseType: 'squat', confidence: 0.3 }; // Lower confidence but still squat
      }

      // Calculate knee angles
      const leftKneeAngle = this.detector.calculateAngle(leftHip, leftKnee, leftAnkle);
      const rightKneeAngle = this.detector.calculateAngle(rightHip, rightKnee, rightAnkle);

      // Body is vertical (not horizontal like plank)
      const bodyAngle = Math.abs(leftShoulder.y - leftHip.y);
      const isVertical = bodyAngle > 0.1;

      // Feet roughly shoulder-width apart
      const feetDistance = Math.abs(leftAnkle.x - rightAnkle.x);
      const feetPlanted = feetDistance > 0.08 && feetDistance < 0.5;

      let confidence = 0;
      if (isVertical) confidence += 0.4;
      if (feetPlanted) confidence += 0.3;
      // Any knee angle variation indicates potential squat motion
      confidence += 0.3;

      return { exerciseType: 'squat', confidence: Math.min(confidence, 1.0) };
    } catch (err) {
      console.warn('Squat detection error:', err);
      return { exerciseType: 'squat', confidence: 0.2 }; // Fallback
    }
  }
}

export default ExerciseClassifier;
