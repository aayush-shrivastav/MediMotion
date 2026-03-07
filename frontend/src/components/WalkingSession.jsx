import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import FaceCheckModal from './FaceCheckModal';

const generateFaceCheckpoints = (totalSeconds, count = 2) => {
  if (!totalSeconds || totalSeconds <= 0) {
    return [];
  }

  const checkCount = Math.max(1, count);
  const minBuffer = Math.max(5, Math.floor(totalSeconds * 0.05));
  const adaptiveStart = Math.min(Math.max(15, Math.floor(totalSeconds * 0.15)), Math.floor(totalSeconds / 3));
  const adaptiveEnd = Math.min(Math.max(15, Math.floor(totalSeconds * 0.1)), Math.floor(totalSeconds / 3));
  const startBuffer = Math.min(adaptiveStart, totalSeconds - minBuffer);
  const endBuffer = Math.min(adaptiveEnd, totalSeconds - startBuffer - minBuffer);
  const usableWindow = Math.max(totalSeconds - startBuffer - endBuffer, checkCount * 10);

  if (usableWindow <= 0) {
    const step = Math.max(10, Math.floor(totalSeconds / (checkCount + 1)));
    return Array.from({ length: checkCount }, (_, idx) =>
      Math.min(totalSeconds - minBuffer, step * (idx + 1))
    );
  }

  const checkpoints = new Set();
  const maxCheckpoint = Math.max(startBuffer + usableWindow, totalSeconds - minBuffer);
  while (checkpoints.size < checkCount) {
    const offset = Math.floor(Math.random() * usableWindow);
    const candidate = startBuffer + offset;
    checkpoints.add(Math.min(candidate, maxCheckpoint));
  }

  return Array.from(checkpoints)
    .map((value) => Math.max(minBuffer, Math.min(value, totalSeconds - minBuffer)))
    .sort((a, b) => a - b);
};

const summarizeEvents = (events = []) => {
  const summary = events.reduce(
    (acc, event) => {
      acc.totalChecks += 1;
      if (event.status === 'passed') acc.passed += 1;
      if (event.status === 'failed') acc.failed += 1;
      if (event.status === 'skipped') acc.skipped += 1;
      return acc;
    },
    { totalChecks: 0, passed: 0, failed: 0, skipped: 0 }
  );

  const effectiveFailures = summary.failed + summary.skipped;
  if (!summary.totalChecks) {
    summary.status = 'pending';
  } else if (effectiveFailures === 0) {
    summary.status = 'verified';
  } else if (effectiveFailures === summary.totalChecks) {
    summary.status = 'unverified';
  } else {
    summary.status = 'partial';
  }

  return summary;
};

const statusLabels = {
  verified: 'Verified',
  partial: 'Partially Verified',
  unverified: 'Unverified',
  pending: 'Pending'
};

const MAX_ACCURACY_METERS = 20;
const MIN_MOVEMENT_METERS = 3;
const MAX_WALK_SPEED_MPS = 3;
const MAX_TIME_GAP_SECONDS = 60;

