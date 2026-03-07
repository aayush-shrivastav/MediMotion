/**
 * Form Analyzer - Evaluates exercise form quality and calculates accuracy scores
 * Provides weighted scoring for each exercise type
 */

import { POSE_LANDMARKS } from './poseDetector';

class FormAnalyzer {
  constructor(exerciseType, poseDetector) {
    this.exerciseType = exerciseType.toLowerCase();
    this.detector = poseDetector;
    this.formScores = [];
    this.maxScoresToTrack = 100; // Track last 100 frames for averaging
  }

  /**
   * Analyze form for current frame
   * @param {Array} landmarks - Current pose landmarks
   * @returns {Object} { formAccuracy, feedback, breakdown }
   */
  analyzeForm(landmarks) {
    if (!landmarks || landmarks.length < 33) {
      return { formAccuracy: 0, feedback: [], breakdown: {} };
    }

    // Check minimum visibility threshold - if key joints aren't visible, score is 0
    const keyJoints = [
      POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER,
      POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP,
      POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.RIGHT_KNEE
    ];
    
    const minVisibility = keyJoints.every(idx => landmarks[idx]?.visibility >= 0.5);
    if (!minVisibility) {
      return { formAccuracy: 0, feedback: ['Position your full body in frame for accurate form detection'], breakdown: {} };
    }

    let result;
    switch (this.exerciseType) {
      case 'squat':
        result = this.analyzeSquat(landmarks);
        break;
      case 'pushup':
        result = this.analyzePushUp(landmarks);
        break;
      case 'lunge':
        result = this.analyzeLunge(landmarks);
        break;
      case 'sittostand':
        result = this.analyzeSitToStand(landmarks);
        break;
      case 'shoulderraise':
        result = this.analyzeShoulderRaise(landmarks);
        break;
      case 'frontarmraise':
        result = this.analyzeFrontArmRaise(landmarks);
        break;
      case 'plank':
        result = this.analyzePlank(landmarks);
        break;
      case 'wallsit':
        result = this.analyzeWallSit(landmarks);
        break;
      default:
        result = { formAccuracy: 0, feedback: [], breakdown: {} };
    }

    // Limit feedback to top 1-2 most critical suggestions
    if (result.feedback && result.feedback.length > 2) {
      result.feedback = result.feedback.slice(0, 2);
    }

    // Track scores for session average
    this.formScores.push(result.formAccuracy);
    if (this.formScores.length > this.maxScoresToTrack) {
      this.formScores.shift();
    }

    return result;
  }

  /**
   * Analyze squat form
   * Criteria: Depth, knee alignment, back angle
   */
  analyzeSquat(landmarks) {
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

    // Check joint visibility - must be clearly visible
    if (leftKnee.visibility < 0.6 || rightKnee.visibility < 0.6 ||
        leftHip.visibility < 0.6 || rightHip.visibility < 0.6) {
      return { formAccuracy: 0, feedback: [], breakdown: {} };
    }

    const scores = {};
    const feedback = [];

    // 1. Squat Depth (40%)
    const leftKneeAngle = this.detector.calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = this.detector.calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
    
    if (avgKneeAngle < 90) {
      scores.depth = 100; // Deep squat
    } else if (avgKneeAngle < 110) {
      scores.depth = 85; // Good depth
      feedback.push("Increase squat depth slightly");
    } else if (avgKneeAngle < 130) {
      scores.depth = 60; // Partial squat
      feedback.push("Go lower - aim for thighs parallel to ground");
    } else {
      scores.depth = 30; // Too shallow
      feedback.push("Squat deeper - bend knees more");
    }

    // 2. Knee Alignment (30%)
    const leftKneeAnkleX = Math.abs(leftKnee.x - leftAnkle.x);
    const rightKneeAnkleX = Math.abs(rightKnee.x - rightAnkle.x);
    const avgKneeAlignment = (leftKneeAnkleX + rightKneeAnkleX) / 2;
    
    if (avgKneeAlignment < 0.05) {
      scores.kneeAlignment = 100; // Perfect alignment
    } else if (avgKneeAlignment < 0.1) {
      scores.kneeAlignment = 75;
      feedback.push("Keep knees aligned with toes");
    } else {
      scores.kneeAlignment = 40;
      feedback.push("Knees caving inward - push them out");
    }

    // 3. Back Straightness (30%)
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
    const hipMidX = (leftHip.x + rightHip.x) / 2;
    const backLean = Math.abs(shoulderMidX - hipMidX);
    
    if (backLean < 0.08) {
      scores.backAngle = 100; // Upright
    } else if (backLean < 0.15) {
      scores.backAngle = 75;
      feedback.push("Keep chest up");
    } else {
      scores.backAngle = 50;
      feedback.push("Straighten your back - avoid leaning forward");
    }

    const formAccuracy = Math.round(
      scores.depth * 0.4 + 
      scores.kneeAlignment * 0.3 + 
      scores.backAngle * 0.3
    );

    return { formAccuracy, feedback, breakdown: scores };
  }

