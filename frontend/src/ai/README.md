# AI Exercise Verification System

## Overview

This directory contains the complete AI-powered exercise verification system for FitCred. The system uses **MediaPipe Pose** for pose detection and **rule-based logic** for exercise classification, rep counting, and form analysis.

## Architecture

### Client-Side Only

- All AI processing runs in the browser
- No video data sent to server
- Only summarized results transmitted
- Privacy-safe design

## Core Modules

### 1. **poseDetector.js**

- Initializes MediaPipe Pose
- Handles camera access
- Extracts 33 pose landmarks per frame
- Normalizes coordinates for device independence
- Utility functions for angle and distance calculations

**Key Features:**

- Runs at ~15 FPS for performance
- Automatic landmark normalization
- Helper methods: `calculateAngle()`, `calculateDistance()`

### 2. **exerciseClassifier.js**

- Rule-based exercise detection
- No ML training required
- Identifies exercise from pose patterns

**Supported Exercises:**

1. **Squat** - Knee flexion, vertical torso
2. **Plank** - Horizontal body hold
3. **Push-up** - Elbow flexion, plank position
4. **Lunge** - Split stance, one knee forward
5. **Sit-to-Stand** - Hip height transitions
6. **Shoulder Side Raise** - Arm abduction
7. **Front Arm Raise** - Forward arm elevation
8. **Wall Sit** - Static 90° knee hold

**Detection Logic:**

- Joint angle analysis
- Position pattern matching
- Confidence scoring (0-1)

### 3. **repCounter.js**

- State machine for rep counting
- Prevents double counting
- Tracks hold duration for static exercises

**State Management:**

- `NEUTRAL` - Starting position
- `DOWN` - Exercise descent/lowered position
- `UP` - Exercise ascent/raised position
- `HOLD` - Static hold position

**Features:**

- Minimum state time (300ms) prevents false counts
- Separate logic for rep-based vs time-based exercises
- Real-time status updates

### 4. **formAnalyzer.js**

- Weighted scoring system
- Exercise-specific form criteria
- Real-time and session-average calculations

**Scoring Criteria by Exercise:**

**Squat:**

- Depth (40%) - Knee angle targets
- Knee alignment (30%) - Knees over toes
- Back straightness (30%) - Upright torso

**Push-up:**

- Elbow depth (40%) - Full range of motion
- Back straightness (35%) - Plank alignment
- Hip alignment (25%) - No sagging

**Plank:**

- Straight spine (40%) - Body alignment
- Hip position (35%) - No pike or sag
- Shoulder alignment (25%) - Proper width

**Output:**

- Form accuracy: 0-100%
- Real-time feedback tips
- Session average scoring

### 5. **exerciseVerifier.js**

- Main coordinator module
- Integrates all AI components
- Manages session lifecycle

**Workflow:**

1. Initialize pose detector
2. Start camera and detection
3. Process each frame:
   - Classify exercise
   - Count reps/duration
   - Analyze form
   - Generate feedback
4. Stop and generate results
5. Send to backend

**Output Format:**

```javascript
{
  exerciseType: "squat",
  reps: 12,
  durationSeconds: null,
  formAccuracy: 86,
  feedback: [
    "Increase squat depth",
    "Keep knees aligned with toes"
  ],
  confidenceScore: 0.93,
  timestamp: "2026-02-04T12:34:56.789Z"
}
```

## React Components

### **ExerciseVerification.jsx**

Full-screen camera interface with:

- 3-second countdown
- Live video feed
- Real-time stats overlay
- Form feedback display
- Results screen

**UI States:**

- `idle` - Ready to start
- `countdown` - 3-2-1 countdown
- `recording` - Active verification
- `processing` - Analyzing results
- `complete` - Show results

**Features:**

- Real-time rep/duration counter
- Live form accuracy score
- Immediate feedback tips
- Color-coded indicators
- Hospital-grade minimalist design

## Backend Integration

### **routes/workouts.js**

New endpoint: `POST /api/workouts/verify`

**Receives:**

- Exercise verification results
- Prescription ID
- Form accuracy, reps/duration
- Confidence score
- Feedback array

**Returns:**

- Session record
- Compliance statistics
- Verification status
- Triggered notifications

**Automatic Actions:**

1. Creates verified Session record
2. Calculates compliance percentage
3. Checks notification triggers:
   - Low form accuracy warnings
   - Milestone achievements (7-day, 14-day streaks)
   - Doctor alerts for poor form
   - Goal completion celebrations

## Performance Considerations

### Optimizations:

- Process every 2nd frame (effective 15 FPS)
- Lightweight model (complexity: 1)
- Client-side only processing
- No video storage

### Browser Requirements:

- Modern browser with WebRTC
- Camera access permission
- Minimum 2GB RAM recommended