const haversineDistance = (pointA, pointB) => {
  const toRadians = (value) => (value * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters

  const lat1 = toRadians(pointA.lat);
  const lat2 = toRadians(pointB.lat);
  const deltaLat = toRadians(pointB.lat - pointA.lat);
  const deltaLon = toRadians(pointB.lng - pointA.lng);

  const a = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const WalkingSession = ({ prescriptionId, exerciseName, durationSeconds = 900, instructions }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [faceEvents, setFaceEvents] = useState([]);
  const [activeCheckpointIndex, setActiveCheckpointIndex] = useState(-1);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [forcedStopInfo, setForcedStopInfo] = useState(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [pathPoints, setPathPoints] = useState([]);
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsWeakSignal, setGpsWeakSignal] = useState(false);
  const [gpsError, setGpsError] = useState('');

  const gpsWatchIdRef = useRef(null);
  const lastPointRef = useRef(null);
  const statusRef = useRef(status);
  const gpsPausedRef = useRef(true);

  const resetGpsState = () => {
    setTotalDistance(0);
    setPathPoints([]);
    lastPointRef.current = null;
    setGpsActive(false);
    setGpsWeakSignal(false);
    setGpsError('');
  };

  const handleGpsSuccess = (position) => {
    const coords = position?.coords || {};
    const { latitude, longitude, accuracy } = coords;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return;
    }

    if (accuracy == null || accuracy > MAX_ACCURACY_METERS) {
      setGpsWeakSignal(true);
      return;
    }

    setGpsWeakSignal(false);
    setGpsError('');

    const nextPoint = {
      lat: latitude,
      lng: longitude,
      accuracy,
      timestamp: position.timestamp || Date.now()
    };

    const previousPoint = lastPointRef.current;
    lastPointRef.current = nextPoint;

    if (!previousPoint) {
      setPathPoints((prev) => [...prev.slice(-199), nextPoint]);
      setGpsActive(true);
      return;
    }

    const timeDeltaSeconds = Math.max(0, (nextPoint.timestamp - previousPoint.timestamp) / 1000);
    if (!timeDeltaSeconds || timeDeltaSeconds > MAX_TIME_GAP_SECONDS) {
      return;
    }

    const distance = haversineDistance(previousPoint, nextPoint);
    if (distance < MIN_MOVEMENT_METERS) {
      return;
    }

    const speed = distance / timeDeltaSeconds;
    if (speed > MAX_WALK_SPEED_MPS) {
      return;
    }

    if (gpsPausedRef.current || statusRef.current !== 'running') {
      return;
    }

    setTotalDistance((prev) => prev + distance);
    setPathPoints((prev) => [...prev.slice(-199), nextPoint]);
    setGpsActive(true);
  };

  const stopGpsTracking = () => {
    if (gpsWatchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(gpsWatchIdRef.current);
    }
    gpsWatchIdRef.current = null;
    gpsPausedRef.current = true;
    setGpsActive(false);
    setGpsWeakSignal(false);
  };

  const handleGpsError = (geoError) => {
    const reason = geoError?.code === 1
      ? 'Location permission denied. GPS distance tracking disabled.'
      : geoError?.message || 'Unable to acquire GPS signal.';
    setGpsError(reason);
    setGpsActive(false);
    setGpsWeakSignal(false);

    if (geoError?.code === 1) {
      stopGpsTracking();
    }
  };

  const startGpsTracking = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('GPS is not supported in this browser.');
      return;
    }

    if (gpsWatchIdRef.current !== null) {
      return;
    }

    gpsPausedRef.current = false;
    setGpsActive(false);
    setGpsWeakSignal(false);
    setGpsError('');

    const watchId = navigator.geolocation.watchPosition(handleGpsSuccess, handleGpsError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000
    });

    gpsWatchIdRef.current = watchId;
  };

  const checkpoints = useMemo(() => generateFaceCheckpoints(durationSeconds, 2), [durationSeconds]);
  const summary = useMemo(() => summarizeEvents(faceEvents), [faceEvents]);

  useEffect(() => {
    statusRef.current = status;
    gpsPausedRef.current = status !== 'running';
  }, [status]);

  useEffect(() => () => {
    stopGpsTracking();
  }, []);

  useEffect(() => {
    if (status === 'complete' || status === 'idle') {
      stopGpsTracking();
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'running') return undefined;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next >= durationSeconds) {
          clearInterval(interval);
          setStatus('complete');
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, durationSeconds]);

  useEffect(() => {
    if (status !== 'running') return;
    const nextCheckpoint = faceEvents.length;
    if (nextCheckpoint >= checkpoints.length) return;
    if (elapsedSeconds >= checkpoints[nextCheckpoint]) {
      setActiveCheckpointIndex(nextCheckpoint);
      setShowFaceModal(true);
      setStatus('paused');
    }
  }, [status, elapsedSeconds, faceEvents.length, checkpoints]);

  const startSession = () => {
    stopGpsTracking();
    resetGpsState();
    setStatus('running');
    setElapsedSeconds(0);
    setFaceEvents([]);
    setActiveCheckpointIndex(-1);
    setShowFaceModal(false);
    setNotes('');
    setError('');
    setForcedStopInfo(null);
    startGpsTracking();
  };

  const handleFaceResult = (eventResult) => {
    const checkpointSeconds = checkpoints[activeCheckpointIndex] || elapsedSeconds;
    const normalizedEvent = {
      checkpointSeconds,
      status: eventResult.status,
      confidence: typeof eventResult.confidence === 'number' ? eventResult.confidence : 0,
      capturedAt: eventResult.capturedAt ? new Date(eventResult.capturedAt) : new Date(),
      notes:
        eventResult.status === 'failed'
          ? 'Face verification failed'
          : eventResult.status === 'skipped'
            ? 'User skipped verification'
            : eventResult.notes
    };

    setFaceEvents((prev) => [...prev, normalizedEvent]);
    setActiveCheckpointIndex(-1);
    setShowFaceModal(false);

    const failureReason = normalizedEvent.status === 'failed'
      ? 'Face verification failed. Session was stopped.'
      : normalizedEvent.status === 'skipped'
        ? 'Verification rejected by user. Session was stopped.'
        : null;

    if (failureReason) {
      setForcedStopInfo({
        reason: failureReason,
        status: normalizedEvent.status,
        checkpointSeconds
      });
      setStatus('complete');
      return;
    }

    setStatus(elapsedSeconds >= durationSeconds ? 'complete' : 'running');
  };

  const handleSkipFace = () => {
    handleFaceResult({ status: 'skipped', confidence: 0, capturedAt: new Date().toISOString() });
  };

  const finishEarly = () => {
    setStatus('complete');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters) => {
    if (!meters) return '0 m';
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const handleSubmitSession = async () => {
    if (!prescriptionId) {
      setError('Missing prescription. Restart the session.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const eventsToPersist = [...faceEvents];
      while (eventsToPersist.length < checkpoints.length) {
        eventsToPersist.push({
          checkpointSeconds: checkpoints[eventsToPersist.length] || elapsedSeconds,
          status: 'skipped',
          confidence: 0,
          capturedAt: new Date().toISOString(),
          notes: 'Auto-skipped during submission'
        });
      }
      const nextSummary = summarizeEvents(eventsToPersist);
      const terminatedEarly = Boolean(forcedStopInfo);
      const terminationReason = forcedStopInfo?.reason;
      const combinedNotes = [notes, terminationReason].filter(Boolean).join(' | ');

      const sessionSummary = {
        exercise: 'walking',
        duration_minutes: Number((elapsedSeconds / 60).toFixed(1)),
        distance_meters: Math.round(totalDistance),
        faceVerificationStatus: nextSummary.status
      };

      const payload = {
        prescriptionId,
        exerciseType: 'walking',
        duration: Math.max(1, Math.round(elapsedSeconds / 60)),
        distanceMeters: sessionSummary.distance_meters,
        faceVerificationStatus: sessionSummary.faceVerificationStatus,
        verificationEvents: eventsToPersist,
        notes: combinedNotes || undefined,
        terminatedEarly,
        terminationReason,
        sessionSummary
      };

      const session = await api.completeSession(payload);

      navigate('/patient/session/complete', {
        state: {
          exerciseType: 'walking',
          walkingSession: session,
          verificationEvents: eventsToPersist,
          verificationSummary: nextSummary,
          duration: payload.duration,
          distanceMeters: sessionSummary.distance_meters,
          sessionSummary,
          exerciseName,
          terminationReason,
          terminatedEarly
        }
      });
    } catch (err) {
      setError(err.message || 'Unable to save walking session');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'idle') {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="card">
          <h3 className="text-xl font-semibold text-hospital-900 mb-3">{exerciseName}</h3>
          <p className="text-sm text-hospital-600 mb-4">
            Walking sessions rely on face verification checkpoints to ensure the right patient is exercising. Face checks happen twice per session and never store raw images.
          </p>
          <p className="text-xs text-hospital-500 mb-4">
            When you tap start we will enable GPS once to measure total distance. Location data stays on-device during the session and is summarized only in meters walked.
          </p>
          <button className="btn-primary w-full" onClick={startSession}>
            Start Walking Session
          </button>
        </div>
        {instructions && (
          <div className="card">
            <h4 className="font-semibold text-hospital-900 mb-2">Prescription Notes</h4>
            <p className="text-sm text-hospital-700 whitespace-pre-line">{instructions}</p>
          </div>
        )}
      </div>
    );
  }

  if (status === 'complete') {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="card">
          <h3 className="text-xl font-semibold text-hospital-900 mb-4">Session Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs uppercase text-hospital-500">Duration</p>
              <p className="text-2xl font-bold text-hospital-900">{formatTime(elapsedSeconds)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-hospital-500">Verification Status</p>
              <p className={`text-2xl font-bold ${summary.status === 'verified' ? 'text-green-600' : summary.status === 'partial' ? 'text-amber-600' : 'text-red-600'}`}>
                {statusLabels[summary.status]}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-hospital-500">Distance</p>
              <p className="text-2xl font-bold text-hospital-900">{formatDistance(totalDistance)}</p>
              <p className="text-xs text-hospital-500">GPS samples: {pathPoints.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-hospital-50 rounded p-3 text-center">
              <p className="text-xs text-hospital-500">Checks</p>
              <p className="text-xl font-semibold">{summary.totalChecks}</p>
            </div>
            <div className="bg-green-50 rounded p-3 text-center">
              <p className="text-xs text-hospital-500">Passed</p>
              <p className="text-xl font-semibold text-green-700">{summary.passed}</p>
            </div>
            <div className="bg-red-50 rounded p-3 text-center">
              <p className="text-xs text-hospital-500">Failed/Skipped</p>
              <p className="text-xl font-semibold text-red-600">{summary.failed + summary.skipped}</p>
            </div>
          </div>

          {forcedStopInfo && (
            <div className="mt-4 p-3 border border-red-200 bg-red-50 rounded text-sm text-red-700">
              Session force-stopped: {forcedStopInfo.reason}
            </div>
          )}

          {gpsError && (
            <div className="mt-4 p-3 border border-amber-200 bg-amber-50 rounded text-sm text-amber-800">
              GPS note: {gpsError}
            </div>
          )}

          <div className="mt-4 space-y-2">
            {faceEvents.map((event, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span>
                  Check {idx + 1} @ {formatTime(event.checkpointSeconds)}
                </span>
                <span className={event.status === 'passed' ? 'text-green-600' : event.status === 'skipped' ? 'text-hospital-500' : 'text-red-600'}>
                  {event.status === 'passed'
                    ? `Passed (${Math.round((event.confidence || 0) * 100)}%)`
                    : event.status === 'skipped'
                      ? 'Skipped'
                      : `Failed (${Math.round((event.confidence || 0) * 100)}%)`}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="label">Session Notes</label>
            <textarea
              className="input-field"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for your doctor"
            />
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mt-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button className="btn-secondary flex-1" onClick={() => navigate('/patient/home')} disabled={submitting}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleSubmitSession} disabled={submitting}>
              {submitting ? 'Saving...' : 'Submit Session'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase text-hospital-500">Elapsed</p>
            <p className="text-3xl font-bold text-hospital-900">{formatTime(elapsedSeconds)}</p>
          </div>
          <button className="text-sm text-red-600" onClick={finishEarly}>
            End Session
          </button>
        </div>
        <div className="bg-hospital-50 rounded p-4 text-sm text-hospital-600">
          Face checks occur twice each session. Stay within camera view when prompted. Skips are allowed but count against verification.
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="p-3 border border-hospital-200 rounded">
            <p className="text-xs uppercase text-hospital-500">Distance</p>
            <p className="text-2xl font-bold text-hospital-900">{formatDistance(totalDistance)}</p>
          </div>
          <div className="p-3 border border-hospital-200 rounded">
            <p className="text-xs uppercase text-hospital-500">GPS Status</p>
            <div className="flex items-center gap-2 text-sm text-hospital-700">
              <span className={`h-2.5 w-2.5 rounded-full ${gpsActive ? 'bg-medical-green animate-pulse' : 'bg-hospital-400'}`}></span>
              <span>{gpsActive ? 'Active' : 'Acquiring signal'}</span>
            </div>
            <p className="text-xs text-hospital-500 mt-1">Samples: {pathPoints.length}</p>
          </div>
        </div>
        {gpsWeakSignal && (
          <p className="mt-2 text-xs text-medical-amber">
            Weak GPS signal detected. Move to an open area if possible to improve accuracy.
          </p>
        )}
        {gpsError && (
          <p className="mt-2 text-xs text-medical-red">
            {gpsError}
          </p>
        )}
        <div className="grid grid-cols-2 gap-4 mt-4">
          {checkpoints.map((checkpoint, idx) => {
            const completed = faceEvents[idx];
            return (
              <div key={checkpoint} className={`p-3 rounded border ${completed ? 'border-green-200 bg-green-50' : 'border-hospital-200'}`}>
                <p className="text-xs text-hospital-500">Checkpoint {idx + 1}</p>
                <p className="text-lg font-semibold text-hospital-900">{formatTime(checkpoint)}</p>
                <p className="text-xs text-hospital-500">
                  {completed
                    ? completed.status === 'passed'
                      ? 'Passed'
                      : completed.status === 'skipped'
                        ? 'Skipped'
                        : 'Failed'
                    : 'Pending'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {showFaceModal && (
        <FaceCheckModal
          checkpointLabel={`Checkpoint ${activeCheckpointIndex + 1} of ${checkpoints.length}`}
          onResult={handleFaceResult}
          onSkip={handleSkipFace}
        />
      )}
    </div>
  );
};

export default WalkingSession;
