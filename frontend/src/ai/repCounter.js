/**
 * Rep Counter - State machine for counting exercise repetitions
 * Handles all 8 exercise types with appropriate counting logic
 */

import { POSE_LANDMARKS } from './poseDetector';

class RepCounter {
  constructor(exerciseType, poseDetector) {
    this.exerciseType = exerciseType.toLowerCase();
    this.detector = poseDetector;
    this.state = 'NEUTRAL'; // NEUTRAL, DOWN, UP, HOLD
    this.repCount = 0;
    this.holdDuration = 0;
    this.isHolding = false;
    this.holdStartTime = null;
    this.lastStateChangeTime = Date.now();
    this.minStateTime = 300; // Minimum ms between state changes (prevent double counting)
  }

  /**
   * Process new frame and update rep count or duration
   * @param {Array} landmarks - Current pose landmarks
   * @returns {Object} { reps, duration, state }
   */
  processFrame(landmarks) {
    if (!landmarks || landmarks.length < 33) {
      return this.getStatus();
    }

    switch (this.exerciseType) {
      case 'squat':
        return this.countSquat(landmarks);
      case 'pushup':
        return this.countPushUp(landmarks);
      case 'lunge':
        return this.countLunge(landmarks);
      case 'sittostand':
        return this.countSitToStand(landmarks);
      case 'shoulderraise':
        return this.countShoulderRaise(landmarks);
      case 'frontarmraise':
        return this.countFrontArmRaise(landmarks);
      case 'plank':
        return this.countPlank(landmarks);
      case 'wallsit':
        return this.countWallSit(landmarks);
      default:
        return this.getStatus();
    }
  }

  /**
   * Count squat reps based on knee angle
   */
  countSquat(landmarks) {
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

    // Check visibility - if key joints not visible, skip counting
    if (leftKnee.visibility < 0.5 || rightKnee.visibility < 0.5 ||
        leftHip.visibility < 0.5 || rightHip.visibility < 0.5) {
      return this.getStatus();
    }

    const leftKneeAngle = this.detector.calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = this.detector.calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

    // State machine
    if (avgKneeAngle < 100 && this.state !== 'DOWN' && this.canChangeState()) {
      this.state = 'DOWN';
      this.lastStateChangeTime = Date.now();
    } else if (avgKneeAngle > 160 && this.state === 'DOWN' && this.canChangeState()) {
      this.state = 'UP';
      this.repCount++;
      this.lastStateChangeTime = Date.now();
    }

    return this.getStatus();
  }

  /**
   * Count push-up reps based on elbow angle
   */
  countPushUp(landmarks) {
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
    const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
    const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
    const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];

    // Check visibility - if key joints not visible, skip counting
    if (leftElbow.visibility < 0.5 || rightElbow.visibility < 0.5 ||
        leftShoulder.visibility < 0.5 || rightShoulder.visibility < 0.5) {
      return this.getStatus();
    }

    const leftElbowAngle = this.detector.calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = this.detector.calculateAngle(rightShoulder, rightElbow, rightWrist);
    const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;

    // Down position: elbows bent
    if (avgElbowAngle < 90 && this.state !== 'DOWN' && this.canChangeState()) {
      this.state = 'DOWN';
      this.lastStateChangeTime = Date.now();
    } 
    // Up position: elbows extended
    else if (avgElbowAngle > 160 && this.state === 'DOWN' && this.canChangeState()) {
      this.state = 'UP';
      this.repCount++;
      this.lastStateChangeTime = Date.now();
    }

