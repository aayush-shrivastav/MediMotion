import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import api from '../../utils/api';

const SessionStart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState('squat');

  useEffect(() => {
    loadPrescription();
  }, []);

  const loadPrescription = async () => {
    try {
      const prescriptions = await api.getPrescriptions();
      const activePrescription = prescriptions.find(p => p.status === 'active');
      setPrescription(activePrescription);
    } catch (error) {
      console.error('Error loading prescription:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedExerciseName = location.state?.exerciseName;
  const selectedExerciseType = location.state?.exerciseType;
  const selectedDurationSeconds = location.state?.duration;
  const selectedInstructions = location.state?.instructions;

  const regimenExercise = prescription?.regimen?.exercises?.find(
    (exercise) => exercise.name === selectedExerciseName
  ) || prescription?.regimen?.exercises?.[0];

  const displayExerciseType = selectedExerciseType || prescription?.plan?.exerciseType || regimenExercise?.name || 'Exercise';
  const displayDurationMinutes = selectedDurationSeconds
    ? Math.round(selectedDurationSeconds / 60)
    : (prescription?.plan?.sessionDuration || (regimenExercise?.duration ? Math.round(regimenExercise.duration / 60) : null));
  const displayWeeklyGoal = prescription?.plan?.weeklyGoal || 1;
  const displayInstructions = selectedInstructions || regimenExercise?.instructions || prescription?.plan?.instructions;

  useEffect(() => {
    const normalized = (displayExerciseType || '').toLowerCase();
    if (['curl', 'press', 'squat', 'walking'].includes(normalized)) {
      setSelectedExercise(normalized);
    } else {
      setSelectedExercise('squat');
    }
  }, [displayExerciseType]);

  const handleStart = () => {
    const fallbackExercise = prescription?.regimen?.exercises?.[0]?.name;
    const exerciseType = selectedExercise || selectedExerciseName || prescription?.plan?.exerciseType || fallbackExercise;
    const regimenDurationSeconds = typeof regimenExercise?.duration === 'number' ? regimenExercise.duration : null;
    const planDurationSeconds = prescription?.plan?.sessionDuration
      ? prescription.plan.sessionDuration * 60
      : null;
    const derivedDurationSeconds = selectedDurationSeconds
      ?? regimenDurationSeconds
      ?? planDurationSeconds
      ?? null;
    const duration = selectedDurationSeconds || prescription?.plan?.sessionDuration || regimenExercise?.duration;
    navigate('/patient/session/live', {
      state: {
        prescriptionId: prescription._id,
        exerciseType,
        exerciseName: selectedExerciseName || regimenExercise?.name || exerciseType,
        sets: location.state?.sets || regimenExercise?.sets,
        reps: location.state?.reps || regimenExercise?.reps,
        duration,
        durationSeconds: derivedDurationSeconds,
        instructions: displayInstructions
      }
    });
  };

  if (loading) {
    return (
      <Layout title="Start Session">
        <div className="text-center text-hospital-600">Loading...</div>
      </Layout>
    );
  }

  if (!prescription) {
    return (
      <Layout title="Start Session">
        <div className="card">
          <p className="text-hospital-600">No active prescription found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Start Exercise Session">
      <div className="max-w-2xl mx-auto">
        <div className="card mb-6">
          <h3 className="text-xl font-bold text-hospital-900 mb-4">
            Exercise Information
          </h3>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between py-2 border-b border-hospital-200">
              <span className="text-hospital-600">Exercise Type:</span>
              <span className="font-medium">{displayExerciseType}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-hospital-200">
              <span className="text-hospital-600">Select Exercise:</span>
              <select
                value={selectedExercise}
                onChange={(event) => setSelectedExercise(event.target.value)}
                className="border border-hospital-200 rounded px-2 py-1 text-sm text-hospital-900"
              >
                <option value="curl">Curl</option>
                <option value="press">Press</option>
                <option value="squat">Squat</option>
                <option value="walking">Walking</option>
              </select>
            </div>
            <div className="flex justify-between py-2 border-b border-hospital-200">
              <span className="text-hospital-600">Target Duration:</span>
              <span className="font-medium">
                {displayDurationMinutes ? `${displayDurationMinutes} minutes` : '—'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-hospital-200">
              <span className="text-hospital-600">Sessions/Week:</span>
              <span className="font-medium">{displayWeeklyGoal}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-hospital-600">Condition:</span>
              <span className="font-medium">{prescription.condition}</span>
            </div>
          </div>

          {displayInstructions && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded mb-6">
              <p className="text-sm font-medium text-blue-900 mb-2">Instructions</p>
              <p className="text-sm text-blue-800">{displayInstructions}</p>
            </div>
          )}

          <div className="p-4 bg-amber-50 border border-amber-200 rounded mb-6">
            <p className="text-sm font-medium text-amber-900 mb-2">Safety Disclaimer</p>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• Stop immediately if you experience chest pain or severe discomfort</li>
              <li>• Maintain adequate hydration throughout the session</li>
              <li>• Follow prescribed intensity guidelines</li>
              <li>• Contact your doctor if symptoms persist</li>
            </ul>
          </div>

          <button onClick={handleStart} className="btn-primary w-full">
            Begin Session
          </button>
        </div>

        <button onClick={() => navigate('/patient/home')} className="btn-secondary w-full">
          Cancel
        </button>
      </div>
    </Layout>
  );
};

export default SessionStart;
