import { useEffect, useRef, useState } from 'react';
import api from '../utils/api';

const constraints = { video: { facingMode: 'user', width: 640, height: 480 } };

const FaceCheckModal = ({ checkpointLabel, onResult, onSkip }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      await attachStreamToVideo(stream);
    } catch (err) {
      setError(err.message || 'Unable to access camera');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    setImage(canvas.toDataURL('image/jpeg', 0.9));
    stopCamera();
  };

  const retake = () => {
    setImage(null);
    startCamera();
  };

  const submit = async () => {
    if (!image) {
      setError('Capture your face before verifying');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const result = await api.verifyFace(image);
      onResult?.({
        status: result.verified ? 'passed' : 'failed',
        confidence: result.confidence,
        capturedAt: new Date().toISOString(),
        image
      });
    } catch (err) {
      setError(err.message || 'Verification failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    stopCamera();
    onSkip?.();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-hospital-500">Identity Check</p>
            <h3 className="text-xl font-semibold text-hospital-900">{checkpointLabel}</h3>
          </div>
          <span className="text-xs text-hospital-500">Privacy-first: no raw images stored</span>
        </div>

        <div className="rounded-lg overflow-hidden bg-black aspect-video relative">
          {image ? (
            <img src={image} alt="Face capture" className="w-full h-full object-cover" />
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          )}
        </div>

        <div className="flex gap-3">
          {image ? (
            <button type="button" className="btn-secondary flex-1" onClick={retake} disabled={loading}>
              Retake
            </button>
          ) : (
            <button type="button" className="btn-secondary flex-1" onClick={captureFrame} disabled={loading}>
              Capture
            </button>
          )}
          <button type="button" className="btn-primary flex-1" onClick={submit} disabled={loading}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </div>

        <button type="button" className="text-xs text-hospital-500 underline" onClick={handleSkip}>
          Skip check (counts as failed)
        </button>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default FaceCheckModal;