    return this.getStatus();
  }

  /**
   * Count lunge reps (alternating legs)
   */
  countLunge(landmarks) {
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

    // Check visibility
    if (leftKnee.visibility < 0.5 || rightKnee.visibility < 0.5 ||
        leftHip.visibility < 0.5 || rightHip.visibility < 0.5) {
      return this.getStatus();
    }

    const leftKneeAngle = this.detector.calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = this.detector.calculateAngle(rightHip, rightKnee, rightAnkle);

    // Detect lunge: one knee significantly more bent than the other
    const angleDiff = Math.abs(leftKneeAngle - rightKneeAngle);
    const minAngle = Math.min(leftKneeAngle, rightKneeAngle);

    if (minAngle < 110 && angleDiff > 20 && this.state !== 'DOWN' && this.canChangeState()) {
      this.state = 'DOWN';
      this.lastStateChangeTime = Date.now();
    } else if (minAngle > 160 && this.state === 'DOWN' && this.canChangeState()) {
      this.state = 'UP';
      this.repCount++;
      this.lastStateChangeTime = Date.now();
    }

    return this.getStatus();
  }

  /**
   * Count sit-to-stand reps
   */
  countSitToStand(landmarks) {
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];

    // Check visibility
    if (leftHip.visibility < 0.5 || leftKnee.visibility < 0.5 || leftAnkle.visibility < 0.5) {
      return this.getStatus();
    }

    const kneeAngle = this.detector.calculateAngle(leftHip, leftKnee, leftAnkle);
    const hipHeight = leftHip.y;
    const kneeHeight = leftKnee.y;

    // Sitting: hip at or above knee level, knees bent
    const isSitting = hipHeight >= kneeHeight - 0.05 && kneeAngle < 110;
    
    // Standing: hip below knees, legs extended
    const isStanding = hipHeight < kneeHeight - 0.1 && kneeAngle > 160;

    if (isSitting && this.state !== 'DOWN' && this.canChangeState()) {
      this.state = 'DOWN';
      this.lastStateChangeTime = Date.now();
    } else if (isStanding && this.state === 'DOWN' && this.canChangeState()) {
      this.state = 'UP';
      this.repCount++;
      this.lastStateChangeTime = Date.now();
    }

    return this.getStatus();
  }

  /**
   * Count shoulder side raise reps
   */
  countShoulderRaise(landmarks) {
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
    const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];

    // Check visibility
    if (leftShoulder.visibility < 0.5 || rightShoulder.visibility < 0.5 ||
        leftWrist.visibility < 0.5 || rightWrist.visibility < 0.5) {
      return this.getStatus();
    }

    // Check if arms are raised to shoulder level
    const leftArmHeight = leftShoulder.y - leftWrist.y;
    const rightArmHeight = rightShoulder.y - rightWrist.y;
    const avgArmHeight = (leftArmHeight + rightArmHeight) / 2;

    // Arms down
    if (avgArmHeight < 0.1 && this.state !== 'DOWN' && this.canChangeState()) {
      this.state = 'DOWN';
      this.lastStateChangeTime = Date.now();
    }
    // Arms raised to shoulder level or higher
    else if (avgArmHeight > 0.2 && this.state === 'DOWN' && this.canChangeState()) {
      this.state = 'UP';
      this.repCount++;
      this.lastStateChangeTime = Date.now();
    }

    return this.getStatus();
  }

  /**
   * Count front arm raise reps
   */
  countFrontArmRaise(landmarks) {
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
    const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];

    // Check visibility
    if (leftShoulder.visibility < 0.5 || rightShoulder.visibility < 0.5 ||
        leftWrist.visibility < 0.5 || rightWrist.visibility < 0.5) {
      return this.getStatus();
    }

    // Check if arms are raised in front
    const leftArmHeight = leftShoulder.y - leftWrist.y;
    const rightArmHeight = rightShoulder.y - rightWrist.y;
    const avgArmHeight = (leftArmHeight + rightArmHeight) / 2;

    // Similar to shoulder raise but also check forward position
    const leftArmForward = leftWrist.z < leftShoulder.z;
    const rightArmForward = rightWrist.z < rightShoulder.z;
    const armsForward = leftArmForward || rightArmForward;

    if (avgArmHeight < 0.1 && this.state !== 'DOWN' && this.canChangeState()) {
      this.state = 'DOWN';
      this.lastStateChangeTime = Date.now();
    } else if (avgArmHeight > 0.15 && armsForward && this.state === 'DOWN' && this.canChangeState()) {
      this.state = 'UP';
      this.repCount++;
      this.lastStateChangeTime = Date.now();
    }

    return this.getStatus();
  }

  /**
   * Track plank hold duration
   */
  countPlank(landmarks) {
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];

    // Check visibility
    if (leftShoulder.visibility < 0.5 || leftHip.visibility < 0.5 || leftAnkle.visibility < 0.5) {
      this.isHolding = false;
      this.holdStartTime = null;
      this.state = 'NEUTRAL';
      return this.getStatus();
    }

    // Check if in proper plank position
    const shoulderHipDistance = Math.abs(leftShoulder.y - leftHip.y);
    const hipAnkleDistance = Math.abs(leftHip.y - leftAnkle.y);
    const isHorizontal = shoulderHipDistance < 0.25 && hipAnkleDistance < 0.3;
    const isElevated = leftShoulder.y < 0.7;

    const inPlankPosition = isHorizontal && isElevated;

    if (inPlankPosition && !this.isHolding) {
      this.isHolding = true;
      this.holdStartTime = Date.now();
      this.state = 'HOLD';
    } else if (!inPlankPosition && this.isHolding) {
      this.isHolding = false;
      this.holdStartTime = null;
      this.state = 'NEUTRAL';
    }

    if (this.isHolding && this.holdStartTime) {
      this.holdDuration = Math.floor((Date.now() - this.holdStartTime) / 1000);
    }

    return this.getStatus();
  }

  /**
   * Track wall sit hold duration
   */
  countWallSit(landmarks) {
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

    // Check visibility
    if (leftHip.visibility < 0.5 || leftKnee.visibility < 0.5 || leftAnkle.visibility < 0.5 ||
        rightHip.visibility < 0.5 || rightKnee.visibility < 0.5 || rightAnkle.visibility < 0.5) {
      this.isHolding = false;
      this.holdStartTime = null;
      this.state = 'NEUTRAL';
      return this.getStatus();
    }

    // Check for proper wall sit position
    const leftKneeAngle = this.detector.calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = this.detector.calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

    const kneeAt90 = Math.abs(avgKneeAngle - 90) < 25;
    const hipKneeLevel = Math.abs(leftHip.y - leftKnee.y) < 0.15;

    const inWallSitPosition = kneeAt90 && hipKneeLevel;

    if (inWallSitPosition && !this.isHolding) {
      this.isHolding = true;
      this.holdStartTime = Date.now();
      this.state = 'HOLD';
    } else if (!inWallSitPosition && this.isHolding) {
      this.isHolding = false;
      this.holdStartTime = null;
      this.state = 'NEUTRAL';
    }

    if (this.isHolding && this.holdStartTime) {
      this.holdDuration = Math.floor((Date.now() - this.holdStartTime) / 1000);
    }

    return this.getStatus();
  }

  /**
   * Check if enough time has passed to change state
   */
  canChangeState() {
    return Date.now() - this.lastStateChangeTime > this.minStateTime;
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      reps: this.repCount,
      duration: this.holdDuration,
      state: this.state,
      isHolding: this.isHolding
    };
  }

  /**
   * Reset counter
   */
  reset() {
    this.state = 'NEUTRAL';
    this.repCount = 0;
    this.holdDuration = 0;
    this.isHolding = false;
    this.holdStartTime = null;
    this.lastStateChangeTime = Date.now();
  }
}

export default RepCounter;
