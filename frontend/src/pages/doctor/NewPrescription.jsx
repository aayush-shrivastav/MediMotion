import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../utils/api';
import BodyPartSimulator from '../../components/BodyPartSimulator';

const conditionTemplates = {
  diabetes: {
    name: 'Type 2 Diabetes Management',
    exerciseType: 'Cardiovascular Exercise',
    weeklyGoal: 5,
    sessionDuration: 30,
    instructions: 'Moderate-intensity aerobic exercise for 30 minutes, 5 times per week.',
    duration: 84,
    complianceThreshold: 80
  },
  hypertension: {
    name: 'Hypertension Management',
    exerciseType: 'Walking',
    weeklyGoal: 4,
    sessionDuration: 25,
    instructions: 'Brisk walking for 25 minutes, 4 times per week.',
    duration: 56,
    complianceThreshold: 75
  },
  cardiac: {
    name: 'Post-Cardiac Event Rehabilitation',
    exerciseType: 'Supervised Cardio',
    weeklyGoal: 3,
    sessionDuration: 20,
    instructions: 'Low-intensity supervised cardio, 20 minutes, 3 times per week.',
    duration: 42,
    complianceThreshold: 90
  },
  obesity: {
    name: 'Weight Management',
    exerciseType: 'Mixed Aerobic Activity',
    weeklyGoal: 5,
    sessionDuration: 40,
    instructions: 'Moderate aerobic activity for 40 minutes, 5 times per week.',
    duration: 90,
    complianceThreshold: 75
  }
};

