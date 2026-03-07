import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import ExerciseVerification from '../../components/ExerciseVerification';
import MedicalDisclaimer from '../../components/MedicalDisclaimer';
import WalkingSession from '../../components/WalkingSession';

const SessionLive = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    prescriptionId,
    exerciseType,
    exerciseName,
    sets,
    reps,
    duration,
    durationSeconds: sessionDurationSeconds,
    instructions
  } = location.state || {};
  const normalizedExercise = (exerciseType || exerciseName || '').toLowerCase();
  const isWalkingSession = normalizedExercise === 'walking';
  const isUnsupportedExercise = normalizedExercise && !['curl', 'press', 'squat', 'walking'].includes(normalizedExercise);
  const displayName = exerciseName || exerciseType || 'Exercise';
  const walkingDurationSeconds = isWalkingSession
    ? sessionDurationSeconds || 900
    : null;
  const displayDuration = isWalkingSession
    ? (walkingDurationSeconds ? `${Math.round(walkingDurationSeconds / 60)} min` : '—')
    : (duration ? `${duration} sec` : '—');
  const displaySets = sets ? `${sets}` : '—';
  const displayReps = reps ? `${reps}` : '—';
  const parsedInstructions = instructions
    ? instructions.split(/\r?\n|;+/).map((line) => line.trim()).filter(Boolean)
    : [];
  
  const [showVerification, setShowVerification] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    if (!prescriptionId) {
      navigate('/patient/session/start');
      return;
    }

    // Show disclaimer on first use
    const disclaimerAccepted = localStorage.getItem('disclaimerAccepted');
    if (!disclaimerAccepted) {
      setShowDisclaimer(true);
    }
  }, [prescriptionId, navigate]);

  if (isWalkingSession && prescriptionId) {
    return (
      <Layout title="Walking Session">
        <WalkingSession
          prescriptionId={prescriptionId}
          exerciseName={displayName}
          durationSeconds={walkingDurationSeconds || 900}
          instructions={instructions}
        />
      </Layout>
    );
  }

  const handleDisclaimerAccept = () => {
    setShowDisclaimer(false);
    setShowVerification(true);
  };

  const handleVerificationComplete = (result) => {
    // Navigate to completion screen with AI results
    navigate('/patient/session/complete', {
      state: {
        prescriptionId,
        exerciseType: normalizedExercise || 'squat',
        exerciseName: displayName,
        duration: Math.floor((result.durationSeconds || 0) / 60),
        formAccuracy: result.formAccuracy,
        reps: result.reps,
        verified: true,
        aiResult: result
      }
    });
  };

  const handleStartAIVerification = () => {
    if (isUnsupportedExercise) {
      alert('This session supports Curl, Press, Squat, or Walking only. Please contact your provider to update the prescription.');
      return;
    }

    if (!localStorage.getItem('disclaimerAccepted')) {
      setShowDisclaimer(true);
    } else {
      setShowVerification(true);
    }
  };

  // Show medical disclaimer
  if (showDisclaimer) {
    return (
      <MedicalDisclaimer
        onAccept={handleDisclaimerAccept}
        onCancel={() => navigate('/patient/home')}
      />
    );
  }

  // Show AI verification overlay
  if (showVerification) {
    return (
        <ExerciseVerification
          exerciseType={normalizedExercise || 'squat'}
          prescriptionId={prescriptionId}
          targetReps={reps}
          onComplete={handleVerificationComplete}
          onCancel={() => setShowVerification(false)}
        />
    );
  }

  return (
    <Layout title="Start Exercise Session">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-white border-b border-hospital-200 flex items-center justify-between">
          <button 
            onClick={() => navigate('/patient/home')}
            className="text-hospital-600"
          >
            ← Back
          </button>
          <h3 className="text-lg font-semibold text-hospital-900">{displayName} Exercise</h3>
          <span className="text-sm text-hospital-600" />
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Exercise Info */}
          <div className="bg-hospital-50 p-4 rounded-lg">
            <h4 className="font-semibold text-hospital-900 mb-2">Exercise Details</h4>
            <div className="space-y-2 text-sm text-hospital-700">
              <p><strong>Exercise:</strong> {displayName}</p>
              <p><strong>Type:</strong> {reps ? 'Repetition-based' : 'Duration-based'}</p>
              <p><strong>Sets:</strong> {displaySets}</p>
              <p><strong>Reps:</strong> {displayReps}</p>
              <p><strong>Duration:</strong> {displayDuration}</p>
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="space-y-3">
            <h4 className="font-semibold text-hospital-900">Setup Instructions</h4>
            <ol className="space-y-2 text-sm text-hospital-700">
              <li className="flex gap-3">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-medical-blue text-white rounded-full flex-shrink-0 text-xs font-bold">1</span>
                <span>Position your camera so your full body is visible (feet to head)</span>
              </li>
              <li className="flex gap-3">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-medical-blue text-white rounded-full flex-shrink-0 text-xs font-bold">2</span>
                <span>Ensure adequate lighting (bright room preferred)</span>
              </li>
              <li className="flex gap-3">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-medical-blue text-white rounded-full flex-shrink-0 text-xs font-bold">3</span>
                <span>Wear fitted clothing so joints are visible</span>
              </li>
              <li className="flex gap-3">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-medical-blue text-white rounded-full flex-shrink-0 text-xs font-bold">4</span>
                <span>Keep arms relaxed at sides or in front for balance</span>
              </li>
            </ol>
          </div>

          {/* Form Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="font-semibold text-hospital-900 mb-2">Prescription Instructions</div>
            {parsedInstructions.length > 0 ? (
              <ul className="space-y-1 text-xs text-hospital-700">
                {parsedInstructions.map((tip, idx) => (
                  <li key={idx}>• {tip}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-hospital-700">No specific instructions provided by your doctor.</p>
            )}
          </div>

          {/* AI Verification Button */}
          <button
            onClick={handleStartAIVerification}
            disabled={isUnsupportedExercise}
            className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
              isUnsupportedExercise
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Start ML Session
          </button>
          {isUnsupportedExercise && (
            <div className="text-xs text-red-600 text-center">
              This session supports Curl, Press, Squat, or Walking only.
            </div>
          )}

          {/* Info Box */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-hospital-600">
            <p>
              <strong>Camera access required:</strong> This app needs permission to access your camera to analyze exercise form. 
              Video frames are sent securely to the ML service for real-time analysis.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SessionLive;
