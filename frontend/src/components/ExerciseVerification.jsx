import { useState, useEffect, useRef } from 'react';

const WS_URL = 'wss://hacktu-medipal-pose-detection-1.onrender.com/ws/session';
const FRAME_INTERVAL_MS = 120;
const MAX_RECONNECTS = 3;
const RECONNECT_BASE_DELAY_MS = 1200;

const ExerciseVerification = ({ 
  exerciseType, 
  prescriptionId, 
  targetReps,
  onComplete,
  onCancel 
}) => {
  console.log('ExerciseVerification initialized with:', { exerciseType, prescriptionId });
  
  const [status, setStatus] = useState('idle'); // idle, countdown, recording, processing, complete
  const [countdown, setCountdown] = useState(3);
  const [stats, setStats] = useState({
    completedReps: 0,
    targetReps: Number.isFinite(Number(targetReps)) ? Number(targetReps) : 5,
    formConfidence: 0,
    alignment: 0,
    suggestions: [],
    sessionTime: 0
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const frameTimerRef = useRef(null);
  const sessionTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const completionTimerRef = useRef(null);
  const stopRequestedRef = useRef(false);
  const finalizingRef = useRef(false);
  const canvasRef = useRef(null);
  const motionCanvasRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const lastMotionFrameRef = useRef(null);
  const lastCaptureTimeRef = useRef(0);
  const keyframesRef = useRef([]);
  const sessionActiveRef = useRef(false);
  const startInProgressRef = useRef(false);

  // Initialize on mount
  useEffect(() => {
    return () => {
      cleanupSession(false);
    };
  }, []);

  useEffect(() => {
    if (Number.isFinite(Number(targetReps))) {
      setStats((prev) => ({
        ...prev,
        targetReps: Number(targetReps)
      }));
    }
  }, [targetReps]);

  // Start countdown then begin recording
  const handleStart = () => {
    if (status !== 'idle' || startInProgressRef.current) {
      return;
    }
    startInProgressRef.current = true;
    setStatus('countdown');
    setCountdown(3);

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          // Add small delay to ensure video element is fully mounted
          setTimeout(() => startRecording(), 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Start AI verification
  const startRecording = async () => {
    try {
      if (sessionActiveRef.current) {
        return;
      }
      setStatus('recording');
      setError(null);
      stopRequestedRef.current = false;
      finalizingRef.current = false;
      sessionActiveRef.current = true;
      startInProgressRef.current = false;

      setStats((prev) => ({
        ...prev,
        completedReps: 0,
        targetReps: Number.isFinite(Number(targetReps)) ? Number(targetReps) : prev.targetReps,
        formConfidence: 0,
        alignment: 0,
        suggestions: [],
        sessionTime: 0
      }));
      keyframesRef.current = [];
      lastMotionFrameRef.current = null;
      lastCaptureTimeRef.current = 0;

      // Ensure video element is mounted
      if (!videoRef.current) {
        throw new Error('Video element not found. Please refresh and try again.');
      }

      // Log video element status for diagnostics
      console.log('Video element ready:', {
        hasRef: !!videoRef.current,
        tagName: videoRef.current?.tagName,
        hasAutoPlay: videoRef.current?.autoplay,
        hasMuted: videoRef.current?.muted,
        readyState: videoRef.current?.readyState,
        classList: videoRef.current?.className
      });

      await startCamera();
      openSocket();

      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
      sessionTimerRef.current = setInterval(() => {
        setStats((prev) => ({
          ...prev,
          sessionTime: prev.sessionTime + 1
        }));
      }, 1000);

    } catch (err) {
      console.error('Recording start error:', err);
      const errorMessage = err.message || 'Failed to start camera';
      
      // Provide specific guidance based on error
      let userMessage = errorMessage;
      
      if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Permission')) {
        userMessage = 'Camera permission denied. Please check browser permissions and refresh.';
      } else if (errorMessage.includes('NotFoundError')) {
        userMessage = 'No camera found. Please connect a camera device.';
      } else if (errorMessage.includes('NotReadableError')) {
        userMessage = 'Camera is already in use. Please close other apps using the camera.';
      } else if (errorMessage.includes('initialized')) {
        userMessage = 'Camera failed to initialize. Please refresh and try again.';
      }
      
      setError(userMessage);
      setStatus('idle');
      startInProgressRef.current = false;
      cleanupSession(false);
    }
  };

  // Stop recording and get results
  const handleStop = async () => {
    if (!sessionActiveRef.current) return;

    try {
      setStatus('processing');
      stopRequestedRef.current = true;
      requestFinalReport();
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message || 'Failed to verify workout');
      setStatus('idle');
      cleanupSession(false);
    }
  };

  const startCamera = async () => {
    if (!videoRef.current) {
      throw new Error('Video element not found. Please refresh and try again.');
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera access is not supported in this browser.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false
    });

    streamRef.current = stream;
    videoRef.current.srcObject = stream;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Video load timeout')), 5000);
      const handleLoaded = () => {
        clearTimeout(timeout);
        videoRef.current?.removeEventListener('loadedmetadata', handleLoaded);
        resolve();
      };

      if (videoRef.current.readyState >= 1) {
        clearTimeout(timeout);
        resolve();
      } else {
        videoRef.current.addEventListener('loadedmetadata', handleLoaded);
      }
    });

    if (videoRef.current.paused) {
      await videoRef.current.play();
    }
  };

  const openSocket = () => {
    if (!sessionActiveRef.current) return;

    if (socketRef.current) {
      socketRef.current.close();
    }

    setConnectionStatus('connecting');
    const socket = new WebSocket(WS_URL);
    socket.binaryType = 'arraybuffer';
    socketRef.current = socket;

    socket.onopen = () => {
      setConnectionStatus('connected');
      reconnectAttemptRef.current = 0;
      sendStartMessage();
      startFrameLoop();
    };

    socket.onmessage = (event) => {
      const data = parseSocketMessage(event.data);
      if (!data) return;

      if (data.type === 'live') {
        updateStatsFromPayload({
          completed_reps: data.reps,
          target_reps: data.target_reps,
          form_confidence: data.form_confidence,
          alignment: data.alignment,
          suggestions: data.suggestions
        });
        checkForCompletion(data.reps, data.target_reps);
        return;
      }

      if (data.type === 'final_report' && data.report) {
        finalizeSession(data.report);
        return;
      }

      if (typeof data.completed_reps === 'number' || typeof data.target_reps === 'number') {
        updateStatsFromPayload(data);
        checkForCompletion(data.completed_reps, data.target_reps);
      }
    };

    socket.onclose = () => {
      if (!sessionActiveRef.current || finalizingRef.current) {
        setConnectionStatus('disconnected');
        return;
      }

      if (reconnectAttemptRef.current < MAX_RECONNECTS) {
        reconnectAttemptRef.current += 1;
        setConnectionStatus('reconnecting');
        const delay = RECONNECT_BASE_DELAY_MS * reconnectAttemptRef.current;
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
        }
        reconnectTimerRef.current = setTimeout(() => {
          openSocket();
        }, delay);
      } else {
        setConnectionStatus('error');
        setError('Connection lost. Please try again.');
        setStatus('idle');
        cleanupSession(false);
      }
    };

    socket.onerror = () => {
      setConnectionStatus('error');
    };
  };

  const sendStartMessage = () => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    const normalizedExercise = (exerciseType || '').toLowerCase();
    const resolvedTarget = Number.isFinite(Number(targetReps))
      ? Number(targetReps)
      : stats.targetReps;
    const payload = {
      type: 'start',
      exercise: normalizedExercise,
      target_reps: resolvedTarget
    };
    socket.send(JSON.stringify(payload));
  };

  const requestFinalReport = () => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      finalizeSession({
        exercise: exerciseType,
        target_reps: stats.targetReps,
        completed_reps: stats.completedReps,
        form_confidence: stats.formConfidence,
        alignment: stats.alignment,
        suggestions: stats.suggestions
      });
      return;
    }

    socket.send(JSON.stringify({ type: 'end' }));
  };

  const parseSocketMessage = (raw) => {
    try {
      if (typeof raw === 'string') {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Failed to parse WebSocket message:', err);
    }
    return null;
  };

  const updateStatsFromPayload = (payload) => {
    const completedReps = Number(payload.completed_reps ?? payload.reps ?? 0);
    const target = Number(payload.target_reps ?? stats.targetReps);
    const formConfidence = Number(payload.form_confidence ?? payload.formAccuracy ?? 0);
    const alignment = Number(payload.alignment ?? 0);
    const suggestions = Array.isArray(payload.suggestions) ? payload.suggestions : [];

    setStats((prev) => ({
      ...prev,
      completedReps: Number.isFinite(completedReps) ? completedReps : prev.completedReps,
      targetReps: Number.isFinite(target) ? target : prev.targetReps,
      formConfidence: Number.isFinite(formConfidence) ? formConfidence : prev.formConfidence,
      alignment: Number.isFinite(alignment) ? alignment : prev.alignment,
      suggestions: suggestions.length ? suggestions : prev.suggestions
    }));
  };

  const checkForCompletion = (completedReps, targetRepsValue) => {
    const completed = Number(completedReps ?? stats.completedReps);
    const target = Number(targetRepsValue ?? stats.targetReps);
    if (!Number.isFinite(completed) || !Number.isFinite(target)) return;

    if (completed >= target && target > 0) {
      if (stopRequestedRef.current) return;
      stopRequestedRef.current = true;
      setStatus('processing');
      requestFinalReport();

      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }

      completionTimerRef.current = setTimeout(() => {
        finalizeSession({
          exercise: exerciseType,
          target_reps: target,
          completed_reps: completed,
          form_confidence: stats.formConfidence,
          alignment: stats.alignment,
          suggestions: stats.suggestions
        });
      }, 3000);
    }
  };

  const finalizeSession = (report) => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;

    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }

    const normalizedExercise = (report.exercise || exerciseType || '').toLowerCase();
    const completedReps = Number(report.completed_reps ?? stats.completedReps ?? 0);
    const target = Number(report.target_reps ?? stats.targetReps ?? 0);
    const formConfidence = Number(report.form_confidence ?? stats.formConfidence ?? 0);
    const alignment = Number(report.alignment ?? stats.alignment ?? 0);
    const suggestions = Array.isArray(report.suggestions) ? report.suggestions : stats.suggestions;

    const sessionDurationSeconds = stats.sessionTime;
    const workoutResult = {
      exerciseType: normalizedExercise,
      reps: completedReps,
      durationSeconds: sessionDurationSeconds,
      formAccuracy: formConfidence,
      alignment,
      feedback: suggestions,
      confidenceScore: Math.min(Math.max(formConfidence / 100, 0), 1),
      verified: completedReps >= target && target > 0,
      timestamp: new Date().toISOString(),
      keyframeImages: keyframesRef.current
    };

    setResult(workoutResult);
    setStats((prev) => ({
      ...prev,
      completedReps,
      targetReps: target || prev.targetReps,
      formConfidence,
      alignment,
      suggestions
    }));

    cleanupSession(false);

    if (onComplete) {
      onComplete(workoutResult);
    }

    setStatus('complete');
  };

  const startFrameLoop = () => {
    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current);
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    if (!motionCanvasRef.current) {
      motionCanvasRef.current = document.createElement('canvas');
    }

    if (!captureCanvasRef.current) {
      captureCanvasRef.current = document.createElement('canvas');
    }

    frameTimerRef.current = setInterval(async () => {
      const socket = socketRef.current;
      const video = videoRef.current;

      if (!sessionActiveRef.current || stopRequestedRef.current) return;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      if (!video || video.readyState < 2) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      detectMovementAndCapture(video);

      canvas.toBlob(async (blob) => {
        if (!blob || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
        const arrayBuffer = await blob.arrayBuffer();
        socketRef.current.send(arrayBuffer);
      }, 'image/jpeg', 0.6);
    }, FRAME_INTERVAL_MS);
  };

  const detectMovementAndCapture = (video) => {
    if (keyframesRef.current.length >= 4) return;

    const motionCanvas = motionCanvasRef.current;
    const motionCtx = motionCanvas.getContext('2d');
    const width = 160;
    const height = 120;

    motionCanvas.width = width;
    motionCanvas.height = height;
    motionCtx.drawImage(video, 0, 0, width, height);

    const frame = motionCtx.getImageData(0, 0, width, height);
    const prevFrame = lastMotionFrameRef.current;
    lastMotionFrameRef.current = frame;

    if (!prevFrame) return;

    let diffSum = 0;
    const data = frame.data;
    const prevData = prevFrame.data;
    const step = 16;

    for (let i = 0; i < data.length; i += step) {
      diffSum += Math.abs(data[i] - prevData[i]);
    }

    const avgDiff = diffSum / (data.length / step);
    const now = Date.now();
    const captureCooldownMs = 2000;
    const movementThreshold = 12;

    if (avgDiff < movementThreshold) return;
    if (now - lastCaptureTimeRef.current < captureCooldownMs) return;
    if (Math.random() > 0.25) return;

    lastCaptureTimeRef.current = now;
    captureKeyframe(video);
  };

  const captureKeyframe = (video) => {
    if (keyframesRef.current.length >= 4) return;

    const captureCanvas = captureCanvasRef.current;
    const captureCtx = captureCanvas.getContext('2d');
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    captureCanvas.width = width;
    captureCanvas.height = height;
    captureCtx.drawImage(video, 0, 0, width, height);

    const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.7);
    const base64 = dataUrl.split(',')[1];
    keyframesRef.current = [...keyframesRef.current, base64].slice(0, 4);
  };

  const cleanupSession = (sendEnd) => {
    sessionActiveRef.current = false;
    stopRequestedRef.current = false;
    startInProgressRef.current = false;
    setConnectionStatus('disconnected');

    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }

    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }

    lastMotionFrameRef.current = null;
    lastCaptureTimeRef.current = 0;

    const socket = socketRef.current;
    if (socket) {
      if (sendEnd && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'end' }));
      }
      socket.close();
      socketRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get form accuracy color
  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 85) return 'text-green-600';
    if (accuracy >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Render completion screen
  if (status === 'complete' && result) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50 p-4">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-hospital-900 mb-2">
              Workout Verified
            </h2>
            <p className="text-hospital-600">
              {result.verified ? 'Session completed successfully' : 'Session recorded'}
            </p>
          </div>

          {/* Results Summary */}
          <div className="bg-hospital-50 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-medical-blue">
                  {result.reps !== null ? result.reps : formatTime(result.durationSeconds || 0)}
                </div>
                <div className="text-sm text-hospital-600">
                  {result.reps !== null ? 'Repetitions' : 'Duration'}
                </div>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${getAccuracyColor(result.formAccuracy)}`}>
                  {result.formAccuracy}%
                </div>
                <div className="text-sm text-hospital-600">Form Accuracy</div>
              </div>
            </div>

            {/* Feedback */}
            {result.feedback && result.feedback.length > 0 && (
              <div className="mt-4 pt-4 border-t border-hospital-200">
                <div className="font-semibold text-hospital-900 mb-2">Form Feedback:</div>
                <ul className="space-y-1">
                  {result.feedback.map((tip, idx) => (
                    <li key={idx} className="text-sm text-hospital-700 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Compliance */}
            {result.compliance && (
              <div className="mt-4 pt-4 border-t border-hospital-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-hospital-600">Compliance:</span>
                  <span className="font-semibold text-medical-blue">
                    {result.compliance.percentage}%
                  </span>
                </div>
                {result.compliance.streak > 0 && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-hospital-600">Streak:</span>
                    <span className="font-semibold text-green-600">
                      {result.compliance.streak} days 🔥
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => onComplete(result)}
              className="w-full bg-medical-blue text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main recording UI
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col" style={{ height: '100vh', width: '100vw' }}>
      {/* Header */}
      <div className="bg-white border-b border-hospital-200 px-4 py-3 flex items-center justify-between" style={{ flexShrink: 0 }}>
        <button 
          onClick={onCancel}
          className="text-hospital-600 hover:text-hospital-900"
        >
          ← Cancel
        </button>
        <h3 className="text-lg font-semibold text-hospital-900 capitalize">
          {exerciseType.replace(/([A-Z])/g, ' $1').trim()}
        </h3>
        <div className="text-xs font-semibold text-hospital-600">
          {connectionStatus === 'connected' && 'Connected'}
          {connectionStatus === 'connecting' && 'Connecting...'}
          {connectionStatus === 'reconnecting' && 'Reconnecting...'}
          {connectionStatus === 'error' && 'Connection error'}
          {connectionStatus === 'disconnected' && 'Offline'}
        </div>
      </div>

      {/* Video Feed */}
      <div style={{ flex: 1, position: 'relative', backgroundColor: '#000000', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          width="640"
          height="480"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            display: 'block',
            visibility: 'visible'
          }}
        />

        {/* Countdown Overlay */}
        {status === 'countdown' && (
          <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="text-white text-8xl font-bold mb-4">
                {countdown}
              </div>
              <div className="text-white text-2xl">
                Get ready...
              </div>
            </div>
          </div>
        )}

        {/* Stats Overlay */}
        {status === 'recording' && (
          <>
            {/* Timer */}
            <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg">
              <div className="text-2xl font-bold">
                {formatTime(stats.sessionTime)}
              </div>
            </div>

            {/* Form Score */}
            <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg">
              <div className="text-sm">Form</div>
              <div className={`text-2xl font-bold ${
                stats.formConfidence >= 85 ? 'text-green-400' :
                stats.formConfidence >= 70 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {stats.formConfidence}%
              </div>
            </div>

            {/* Alignment */}
            <div className="absolute top-20 right-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg">
              <div className="text-sm">Alignment</div>
              <div className={`text-2xl font-bold ${
                stats.alignment >= 85 ? 'text-green-400' :
                stats.alignment >= 70 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {stats.alignment}%
              </div>
            </div>

            {/* Rep/Duration Counter */}
            <div className="absolute bottom-36 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-6 py-3 rounded-lg">
              <div className="text-center">
                <div className="text-4xl font-bold">
                  {stats.completedReps}
                </div>
                <div className="text-sm mt-1">
                  Reps
                </div>
              </div>
            </div>

            <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-6 py-2 rounded-lg">
              <div className="text-xs text-hospital-200">Target {stats.targetReps}</div>
              <div className="w-40 h-2 bg-white bg-opacity-20 rounded mt-2">
                <div
                  className="h-2 bg-green-400 rounded"
                  style={{ width: `${Math.min(100, (stats.completedReps / Math.max(stats.targetReps, 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Live Feedback */}
            {stats.suggestions && stats.suggestions.length > 0 && (
              <div className="absolute bottom-48 left-4 right-4">
                <div className="bg-blue-600 bg-opacity-90 text-white px-4 py-3 rounded-lg">
                  <div className="font-semibold mb-1">💡 Form Tip:</div>
                  <div className="text-sm">{stats.suggestions[0]}</div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Error Display */}
        {error && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-sm">
              <div className="text-red-600 text-center mb-4">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-semibold">Camera Error</p>
              </div>
              <p className="text-hospital-700 text-center mb-4 text-sm">{error}</p>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-xs text-hospital-700">
                <p className="font-semibold mb-1">Troubleshooting:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Allow camera access when prompted</li>
                  <li>Close other apps using camera (Zoom, Teams)</li>
                  <li>Check browser permissions in settings</li>
                  <li>Try a different browser (Chrome recommended)</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setError(null);
                    setStatus('idle');
                  }}
                  className="flex-1 bg-hospital-300 text-hospital-900 py-2 rounded-lg hover:bg-hospital-400"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    handleStart();
                  }}
                  className="flex-1 bg-medical-blue text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Idle State */}
        {status === 'idle' && !error && (
          <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4">
            <div className="text-center text-white max-w-md">
              <div className="mb-6">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <h3 className="text-xl font-bold mb-2">Ready to Start</h3>
                <p className="text-hospital-200">
                  Position yourself so your full body is visible in the camera
                </p>
              </div>
              <button
                onClick={handleStart}
                className="bg-medical-blue text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Start Exercise
              </button>
            </div>
          </div>
        )}

        {/* Processing State */}
        {status === 'processing' && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-lg">Verifying workout...</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {status === 'recording' && (
        <div className="bg-white border-t border-hospital-200 px-4 py-6" style={{ flexShrink: 0 }}>
          <button
            onClick={handleStop}
            className="w-full bg-red-600 text-white py-4 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <rect x="6" y="6" width="8" height="8" />
            </svg>
            Stop & Verify
          </button>
        </div>
      )}
    </div>
  );
};

export default ExerciseVerification;
