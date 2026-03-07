import { useState } from 'react';

const MedicalDisclaimer = ({ onAccept, onCancel }) => {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    if (accepted) {
      localStorage.setItem('disclaimerAccepted', 'true');
      onAccept();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="bg-red-600 text-white p-4 sticky top-0">
          <h2 className="text-xl font-bold">⚠️ Medical Disclaimer</h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-hospital-700 font-semibold">
            Please read carefully before using the AI exercise verification system.
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 space-y-2 text-xs text-hospital-700">
            <p>
              <strong>Not Medical Advice:</strong> This application uses artificial intelligence to analyze exercise form. 
              AI analysis is NOT a replacement for professional medical advice or physical therapy guidance.
            </p>

            <p>
              <strong>No Diagnosis:</strong> This tool cannot diagnose injuries, conditions, or provide medical treatment. 
              Always consult your healthcare provider before starting any exercise program.
            </p>

            <p>
              <strong>AI Limitations:</strong> Artificial intelligence can make mistakes. Form accuracy scores may be incorrect. 
              Do not rely solely on AI feedback to validate your exercise technique.
            </p>

            <p>
              <strong>Individual Responsibility:</strong> You are responsible for your own safety. 
              Stop exercising immediately if you experience pain or discomfort.
            </p>

            <p>
              <strong>Liability:</strong> FitCred is not liable for any injuries or adverse effects resulting from use of this application. 
              Exercise at your own risk.
            </p>

            <p>
              <strong>Accuracy Variance:</strong> AI results may vary based on camera angle, lighting, and body position. 
              Form scores are estimates, not clinical measurements.
            </p>

            <p>
              <strong>Data Collection:</strong> Your exercise session data is stored for compliance tracking. 
              Your doctor may review this data as part of your treatment.
            </p>
          </div>

          {/* Checkbox */}
          <div className="flex items-start gap-3 pt-4">
            <input
              type="checkbox"
              id="accept"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="accept" className="text-sm text-hospital-700">
              I have read and understand the medical disclaimer. I acknowledge that AI analysis is not a substitute for professional medical advice, 
              and I use this application at my own risk.
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t bg-hospital-50 p-4 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-hospital-200 text-hospital-700 rounded font-semibold hover:bg-hospital-300 transition"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            disabled={!accepted}
            className={`flex-1 px-4 py-2 rounded font-semibold transition ${
              accepted
                ? 'bg-medical-blue text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Accept & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedicalDisclaimer;
