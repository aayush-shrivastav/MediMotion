import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import api from '../../utils/api';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const complianceSummary = await api.getDoctorComplianceSummary(user._id);
      setPatients(complianceSummary);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(p => {
    if (filter === 'on_track') return p.riskStatus === 'on_track';
    if (filter === 'at_risk') return p.riskStatus === 'at_risk';
    return true;
  });

  const getStatusBadge = (status) => {
    if (status === 'on_track') {
      return <span className="badge-success">On Track</span>;
    }
    return <span className="badge-warning">At Risk</span>;
  };

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="text-center text-hospital-600">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Patient Overview">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-sm text-hospital-600 mb-2">Total Patients</p>
          <p className="text-3xl font-bold text-hospital-900">{patients.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-hospital-600 mb-2">On Track</p>
          <p className="text-3xl font-bold text-medical-green">
            {patients.filter(p => p.riskStatus === 'on_track').length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-hospital-600 mb-2">At Risk</p>
          <p className="text-3xl font-bold text-red-600">
            {patients.filter(p => p.riskStatus === 'at_risk').length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-hospital-600 mb-2">Avg Adherence</p>
          <p className="text-3xl font-bold text-medical-blue">
            {patients.length > 0 
              ? Math.round(patients.reduce((sum, p) => sum + (p.adherencePercentage || 0), 0) / patients.length)
              : 0}%
          </p>
        </div>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm rounded ${
              filter === 'all'
                ? 'bg-medical-blue text-white'
                : 'bg-hospital-200 text-hospital-700'
            }`}
          >
            All ({patients.length})
          </button>
          <button
            onClick={() => setFilter('on_track')}
            className={`px-4 py-2 text-sm rounded ${
              filter === 'on_track'
                ? 'bg-medical-blue text-white'
                : 'bg-hospital-200 text-hospital-700'
            }`}
          >
            On Track ({patients.filter(p => p.riskStatus === 'on_track').length})
          </button>
          <button
            onClick={() => setFilter('at_risk')}
            className={`px-4 py-2 text-sm rounded ${
              filter === 'at_risk'
                ? 'bg-medical-blue text-white'
                : 'bg-hospital-200 text-hospital-700'
            }`}
          >
            At Risk ({patients.filter(p => p.riskStatus === 'at_risk').length})
          </button>
        </div>
        
        <button
          onClick={() => navigate('/doctor/prescription/new')}
          className="btn-primary"
        >
          + Add Patient
        </button>
      </div>

      <div className="card">
        {filteredPatients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-hospital-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-hospital-700">
                    Patient
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-hospital-700">
                    Condition
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-hospital-700">
                    Sessions
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-hospital-700">
                    Adherence
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-hospital-700">
                    Avg Form
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-hospital-700">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-hospital-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => (
                  <tr
                    key={patient.patient._id}
                    className="border-b border-hospital-100 hover:bg-hospital-50"
                  >
                    <td className="py-3 px-4">
                      <div onClick={() => navigate(`/doctor/patient/${patient.patient._id}`)} className="cursor-pointer">
                        <p className="text-sm font-medium text-hospital-900">
                          {patient.patient.name}
                        </p>
                        <p className="text-xs text-hospital-600">{patient.patient.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-hospital-900">
                      {patient.condition || 'Not assigned'}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-hospital-900">
                      {patient.sessionsCompleted || 0}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-hospital-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              patient.adherencePercentage >= 80 ? 'bg-medical-green' :
                              patient.adherencePercentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(patient.adherencePercentage || 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-hospital-900 w-10">
                          {patient.adherencePercentage || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-hospital-900">
                      {patient.avgFormAccuracy !== undefined ? Math.round(patient.avgFormAccuracy) : 'N/A'}%
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(patient.riskStatus)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/doctor/patient/${patient.patient._id}`)}
                          className="px-3 py-1 bg-hospital-100 text-medical-blue text-xs rounded hover:bg-hospital-200 font-medium"
                        >
                          Profile
                        </button>
                        <button
                          onClick={() => navigate(`/doctor/patient/${patient.patient._id}/sessions`)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 font-medium"
                        >
                          Sessions
                        </button>
                        <button
                          onClick={() => navigate(`/doctor/decision/${patient.patient._id}`)}
                          className="px-3 py-1 bg-medical-blue text-white text-xs rounded hover:bg-blue-700 font-medium"
                        >
                          Adjust
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-hospital-600">
              {filter === 'all'
                ? 'No patients assigned'
                : `No patients ${filter.replace('_', ' ')}`}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DoctorDashboard;
