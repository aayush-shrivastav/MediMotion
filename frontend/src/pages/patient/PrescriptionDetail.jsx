import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../utils/api';

const PrescriptionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrescription();
  }, [id]);

  const loadPrescription = async () => {
    try {
      const data = await api.getPrescription(id);
      setPrescription(data);
    } catch (error) {
      console.error('Error loading prescription:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Prescription Details">
        <div className="text-center text-hospital-600">Loading...</div>
      </Layout>
    );
  }

  if (!prescription) {
    return (
      <Layout title="Prescription Details">
        <div className="card">
          <p className="text-hospital-600">Prescription not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Prescription Details">
      <div className="max-w-3xl">
        <div className="card mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-2xl font-bold text-hospital-900 mb-2">
                {prescription.condition}
              </h3>
              <p className="text-hospital-600">
                Prescribed by {prescription.doctorId?.name}
              </p>
            </div>
            <span className="badge bg-blue-100 text-medical-blue">
              {prescription.status}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-hospital-700 mb-1">Exercise Type</p>
              <p className="text-hospital-900">{prescription.plan.exerciseType}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-hospital-700 mb-1">Weekly Requirements</p>
              <p className="text-hospital-900">
                {prescription.plan.weeklyGoal} sessions per week, {prescription.plan.sessionDuration} minutes each
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-hospital-700 mb-1">Duration</p>
              <p className="text-hospital-900">
                {prescription.duration} days (
                {new Date(prescription.startDate).toLocaleDateString()} - {new Date(prescription.endDate).toLocaleDateString()})
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-hospital-700 mb-1">Minimum Compliance Threshold</p>
              <p className="text-hospital-900">{prescription.complianceThreshold}%</p>
            </div>

            {prescription.plan.instructions && (
              <div>
                <p className="text-sm font-medium text-hospital-700 mb-1">Instructions</p>
                <p className="text-hospital-900">{prescription.plan.instructions}</p>
              </div>
            )}

            {prescription.notes && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded">
                <p className="text-sm font-medium text-amber-900 mb-1">Doctor's Notes</p>
                <p className="text-sm text-amber-800">{prescription.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="card bg-hospital-50">
          <p className="text-sm text-hospital-700 mb-2">Medical Disclaimer</p>
          <p className="text-xs text-hospital-600">
            This prescription is a medical document. Follow all instructions carefully. 
            Contact your healthcare provider immediately if you experience chest pain, 
            severe shortness of breath, dizziness, or any concerning symptoms during exercise.
          </p>
        </div>

        <div className="mt-6">
          <button onClick={() => navigate('/patient/home')} className="btn-secondary">
            Back to Home
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default PrescriptionDetail;