  /**
   * Analyze push-up form
   * Criteria: Elbow depth, back straightness, hip alignment
   */
  analyzePushUp(landmarks) {
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
    const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
    const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
    const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];

    // Check joint visibility
    if (leftShoulder.visibility < 0.6 || rightShoulder.visibility < 0.6 ||
        leftElbow.visibility < 0.6 || rightElbow.visibility < 0.6 ||
        leftHip.visibility < 0.6 || rightHip.visibility < 0.6) {
      return { formAccuracy: 0, feedback: [], breakdown: {} };
    }

    const scores = {};
    const feedback = [];

    // 1. Elbow Depth (40%)
    const leftElbowAngle = this.detector.calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = this.detector.calculateAngle(rightShoulder, rightElbow, rightWrist);
    const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;
    
    if (avgElbowAngle < 90) {
      scores.depth = 100;
    } else if (avgElbowAngle < 120) {
      scores.depth = 70;
      feedback.push("Lower chest closer to ground");
    } else {
      scores.depth = 40;
      feedback.push("Bend elbows more - go deeper");
    }

    // 2. Back Straightness (35%)
    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipY = (leftHip.y + rightHip.y) / 2;
    const backStraightness = Math.abs(shoulderY - hipY);
    
    if (backStraightness < 0.15) {
      scores.backStraight = 100;
    } else if (backStraightness < 0.25) {
      scores.backStraight = 65;
      feedback.push("Keep body in straight line");
    } else {
      scores.backStraight = 40;
      feedback.push("Straighten your back - engage core");
    }

    // 3. Hip Alignment (25%)
    const hipAnkleDistance = Math.abs(hipY - leftAnkle.y);
    
    if (hipAnkleDistance < 0.3) {
      scores.hipAlignment = 100;
    } else if (hipAnkleDistance < 0.4) {
      scores.hipAlignment = 70;
      feedback.push("Don't let hips sag");
    } else {
      scores.hipAlignment = 45;
      feedback.push("Lower hips - keep body aligned");
    }

    const formAccuracy = Math.round(
      scores.depth * 0.4 + 
      scores.backStraight * 0.35 + 
      scores.hipAlignment * 0.25
    );