const NewPrescription = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [regimenTemplateKey, setRegimenTemplateKey] = useState('');
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    age: '',
    sex: '',
    condition: '',
    regimenName: '',
    frequency: '',
    minimumPostureScore: 70,
    exercises: [],
    exerciseType: '',
    weeklyGoal: 3,
    sessionDuration: 30,
    instructions: '',
    duration: 56,
    complianceThreshold: 80,
    notes: ''
  });
  const [exerciseInput, setExerciseInput] = useState({
    name: '',
    sets: 3,
    reps: 10,
    duration: 60
  });

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const data = await api.getUsers('patient', { assignedOnly: false });
      setPatients(data);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const handleTemplateSelect = (templateKey) => {
    const template = conditionTemplates[templateKey];
    if (template) {
      setFormData({
        ...formData,
        regimenName: template.name,
        exerciseType: template.exerciseType,
        weeklyGoal: template.weeklyGoal,
        sessionDuration: template.sessionDuration,
        instructions: template.instructions,
        duration: template.duration,
        complianceThreshold: template.complianceThreshold
      });
    }
  };

  const handleAddExercise = () => {
    if (exerciseInput.name) {
      setFormData({
        ...formData,
        exercises: [...formData.exercises, { ...exerciseInput }]
      });
      setExerciseInput({ name: '', sets: 3, reps: 10, duration: 60 });
    }
  };

  const handleRemoveExercise = (index) => {
    setFormData({
      ...formData,
      exercises: formData.exercises.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.exercises.length === 0) {
      alert('Please add at least one exercise to the regimen.');
      return;
    }
    setLoading(true);

    try {
      const primaryExercise = formData.exerciseType || formData.exercises[0]?.name || '';
      const prescriptionData = {
        patientId: formData.patientId,
        condition: formData.condition,
        regimen: {
          name: formData.regimenName,
          frequency: formData.frequency,
          minimumPostureScore: parseInt(formData.minimumPostureScore),
          exercises: formData.exercises
        },
        plan: {
          exerciseType: primaryExercise,
          weeklyGoal: parseInt(formData.weeklyGoal),
          sessionDuration: parseInt(formData.sessionDuration),
          instructions: formData.instructions
        },
        duration: parseInt(formData.duration),
        complianceThreshold: parseInt(formData.complianceThreshold),
        startDate: new Date(),
        notes: formData.notes
      };

      console.log('Sending prescription data:', prescriptionData);
      await api.createPrescription(prescriptionData);

      alert('Prescription created successfully');
      navigate('/doctor/dashboard');
    } catch (error) {
      console.error('Error creating prescription:', error);
      alert('Failed to create prescription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Add New Patient">
      <div className="max-w-6xl mx-auto">
        <form onSubmit={handleSubmit} className="card">
          <h3 className="text-lg font-bold text-hospital-900 mb-6">Patient Information</h3>

          <div className="space-y-6">
            {/* Patient Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Patient *</label>
                <select
                  value={formData.patientId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const selectedPatient = patients.find((p) => p._id === selectedId);
                    setFormData({
                      ...formData,
                      patientId: selectedId,
                      patientName: selectedPatient?.name || '',
                      age: selectedPatient?.age || '',
                      sex: selectedPatient?.sex || '',
                      condition: selectedPatient?.condition || ''
                    });
                  }}
                  className="input-field"
                  required
                >
                  <option value="">Select patient</option>
                  {patients.map((patient) => (
                    <option key={patient._id} value={patient._id}>
                      {patient.name} ({patient.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-hospital-600 mt-1">
                  Select by email to avoid duplicate names.
                </p>
                {patients.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    No patients found. Add patient accounts first or check backend connectivity.
                  </p>
                )}
              </div>
              <div>
                <label className="label">Age *</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="input-field"
                  placeholder="45"
                  required
                  readOnly
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Sex *</label>
                <select
                  value={formData.sex}
                  onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                  className="input-field"
                  required
                  disabled
                >
                  <option value="">Select sex</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Condition *</label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Select condition</option>
                  <option value="Post-ACL Rehab">Post-ACL Rehab</option>
                  <option value="Lower Back Pain">Lower Back Pain</option>
                  <option value="Shoulder Rehab">Shoulder Rehab</option>
                  <option value="Knee Flexion">Knee Flexion</option>
                  <option value="Core Stability">Core Stability</option>
                  <option value="ROM Program">ROM Program</option>
                </select>
              </div>
            </div>

            <hr className="border-hospital-200 my-6" />

            <h3 className="text-lg font-bold text-hospital-900 mb-4">Assign Training Regimen</h3>

            <div className="flex gap-6">
              <div className="flex-1 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Regimen Template</label>
                    <select
                      value={regimenTemplateKey}
                      onChange={(e) => {
                        const nextKey = e.target.value;
                        setRegimenTemplateKey(nextKey);
                        if (nextKey) {
                          handleTemplateSelect(nextKey);
                        }
                      }}
                      className="input-field"
                    >
                      <option value="">Select template (optional)</option>
                      <option value="diabetes">Type 2 Diabetes Management</option>
                      <option value="hypertension">Hypertension Management</option>
                      <option value="cardiac">Post-Cardiac Event Rehabilitation</option>
                      <option value="obesity">Weight Management</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Regimen *</label>
                    <input
                      type="text"
                      value={formData.regimenName}
                      onChange={(e) => setFormData({ ...formData, regimenName: e.target.value })}
                      className="input-field"
                      placeholder="Select regimen"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Frequency *</label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      className="input-field"
                      required
                    >
                      <option value="">Select frequency</option>
                      <option value="1 session daily">1 session daily</option>
                      <option value="2 sessions daily">2 sessions daily</option>
                      <option value="3 sessions weekly">3 sessions weekly</option>
                      <option value="5 sessions weekly">5 sessions weekly</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label">Minimum Posture Score *</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.minimumPostureScore}
                        onChange={(e) => setFormData({ ...formData, minimumPostureScore: e.target.value })}
                        className="input-field pr-8"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-hospital-600">%</span>
                    </div>
                  </div>
                </div>

                {/* Exercises Section */}
                <div className="border border-hospital-200 rounded-lg p-4">
                  <label className="label mb-3">Exercises *</label>

                  <p className="text-xs text-hospital-600 mb-4">
                    Based on visual pose tracking. Only reports towards progress if score is at least {formData.minimumPostureScore}% (as defined percentage).
                  </p>

                  {/* Exercise List */}
                  {formData.exercises.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {formData.exercises.map((exercise, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-hospital-50 rounded">
                          <div>
                            <p className="text-sm font-medium text-hospital-900">{exercise.name}</p>
                            <p className="text-xs text-hospital-600">
                              {exercise.sets} sets × {exercise.reps} reps • {exercise.duration}s duration
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveExercise(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Exercise Form */}
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <select
                      value={exerciseInput.name}
                      onChange={(e) => setExerciseInput({ ...exerciseInput, name: e.target.value })}
                      className="input-field col-span-4 mb-2"
                    >
                      <option value="">Select exercise</option>
                      <option value="walking">Walking</option>
                      <option value="squat">Squat</option>
                      <option value="press">Press</option>
                      <option value="curl">Curl</option>
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={exerciseInput.sets}
                      onChange={(e) => setExerciseInput({ ...exerciseInput, sets: parseInt(e.target.value) })}
                      className="input-field"
                      placeholder="Sets"
                    />
                    <input
                      type="number"
                      min="1"
                      value={exerciseInput.reps}
                      onChange={(e) => setExerciseInput({ ...exerciseInput, reps: parseInt(e.target.value) })}
                      className="input-field"
                      placeholder="Reps"
                    />
                    <input
                      type="number"
                      min="5"
                      value={exerciseInput.duration}
                      onChange={(e) => setExerciseInput({ ...exerciseInput, duration: parseInt(e.target.value) })}
                      className="input-field"
                      placeholder="Duration (s)"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddExercise}
                    className="text-medical-blue hover:text-medical-blue-dark text-sm font-medium"
                  >
                    + Add Exercise
                  </button>
                </div>
              </div>

              <div className="w-1/3 min-w-[300px]">
                <div className="border border-hospital-200 rounded-lg p-4 h-full bg-white">
                  <h4 className="text-base font-bold text-hospital-900 mb-4 border-b border-hospital-100 pb-2">Body Part Simulator</h4>
                  <div className="flex items-center justify-center p-4">
                    <BodyPartSimulator activeExercises={[
                      ...(formData.exercises || []).map(ex => ex.name),
                      exerciseInput.name
                    ].filter(Boolean)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4 border-t border-hospital-200">
              <button
                type="button"
                onClick={() => navigate('/doctor/dashboard')}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Patient'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default NewPrescription;
