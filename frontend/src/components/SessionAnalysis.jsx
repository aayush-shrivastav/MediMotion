import { useState, useEffect } from 'react';
import api from '../utils/api';

const SessionAnalysis = ({ sessionId, onClose }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [ptScore, setPtScore] = useState('');
  const [ptNotes, setPtNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAnalysis();
  }, [sessionId]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      const data = await api.getSessionAnalysis(sessionId);
      setAnalysis(data);
      setError(null);
    } catch (err) {
      console.error('Error loading analysis:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!ptScore) {
      setError('Please enter a PT score');
      return;
    }

    try {
      setSubmitting(true);
      await api.submitPTReview(sessionId, parseInt(ptScore), ptNotes);
      setReviewMode(false);
      await loadAnalysis(); // Reload to show updated data
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6">
          <p className="text-hospital-600">Loading session analysis...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <p className="text-red-600 mb-4">{error || 'Failed to load analysis'}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-medical-blue text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (analysis.exerciseType === 'walking') {
    const summary = analysis.verificationSummary || {};
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-xl w-full">
          <div className="bg-hospital-100 border-b border-hospital-200 p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-hospital-900">Walking Session Analysis</h2>
            <button onClick={onClose} className="text-hospital-600 hover:text-hospital-900">✕</button>
          </div>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="bg-hospital-50 p-4 rounded">
              <p className="text-xs text-hospital-500 uppercase">Patient</p>
              <p className="text-lg font-semibold text-hospital-900">{analysis.patientName}</p>
              <p className="text-xs text-hospital-500">{new Date(analysis.timestamp).toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-hospital-200 rounded p-3 text-center">
                <p className="text-xs text-hospital-500 uppercase">Duration</p>
                <p className="text-xl font-bold text-hospital-900">{analysis.duration}m</p>
              </div>
              <div className="bg-white border border-hospital-200 rounded p-3 text-center">
                <p className="text-xs text-hospital-500 uppercase">Face Checks</p>
                <p className="text-xl font-bold text-hospital-900">{summary.totalChecks || 0}</p>
              </div>
              <div className="bg-white border border-hospital-200 rounded p-3 text-center">
                <p className="text-xs text-hospital-500 uppercase">Status</p>
                <p className={`text-xl font-bold ${summary.status === 'verified' ? 'text-green-600' : summary.status === 'partial' ? 'text-amber-600' : 'text-red-600'}`}>
                  {(summary.status || 'pending').toUpperCase()}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {(analysis.verificationEvents || []).map((event, idx) => (
                <div key={idx} className="flex items-center justify-between border border-hospital-200 rounded p-3">
                  <div>
                    <p className="text-sm font-semibold text-hospital-900">Checkpoint {idx + 1}</p>
                    <p className="text-xs text-hospital-500">Triggered at {Math.round(event.checkpointSeconds / 60)} min</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${event.status === 'passed' ? 'text-green-600' : event.status === 'skipped' ? 'text-hospital-500' : 'text-red-600'}`}>
                      {event.status}
                    </p>
                    <p className="text-xs text-hospital-500">Confidence: {event.confidence || 0}%</p>
                  </div>
                </div>
              ))}
            </div>

            {analysis.notes && (
              <div className="bg-hospital-50 border border-hospital-200 rounded p-3">
                <p className="text-xs text-hospital-500 uppercase">Notes</p>
                <p className="text-sm text-hospital-700">{analysis.notes}</p>
              </div>
            )}

            <p className="text-xs text-hospital-500">
              Verification uses the biometric service only twice per session. Skipped checks automatically downgrade verification status.
            </p>
          </div>
          <div className="border-t bg-hospital-50 p-4 flex gap-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 bg-medical-blue text-white rounded hover:bg-blue-700 font-semibold">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="bg-hospital-100 border-b border-hospital-200 p-4 sticky top-0 flex items-center justify-between">
          <h2 className="text-xl font-bold text-hospital-900">Session Analysis</h2>
          <button
            onClick={onClose}
            className="text-hospital-600 hover:text-hospital-900"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Patient Info */}
          <div className="bg-hospital-50 p-4 rounded">
            <p className="text-sm text-hospital-600">Patient</p>
            <p className="text-lg font-semibold text-hospital-900">{analysis.patientName}</p>
            <p className="text-xs text-hospital-600 mt-1">
              {new Date(analysis.timestamp).toLocaleString()}
            </p>
          </div>

          {/* AI Results vs PT Review */}
          <div className="space-y-3">
            <h3 className="font-semibold text-hospital-900">Form Accuracy</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* AI Score */}
              <div className="border rounded p-4">
                <div className="text-xs text-hospital-600 mb-1">AI Analysis</div>
                <div className="text-3xl font-bold text-medical-blue">
                  {analysis.aiFormAccuracy}%
                </div>
                <div className="text-xs text-hospital-600 mt-2">
                  Confidence: ±{analysis.confidenceInterval.high - analysis.aiFormAccuracy}%
                </div>
                <div className="text-xs text-hospital-600">
                  Range: {Math.round(analysis.confidenceInterval.low)}% - {Math.round(analysis.confidenceInterval.high)}%
                </div>
              </div>

              {/* PT Score */}
              <div className="border rounded p-4">
                <div className="text-xs text-hospital-600 mb-1">PT Review</div>
                {analysis.ptReview?.reviewed ? (
                  <>
                    <div className="text-3xl font-bold text-green-600">
                      {analysis.ptReview.ptScore}%
                    </div>
                    <div className={`text-xs mt-2 font-semibold ${
                      Math.abs(analysis.deviation) > 20 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      Deviation: {analysis.deviation > 0 ? '+' : ''}{Math.round(analysis.deviation)}%
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-hospital-600 py-4">Not reviewed yet</div>
                )}
              </div>
            </div>

            {/* Deviation Flag */}
            {analysis.ptReview?.reviewed && Math.abs(analysis.deviation) > 20 && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-xs text-red-700">
                  ⚠️ <strong>Large deviation:</strong> AI and PT scores differ by {Math.abs(analysis.deviation)}%
                </p>
              </div>
            )}
          </div>

          {/* Feedback */}
          {analysis.feedback && analysis.feedback.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-hospital-900">AI Feedback</h3>
              <ul className="space-y-1">
                {analysis.feedback.map((tip, idx) => (
                  <li key={idx} className="text-sm text-hospital-700 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Keyframes */}
          {analysis.keyframes && analysis.keyframes.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-hospital-900">Session Keyframes</h3>
              <div className="flex gap-2">
                {analysis.keyframes.map((img, idx) => (
                  <img
                    key={idx}
                    src={`data:image/png;base64,${img}`}
                    alt={`Keyframe ${idx + 1}`}
                    className="w-20 h-20 object-cover rounded border border-hospital-200"
                  />
                ))}
              </div>
            </div>
          )}

          {/* PT Review Section */}
          {!reviewMode && !analysis.ptReview?.reviewed && (
            <button
              onClick={() => setReviewMode(true)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
            >
              Add PT Review
            </button>
          )}

          {reviewMode && (
            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold text-hospital-900">PT Verification</h3>
              
              <div>
                <label className="block text-sm text-hospital-600 mb-2">
                  PT Score (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={ptScore}
                  onChange={(e) => setPtScore(e.target.value)}
                  className="w-full px-3 py-2 border border-hospital-200 rounded"
                  placeholder="Enter 0-100"
                />
              </div>

              <div>
                <label className="block text-sm text-hospital-600 mb-2">
                  Notes
                </label>
                <textarea
                  value={ptNotes}
                  onChange={(e) => setPtNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-hospital-200 rounded"
                  placeholder="Optional clinical notes..."
                  rows="3"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setReviewMode(false)}
                  className="flex-1 px-4 py-2 bg-hospital-200 text-hospital-700 rounded hover:bg-hospital-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          )}

          {analysis.ptReview?.reviewed && (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <p className="text-xs text-green-700 font-semibold mb-2">
                ✓ PT Review Completed
              </p>
              <p className="text-sm text-green-800 mb-2">
                <strong>Score:</strong> {analysis.ptReview.ptScore}%
              </p>
              {analysis.ptReview.notes && (
                <p className="text-sm text-green-800">
                  <strong>Notes:</strong> {analysis.ptReview.notes}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-hospital-50 p-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-hospital-200 text-hospital-700 rounded hover:bg-hospital-300 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionAnalysis;