## Usage in Patient Flow

### Integration Points:

1. **SessionLive.jsx**
   - "Start AI Verification" button
   - Launches full-screen verification
   - Or "Complete Manually" to skip

2. **ExerciseVerification.jsx**
   - Standalone verification component
   - Manages complete verification flow
   - Sends results to backend

3. **SessionComplete.jsx**
   - Displays AI verification results
   - Shows reps/duration, form score
   - Lists feedback tips
   - Shows compliance stats

## Demo Workflow

### Hackathon Demo Script:

1. **Patient logs in**
2. **Views prescription** - Doctor prescribed exercises
3. **Starts session** - Selects exercise to perform
4. **Click "Start AI Verification"** - Launches camera
5. **3-2-1 countdown** - Get into position
6. **Perform exercise** - AI tracks in real-time:
   - Counts reps automatically
   - Shows live form score
   - Displays feedback tips
7. **Stop recording** - Click "Stop & Verify"
8. **View results** - Form score, feedback, compliance
9. **Doctor dashboard updates** - Real-time compliance tracking

### Judge-Friendly Highlights:

- ✅ Works live with camera
- ✅ No pre-recorded demos
- ✅ Real-time rep counting
- ✅ Instant form feedback
- ✅ Medical-grade UI
- ✅ Privacy-safe (no video storage)
- ✅ Automatic compliance tracking
- ✅ Doctor notifications

## Supported Exercise Types

### Rep-Based:

- `squat`
- `pushup`
- `lunge`
- `sittostand`
- `shoulderraise`
- `frontarmraise`

### Time-Based:

- `plank`
- `wallsit`

## Form Feedback Examples

### Squat:

- "Increase squat depth"
- "Keep knees aligned with toes"
- "Straighten your back"

### Push-up:

- "Lower chest closer to ground"
- "Keep body in straight line"
- "Don't let hips sag"

### Plank:

- "Engage core muscles"
- "Keep back straight"
- "Lower hips slightly"

## Error Handling

### Camera Issues:

- Permission denied → Clear error message
- Camera disconnected → Graceful recovery
- Low light → Continue with reduced confidence

### Detection Issues:

- Body not visible → "Position yourself fully in frame"
- Low confidence → Still records, flags for review
- Wrong exercise → Still counts, notes mismatch

## Future Enhancements

### Potential Improvements:

1. Add more exercises (jumping jacks, burpees, etc.)
2. 3D joint angle analysis using z-coordinates
3. Side-by-side comparison with reference video
4. Progressive difficulty detection
5. Fatigue detection (form degradation over time)
6. Voice coaching feedback
7. Personalized correction history

## Testing Recommendations

### Manual Testing:

1. Test all 8 exercises individually
2. Test in different lighting conditions
3. Test with different camera angles
4. Test rep counting accuracy
5. Test form scoring consistency
6. Test on different devices (phone, tablet, laptop)

### Demo Rehearsal:

1. Have patient ready to perform
2. Choose well-lit area
3. Position camera at torso level
4. Full body visible in frame
5. Perform 5-10 reps minimum
6. Stop and show results immediately

## Troubleshooting

### Common Issues:

**"Failed to start camera"**

- Check browser permissions
- Try different browser (Chrome recommended)
- Reload page

**"Reps not counting"**

- Ensure full body visible
- Perform full range of motion
- Check lighting
- Move slower for better detection

**"Low form accuracy"**

- Review form guidelines
- Check camera angle
- Ensure proper posture
- Try again with corrections

**"Wrong exercise detected"**

- Position body clearly
- Perform characteristic movements
- Ensure camera sees full body

## Technical Notes

### MediaPipe Pose Landmarks:

- 33 landmarks total
- Includes face, torso, arms, legs
- Normalized 0-1 coordinates
- Includes z-depth and visibility

### Browser Compatibility:

- Chrome: ✅ Recommended
- Firefox: ✅ Supported
- Safari: ✅ Supported (iOS 14.3+)
- Edge: ✅ Supported

### Performance:

- CPU: ~20-40% usage during verification
- RAM: ~200-300MB additional
- No GPU required (but helps)

## Security & Privacy

### Data Handling:

- ✅ Video stays in browser memory
- ✅ No video uploaded to server
- ✅ Only summary data transmitted
- ✅ No facial recognition stored
- ✅ HIPAA-compliant design

### What Gets Sent to Server:

- Exercise type
- Rep count or duration
- Form accuracy percentage (number)
- Feedback text array
- Confidence score
- Timestamp

### What NEVER Leaves Browser:

- Video frames
- Raw camera data
- Pose landmark coordinates
- User's image

---

**Built for FitCred PWA - Medical Compliance Platform**
**Demo-ready for hackathon presentation**
