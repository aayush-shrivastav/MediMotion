import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../utils/api';

const DecisionRecord = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    summary: '',
    labValues: {
      bloodPressure: '',
      glucose: '',
      cholesterol: '',
      weight: ''
    },
    outcome: '',
    nextSteps: ''
  });

  useEffect(() => {
    loadData();
  }, [patientId]);

  const loadData = async () => {
    try {
      const [patientData, complianceData] = await Promise.all([
        api.getUser(patientId),
        api.getPatientCompliance(patientId)
      ]);
      setPatient(patientData);
      setCompliance(complianceData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.createDecision({
        patientId,
        prescriptionId: compliance?.prescription?.id,
        summary: formData.summary,
        complianceData: {
          adherencePercentage: compliance?.adherencePercentage,
          sessionsCompleted: compliance?.sessionsCompleted,
          sessionsRequired: compliance?.sessionsRequired
        },
        labValues: formData.labValues,
        outcome: formData.outcome,
        nextSteps: formData.nextSteps
      });

      alert('Treatment decision recorded successfully');
      navigate(`/doctor/patient/${patientId}`);
    } catch (error) {
      console.error('Error recording decision:', error);
      alert('Failed to record decision');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Record Treatment Decision">
        <div className="text-center text-hospital-600">Loading...</div>
      </Layout>
    );
  }

  if (!patient) {
    return (
      <Layout title="Record Treatment Decision">
        <div className="card">
          <p className="text-hospital-600">Patient not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Record Treatment Decision">
      <div className="max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="card">
            <p className="text-sm text-hospital-600 mb-1">Patient</p>
            <p className="text-xl font-bold text-hospital-900">{patient.name}</p>
          </div>
          <div className="card">
            <p className="text-sm text-hospital-600 mb-1">Compliance Rate</p>
            <p className="text-3xl font-bold text-hospital-900">
              {compliance?.adherencePercentage || 0}%
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-hospital-600 mb-1">Sessions</p>
            <p className="text-3xl font-bold text-hospital-900">
              {compliance?.sessionsCompleted || 0} / {compliance?.sessionsRequired || 0}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card">
          <h3 className="text-xl font-bold text-hospital-900 mb-6">
            Treatment Decision Form
          </h3>

          <div className="space-y-6">
            {/* Lab Values */}
            <div className="p-4 bg-hospital-50 rounded">
              <p className="font-medium text-hospital-900 mb-4">Lab Values</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Blood Pressure</label>
                  <input
                    type="text"
                    value={formData.labValues.bloodPressure}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        labValues: { ...formData.labValues, bloodPressure: e.target.value }
                      })
                    }
                    className="input-field"
                    placeholder="e.g., 120/80"
                  />
                </div>
                <div>
                  <label className="label">Blood Glucose (mg/dL)</label>
                  <input
                    type="text"
                    value={formData.labValues.glucose}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        labValues: { ...formData.labValues, glucose: e.target.value }
                      })
                    }
                    className="input-field"
                    placeholder="e.g., 95"
                  />
                </div>
                <div>
                  <label className="label">Cholesterol (mg/dL)</label>
                  <input
                    type="text"
                    value={formData.labValues.cholesterol}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        labValues: { ...formData.labValues, cholesterol: e.target.value }
                      })
                    }
                    className="input-field"
                    placeholder="e.g., 180"
                  />
                </div>
                <div>
                  <label className="label">Weight (lbs)</label>
                  <input
                    type="text"
                    value={formData.labValues.weight}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        labValues: { ...formData.labValues, weight: e.target.value }
                      })
                    }
                    className="input-field"
                    placeholder="e.g., 165"
                  />
                </div>
              </div>
            </div>

            {/* Compliance Summary (read-only display) */}
            {compliance && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="font-medium text-blue-900 mb-2">Compliance Summary</p>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>Adherence Rate: {compliance.adherencePercentage}%</p>
                  <p>Sessions Completed: {compliance.sessionsCompleted} of {compliance.sessionsRequired}</p>
                  <p>Current Streak: {compliance.streak} days</p>
                  <p>Status: {compliance.riskStatus === 'on_track' ? 'On Track' : 'At Risk'}</p>
                </div>
              </div>
            )}

            {/* Clinical Summary */}
            <div>
              <label className="label">Clinical Summary *</label>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                className="input-field"
                rows={4}
                placeholder="Comprehensive clinical assessment including symptoms, progress, and compliance analysis..."
                required
              />
            </div>

            {/* Treatment Outcome */}
            <div>
              <label className="label">Treatment Outcome *</label>
              <select
                value={formData.outcome}
                onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                className="input-field"
                required
              >
                <option value="">Select outcome</option>
                <option value="Continue current prescription">Continue Current Prescription</option>
                <option value="Modify exercise intensity">Modify Exercise Intensity</option>
                <option value="Adjust medication based on compliance">Adjust Medication Based on Compliance</option>
                <option value="Refer to specialist">Refer to Specialist</option>
                <option value="Schedule follow-up in 2 weeks">Schedule Follow-up</option>
                <option value="Discharge from program - goals met">Discharge - Goals Met</option>
              </select>
            </div>

            {/* Next Steps */}
            <div>
              <label className="label">Next Steps *</label>
              <textarea
                value={formData.nextSteps}
                onChange={(e) => setFormData({ ...formData, nextSteps: e.target.value })}
                className="input-field"
                rows={3}
                placeholder="Detailed action items, follow-up timeline, and patient instructions..."
                required
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4 border-t border-hospital-200">
              <button
                type="button"
                onClick={() => navigate(`/doctor/patient/${patientId}`)}
                className="btn-secondary flex-1"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={submitting}
              >
                {submitting ? 'Recording...' : 'Record Decision'}
              </button>
            </div>
          </div>
        </form>

        <div className="card bg-amber-50 border-amber-200 mt-6">
          <p className="text-sm font-medium text-amber-900 mb-1">
            Permanent Medical Record
          </p>
          <p className="text-xs text-amber-800">
            This decision will be permanently recorded in the patient's medical history 
            and will be available for audit and review. Ensure all information is accurate 
            and complies with clinical documentation standards.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default DecisionRecord;