    return { formAccuracy, feedback, breakdown: scores };
  }

  /**
   * Analyze lunge form
   * Criteria: Front knee alignment, torso upright, controlled movement
   */
  analyzeLunge(landmarks) {
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];

    // Check joint visibility
    if (leftHip.visibility < 0.6 || rightHip.visibility < 0.6 ||
        leftKnee.visibility < 0.6 || rightKnee.visibility < 0.6 ||
        leftAnkle.visibility < 0.6 || rightAnkle.visibility < 0.6) {
      return { formAccuracy: 0, feedback: [], breakdown: {} };
    }

    const scores = {};
    const feedback = [];

    // 1. Front Knee Alignment (40%)
    const leftKneeAngle = this.detector.calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = this.detector.calculateAngle(rightHip, rightKnee, rightAnkle);
    const minKneeAngle = Math.min(leftKneeAngle, rightKneeAngle);
    
    if (minKneeAngle < 90) {
      scores.kneeAlignment = 100;
    } else if (minKneeAngle < 110) {
      scores.kneeAlignment = 75;
      feedback.push("Drop front knee slightly lower");
    } else {
      scores.kneeAlignment = 50;
      feedback.push("Lunge deeper - lower your body");
    }

    // 2. Upright Torso (35%)
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
    const hipMidX = (leftHip.x + rightHip.x) / 2;
    const torsoLean = Math.abs(shoulderMidX - hipMidX);
    
    if (torsoLean < 0.08) {
      scores.torsoUpright = 100;
    } else if (torsoLean < 0.15) {
      scores.torsoUpright = 70;
      feedback.push("Keep torso more upright");
    } else {
      scores.torsoUpright = 45;
      feedback.push("Stand up straighter - don't lean forward");
    }

    // 3. Controlled Movement (25%)
    // Check balance - hips should be level
    const hipLevelness = Math.abs(leftHip.y - rightHip.y);
    
    if (hipLevelness < 0.05) {
      scores.balance = 100;
    } else if (hipLevelness < 0.1) {
      scores.balance = 70;
      feedback.push("Keep hips level");
    } else {
      scores.balance = 50;
      feedback.push("Balance your weight evenly");
    }

    const formAccuracy = Math.round(
      scores.kneeAlignment * 0.4 + 
      scores.torsoUpright * 0.35 + 
      scores.balance * 0.25
    );

    return { formAccuracy, feedback, breakdown: scores };
  }

  /**
   * Analyze sit-to-stand form
   */
  analyzeSitToStand(landmarks) {
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];

    // Check joint visibility
    if (leftHip.visibility < 0.6 || leftKnee.visibility < 0.6 ||
        leftAnkle.visibility < 0.6 || leftShoulder.visibility < 0.6 ||
        rightKnee.visibility < 0.6) {
      return { formAccuracy: 0, feedback: [], breakdown: {} };
    }

    const scores = {};
    const feedback = [];

    // 1. Balanced Rise (40%)
    const kneeAngle = this.detector.calculateAngle(leftHip, leftKnee, leftAnkle);
    
    if (kneeAngle > 160 || kneeAngle < 100) {
      scores.balance = 100;
    } else {
      scores.balance = 70;
      feedback.push("Rise with controlled movement");
    }

    // 2. Back Posture (35%)
    const backStraightness = Math.abs(leftShoulder.x - leftHip.x);
    
    if (backStraightness < 0.1) {
      scores.posture = 100;
    } else {
      scores.posture = 65;
      feedback.push("Keep back straight");
    }

    // 3. Knee Extension (25%)
    const leftKneeAngle = this.detector.calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = this.detector.calculateAngle(landmarks[POSE_LANDMARKS.RIGHT_HIP], rightKnee, landmarks[POSE_LANDMARKS.RIGHT_ANKLE]);
    const avgExtension = (leftKneeAngle + rightKneeAngle) / 2;
    
    if (avgExtension > 160) {
      scores.extension = 100;
    } else {
      scores.extension = 70;
      feedback.push("Stand fully upright");
    }

    const formAccuracy = Math.round(
      scores.balance * 0.4 + 
      scores.posture * 0.35 + 
      scores.extension * 0.25
    );

    return { formAccuracy, feedback, breakdown: scores };
  }

  /**
   * Analyze shoulder side raise form
   */
  analyzeShoulderRaise(landmarks) {
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
    const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
    const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
    const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];

    // Check joint visibility
    if (leftShoulder.visibility < 0.6 || rightShoulder.visibility < 0.6 ||
        leftElbow.visibility < 0.6 || rightElbow.visibility < 0.6 ||
        leftWrist.visibility < 0.6 || rightWrist.visibility < 0.6) {
      return { formAccuracy: 0, feedback: [], breakdown: {} };
    }

    const scores = {};
    const feedback = [];

    // 1. Symmetry (40%)
    const leftArmHeight = leftShoulder.y - leftWrist.y;
    const rightArmHeight = rightShoulder.y - rightWrist.y;
    const heightDiff = Math.abs(leftArmHeight - rightArmHeight);
    
    if (heightDiff < 0.05) {
      scores.symmetry = 100;
    } else if (heightDiff < 0.1) {
      scores.symmetry = 70;
      feedback.push("Raise both arms evenly");
    } else {
      scores.symmetry = 45;
      feedback.push("Keep arms at same height");
    }

    // 2. Range of Motion (35%)
    const avgArmHeight = (leftArmHeight + rightArmHeight) / 2;
    
    if (avgArmHeight > 0.25) {
      scores.range = 100;
    } else if (avgArmHeight > 0.15) {
      scores.range = 70;
      feedback.push("Raise arms higher - to shoulder level");
    } else {
      scores.range = 50;
      feedback.push("Lift arms higher");
    }

    // 3. Smooth Movement (25%)
    const leftArmAbduction = Math.abs(leftWrist.x - leftShoulder.x);
    const rightArmAbduction = Math.abs(rightWrist.x - rightShoulder.x);
    const avgAbduction = (leftArmAbduction + rightArmAbduction) / 2;
    
    if (avgAbduction > 0.2) {
      scores.smoothness = 100;
    } else {
      scores.smoothness = 70;
      feedback.push("Extend arms outward fully");
    }

    const formAccuracy = Math.round(
      scores.symmetry * 0.4 + 
      scores.range * 0.35 + 
      scores.smoothness * 0.25
    );

    return { formAccuracy, feedback, breakdown: scores };
  }

  /**
   * Analyze front arm raise form
   */
  analyzeFrontArmRaise(landmarks) {
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST];
    const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
    const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
    const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];

    // Check joint visibility
    if (leftShoulder.visibility < 0.6 || leftWrist.visibility < 0.6 ||
        rightShoulder.visibility < 0.6 || rightWrist.visibility < 0.6 ||
        leftElbow.visibility < 0.6 || rightElbow.visibility < 0.6) {
      return { formAccuracy: 0, feedback: [], breakdown: {} };
    }

    const scores = {};
    const feedback = [];

    // 1. Full Extension (40%)
    const leftArmAngle = this.detector.calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightArmAngle = this.detector.calculateAngle(rightShoulder, rightElbow, rightWrist);
    const avgArmAngle = (leftArmAngle + rightArmAngle) / 2;
    
    if (avgArmAngle > 165) {
      scores.extension = 100;
    } else if (avgArmAngle > 150) {
      scores.extension = 75;
      feedback.push("Straighten arms fully");
    } else {
      scores.extension = 50;
      feedback.push("Extend elbows completely");
    }

    // 2. Height (35%)
    const leftArmHeight = leftShoulder.y - leftWrist.y;
    const rightArmHeight = rightShoulder.y - rightWrist.y;
    const avgHeight = (leftArmHeight + rightArmHeight) / 2;
    
    if (avgHeight > 0.25) {
      scores.height = 100;
    } else if (avgHeight > 0.15) {
      scores.height = 70;
      feedback.push("Raise arms to shoulder level");
    } else {
      scores.height = 50;
      feedback.push("Lift arms higher");
    }

    // 3. Control (25%)
    const leftWristRight = leftWrist.x;
    const rightWristLeft = rightWrist.x;
    const armsSymmetric = Math.abs(leftWristRight - rightWristLeft) < 0.1;
    
    scores.control = armsSymmetric ? 100 : 70;
    if (!armsSymmetric) {
      feedback.push("Keep arms centered");
    }

    const formAccuracy = Math.round(
      scores.extension * 0.4 + 
      scores.height * 0.35 + 
      scores.control * 0.25
    );

    return { formAccuracy, feedback, breakdown: scores };
  }

  /**
   * Analyze plank form
   */
  analyzePlank(landmarks) {
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

    // Check joint visibility
    if (leftShoulder.visibility < 0.6 || rightShoulder.visibility < 0.6 ||
        leftHip.visibility < 0.6 || rightHip.visibility < 0.6 ||
        leftAnkle.visibility < 0.6 || rightAnkle.visibility < 0.6) {
      return { formAccuracy: 0, feedback: [], breakdown: {} };
    }

    const scores = {};
    const feedback = [];

    // 1. Straight Spine (40%)
    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipY = (leftHip.y + rightHip.y) / 2;
    const ankleY = (leftAnkle.y + rightAnkle.y) / 2;
    
    const shoulderHipDiff = Math.abs(shoulderY - hipY);
    const hipAnkleDiff = Math.abs(hipY - ankleY);
    const totalDiff = shoulderHipDiff + hipAnkleDiff;
    
    if (totalDiff < 0.3) {
      scores.spine = 100;
    } else if (totalDiff < 0.5) {
      scores.spine = 65;
      feedback.push("Straighten your body");
    } else {
      scores.spine = 40;
      feedback.push("Engage core - keep body straight");
    }

    // 2. Hip Position (35%)
    if (Math.abs(shoulderY - hipY) < 0.15) {
      scores.hipPosition = 100;
    } else if (hipY > shoulderY + 0.15) {
      scores.hipPosition = 50;
      feedback.push("Lower hips - don't pike up");
    } else {
      scores.hipPosition = 50;
      feedback.push("Raise hips - don't sag");
    }

    // 3. Shoulder Alignment (25%)
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    
    if (shoulderWidth > 0.15 && shoulderWidth < 0.4) {
      scores.shoulders = 100;
    } else {
      scores.shoulders = 75;
      feedback.push("Adjust shoulder width");
    }

    const formAccuracy = Math.round(
      scores.spine * 0.4 + 
      scores.hipPosition * 0.35 + 
      scores.shoulders * 0.25
    );

    return { formAccuracy, feedback, breakdown: scores };
  }

  /**
   * Analyze wall sit form
   */
  analyzeWallSit(landmarks) {
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    // Check joint visibility
    if (leftHip.visibility < 0.6 || rightHip.visibility < 0.6 ||
        leftKnee.visibility < 0.6 || rightKnee.visibility < 0.6 ||
        leftAnkle.visibility < 0.6 || rightAnkle.visibility < 0.6) {
      return { formAccuracy: 0, feedback: [], breakdown: {} };
    }

    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];
    const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];

    const scores = {};
    const feedback = [];

    // 1. Knee Angle ~90° (50%)
    const leftKneeAngle = this.detector.calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = this.detector.calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
    const angleDiff = Math.abs(avgKneeAngle - 90);
    
    if (angleDiff < 10) {
      scores.kneeAngle = 100;
    } else if (angleDiff < 20) {
      scores.kneeAngle = 75;
      feedback.push("Adjust knee angle closer to 90°");
    } else {
      scores.kneeAngle = 50;
      feedback.push("Bend knees to 90 degrees");
    }

    // 2. Back Straightness (30%)
    const backAlignment = Math.abs(leftShoulder.x - leftHip.x);
    
    if (backAlignment < 0.08) {
      scores.back = 100;
    } else if (backAlignment < 0.15) {
      scores.back = 70;
      feedback.push("Press back flat against wall");
    } else {
      scores.back = 45;
      feedback.push("Keep back straight and against wall");
    }

    // 3. Hold Consistency (20%)
    const hipKneeLevel = Math.abs(leftHip.y - leftKnee.y);
    
    if (hipKneeLevel < 0.1) {
      scores.hold = 100;
    } else {
      scores.hold = 70;
      feedback.push("Maintain position - don't drift up");
    }

    const formAccuracy = Math.round(
      scores.kneeAngle * 0.5 + 
      scores.back * 0.3 + 
      scores.hold * 0.2
    );

    return { formAccuracy, feedback, breakdown: scores };
  }

  /**
   * Get session average form accuracy
   * @returns {Number} Average form accuracy 0-100
   */
  getSessionAverage() {
    if (this.formScores.length === 0) return 0;
    
    const sum = this.formScores.reduce((acc, score) => acc + score, 0);
    return Math.round(sum / this.formScores.length);
  }

  /**
   * Generate final feedback based on session
   * @returns {Array} Top 2-3 improvement tips
   */
  getFinalFeedback() {
    // Return most common feedback from the session
    const feedbackCount = {};
    
    // This would need to track feedback throughout session
    // For now, return generic based on average score
    const avgScore = this.getSessionAverage();
    
    if (avgScore >= 85) {
      return ["Excellent form!", "Keep up the great work"];
    } else if (avgScore >= 70) {
      return ["Good effort", "Focus on consistency"];
    } else {
      return ["Review form guidelines", "Practice proper technique"];
    }
  }

  /**
   * Reset analyzer for new session
   */
  reset() {
    this.formScores = [];
  }
}

export default FormAnalyzer;
