import { useEffect, useRef, useState } from 'react';

const constraints = { video: { facingMode: 'user', width: 640, height: 480 } };

const FaceCapture = ({ value, onChange, label = 'Face Capture' }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [isCameraOn, setIsCameraOn] = useState(false);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (isCameraOn && streamRef.current) {
      attachStreamToVideo(streamRef.current);
    }
  }, [isCameraOn]);

  const attachStreamToVideo = async (stream) => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
    if (videoRef.current.readyState >= 2) {
      await videoRef.current.play().catch(() => {});
      return;
    }
    await new Promise((resolve) => {
      const handleLoadedMetadata = () => {
        videoRef.current?.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoRef.current?.play().catch(() => {});
        resolve();
      };
      videoRef.current?.addEventListener('loadedmetadata', handleLoadedMetadata);
    });
  };

  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setIsCameraOn(true);
    } catch (err) {
      setError(err.message || 'Unable to access camera');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOn(false);
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    onChange?.(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    onChange?.(null);
    startCamera();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-hospital-700">{label}</span>
        {!isCameraOn && !value && (
          <button type="button" className="text-medical-blue text-sm" onClick={startCamera}>
            Enable Camera
          </button>
        )}
      </div>

      <div className="border border-dashed border-hospital-300 rounded-lg p-4 bg-hospital-50">
        {value ? (
          <div className="space-y-3">
            <img src={value} alt="Face capture preview" className="rounded-lg w-full object-cover" />
            <button type="button" className="btn-secondary w-full" onClick={handleRetake}>
              Retake Photo
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-center">
            {isCameraOn ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="rounded-lg w-full bg-black"
                muted
              />
            ) : (
              <div className="text-sm text-hospital-600">
                Camera is off. Click "Enable Camera" to start capture.
              </div>
            )}
            {isCameraOn && (
              <button type="button" className="btn-primary w-full" onClick={handleCapture}>
                Capture Snapshot
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      <p className="text-xs text-hospital-500">
        We capture a single frame to create a privacy-preserving embedding. Images are never stored in FitCred servers.
      </p>
    </div>
  );
};

export default FaceCapture;
