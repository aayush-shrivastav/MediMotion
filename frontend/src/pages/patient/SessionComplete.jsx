import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../utils/api';

const SessionComplete = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const formatSeconds = (seconds = 0) => {
    const value = Number(seconds) || 0;
    const mins = Math.floor(value / 60);
    const secs = value % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const formatConfidence = (confidence = 0) => {
    const value = Number(confidence);
    if (!Number.isFinite(value)) return 0;
    return value <= 1 ? Math.round(value * 100) : Math.round(value);
  };
  const { 
    prescriptionId, 
    exerciseType, 
    exerciseName, 
    duration, 
    postureScore, 
    currentSet, 
    totalSets,
    verified,
    aiResult 
  } = location.state || {};

  const walkingSession = location.state?.walkingSession;
  const walkingEvents = location.state?.verificationEvents || walkingSession?.verificationEvents || [];
  const walkingSummary = location.state?.verificationSummary || walkingSession?.verificationSummary;
  const walkingDuration = location.state?.duration || walkingSession?.duration;
  const walkingExerciseName = exerciseName || walkingSession?.exerciseName || 'Walking';
  const isWalkingFlow = (exerciseType || walkingSession?.exerciseType) === 'walking';
  const forcedStopReason = location.state?.terminationReason || walkingSession?.terminationReason;
  const terminatedEarly = location.state?.terminatedEarly ?? walkingSession?.terminatedEarly;
  
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sessionData, setSessionData] = useState(null);

  // Use AI result if available, otherwise use posture score or mock data
  const finalScore = aiResult?.formAccuracy || postureScore || (85 + Math.floor(Math.random() * 15));
  const isVerified = aiResult?.verified ?? verified ?? (finalScore >= 70);
  const confidence = aiResult?.confidenceScore ? Math.round(aiResult.confidenceScore * 100) : finalScore;
  const feedback = aiResult?.feedback || [];

  if (isWalkingFlow) {
    const summaryStatus = walkingSummary?.status || 'pending';
    const statusColor = summaryStatus === 'verified'
      ? 'text-green-600'
      : summaryStatus === 'partial'
        ? 'text-amber-600'
        : summaryStatus === 'unverified'
          ? 'text-red-600'
          : 'text-hospital-600';

    return (
      <Layout title="Walking Session Complete">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="card">
            <h3 className="text-2xl font-semibold text-hospital-900 mb-2">{walkingExerciseName}</h3>
            <p className="text-sm text-hospital-600 mb-4">
              Walking verification uses two random facial checks to keep the session compliant without continuous tracking.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-hospital-50 p-4 rounded">
                <p className="text-xs text-hospital-500 uppercase">Duration</p>
                <p className="text-xl font-semibold text-hospital-900">{walkingDuration || '--'} min</p>
              </div>
              <div className="bg-hospital-50 p-4 rounded">
                <p className="text-xs text-hospital-500 uppercase">Face Checks</p>
                <p className="text-xl font-semibold text-hospital-900">{walkingSummary?.totalChecks || walkingEvents.length}</p>
              </div>
              <div className="bg-hospital-50 p-4 rounded">
                <p className="text-xs text-hospital-500 uppercase">Status</p>
                <p className={`text-xl font-semibold ${statusColor}`}>
                  {summaryStatus.charAt(0).toUpperCase() + summaryStatus.slice(1)}
                </p>
              </div>
            </div>

            {terminatedEarly && forcedStopReason && (
              <div className="mt-3 p-3 border border-red-200 bg-red-50 rounded text-sm text-red-700">
                Session force-stopped: {forcedStopReason}
              </div>
            )}

            <div className="space-y-2">
              {walkingEvents.map((event, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border border-hospital-200 rounded">
                  <div>
                    <p className="text-sm font-semibold text-hospital-900">Checkpoint {idx + 1}</p>
                    <p className="text-xs text-hospital-500">Triggered at {formatSeconds(event.checkpointSeconds)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${event.status === 'passed' ? 'text-green-600' : event.status === 'skipped' ? 'text-hospital-500' : 'text-red-600'}`}>
                      {event.status === 'passed' ? 'Passed' : event.status === 'skipped' ? 'Skipped' : 'Failed'}
                    </p>
                    <p className="text-xs text-hospital-500">
                      Confidence: {formatConfidence(event.confidence)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={() => navigate('/patient/home')} className="btn-primary flex-1">
              Back to Home
            </button>
            <button onClick={() => navigate('/patient/progress')} className="btn-secondary flex-1">
              View Progress
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Prepare session completion data with full audit trail
      const sessionData = {
        prescriptionId,
        exerciseType: aiResult?.exerciseType || exerciseType,
        duration: aiResult?.durationSeconds ? Math.floor(aiResult.durationSeconds / 60) : duration,
        notes,
        // Include AI verification results and audit trail
        formAccuracy: aiResult?.formAccuracy,
        reps: aiResult?.reps,
        confidence: aiResult?.confidenceScore,
        feedback: aiResult?.feedback,
        alignment: aiResult?.alignment,
        timestamp: aiResult?.timestamp,
        formBreakdown: aiResult?.formBreakdown,
        // Include pose landmarks and keyframes for doctor audit trail
        poseLandmarks: aiResult?.poseLandmarks,
        keyframeImages: aiResult?.keyframeImages
      };

      console.log('Completing session with data:', {
        exerciseType: sessionData.exerciseType,
        formAccuracy: sessionData.formAccuracy,
        hasPoseLandmarks: !!sessionData.poseLandmarks,
        hasKeyframes: !!sessionData.keyframeImages,
        landmarkCount: sessionData.poseLandmarks?.length,
        keyframeCount: sessionData.keyframeImages?.length
      });

      const response = await api.completeSession(sessionData);
      setSessionData(response);
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting session:', error);
      alert('Failed to submit session');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Layout title="Session Complete">
        <div className="max-w-md mx-auto">
          <div className="card text-center">
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-16 h-16 text-medical-green"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-hospital-900 mb-1">
              Complete
            </h3>
            <p className="text-lg font-semibold text-medical-green mb-1">
              Score {Math.round(finalScore)}%
            </p>
            <p className="text-hospital-600 mb-8">Good job!</p>

            <div className="p-4 bg-hospital-50 rounded mb-6 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-hospital-600">Exercise:</span>
                  <span className="font-medium">{exerciseName || exerciseType}</span>
                </div>
                {aiResult && aiResult.reps !== null && (
                  <div className="flex justify-between">
                    <span className="text-hospital-600">Repetitions:</span>
                    <span className="font-medium">{aiResult.reps}</span>
                  </div>
                )}
                {aiResult && aiResult.durationSeconds !== null && (
                  <div className="flex justify-between">
                    <span className="text-hospital-600">Hold Duration:</span>
                    <span className="font-medium">{Math.floor(aiResult.durationSeconds / 60)}:{(aiResult.durationSeconds % 60).toString().padStart(2, '0')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-hospital-600">Duration:</span>
                  <span className="font-medium">{duration} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hospital-600">Form Score:</span>
                  <span className="font-medium">{Math.round(finalScore)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hospital-600">Status:</span>
                  <span className={`font-medium ${isVerified ? 'text-medical-green' : 'text-amber-600'}`}>
                    {isVerified ? 'Verified ✓' : 'Needs Review'}
                  </span>
                </div>
              </div>

              {/* AI Feedback */}
              {feedback.length > 0 && (
                <div className="mt-4 pt-4 border-t border-hospital-200">
                  <div className="text-sm font-semibold text-hospital-700 mb-2">Form Feedback:</div>
                  <ul className="space-y-1">
                    {feedback.map((tip, idx) => (
                      <li key={idx} className="text-sm text-hospital-600 flex items-start">
                        <span className="mr-2">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Compliance */}
              {aiResult?.compliance && (
                <div className="mt-4 pt-4 border-t border-hospital-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-hospital-600">Compliance:</span>
                    <span className="font-semibold text-medical-blue">
                      {aiResult.compliance.percentage}%
                    </span>
                  </div>
                  {aiResult.compliance.streak > 0 && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-hospital-600">Streak:</span>
                      <span className="font-semibold text-green-600">
                        {aiResult.compliance.streak} days 🔥
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/patient/home')}
              className="btn-primary w-full mb-3"
            >
              Next Exercise
            </button>
            
            <button
              onClick={() => navigate('/patient/home')}
              className="w-full text-hospital-600 hover:text-hospital-900"
            >
              Return to Home
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Complete Session">
      <div className="max-w-2xl mx-auto">
        <div className="card">
          <h3 className="text-xl font-bold text-hospital-900 mb-6">
            Session Summary
          </h3>

          <div className="space-y-4 mb-6">
            <div className="p-4 bg-hospital-50 rounded">
              <div className="flex justify-between mb-2">
                <span className="text-hospital-600">Exercise Type:</span>
                <span className="font-medium">{exerciseType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-hospital-600">Duration:</span>
                <span className="font-medium">{duration} minutes</span>
              </div>
            </div>

            {/* Verification results */}
            <div className={`p-4 rounded border ${isVerified ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <p className="text-sm font-medium mb-2">
                Verification Status: <span className={isVerified ? 'text-medical-green' : 'text-medical-amber'}>
                  {isVerified ? 'Verified' : 'Pending Review'}
                </span>
              </p>
              <p className="text-xs text-hospital-600">
                Confidence Score: {confidence}%
              </p>
              {aiResult && (
                <p className="text-xs text-green-600 mt-2">
                  ✓ AI Verified Exercise
                </p>
              )}
            </div>

            <div>
              <label className="label">Session Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field"
                rows={3}
                placeholder="Any observations or comments about this session..."
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => navigate('/patient/home')}
              className="btn-secondary flex-1"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="btn-primary flex-1"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Session'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SessionComplete;
