import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../utils/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const PatientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [patientData, complianceData, sessionsData] = await Promise.all([
        api.getUser(id),
        api.getPatientCompliance(id),
        api.getSessions(id)
      ]);
      setPatient(patientData);
      setCompliance(complianceData);
      setSessions(sessionsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendData = () => {
    const dailyData = {};
    sessions.forEach(session => {
      const date = new Date(session.timestamp).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = 0;
      }
      if (session.verified) {
        dailyData[date]++;
      }
    });

    return Object.entries(dailyData)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sessions: count
      }));
  };

  if (loading) {
    return (
      <Layout title="Patient Details">
        <div className="text-center text-hospital-600">Loading...</div>
      </Layout>
    );
  }

  if (!patient) {
    return (
      <Layout title="Patient Details">
        <div className="card">
          <p className="text-hospital-600">Patient not found</p>
        </div>
      </Layout>
    );
  }

  const getStatusBadge = (status) => {
    if (status === 'on_track') {
      return <span className="badge-success">On Track</span>;
    }
    return <span className="badge-warning">Needs Attention</span>;
  };

  const trendData = getTrendData();
  const verifiedSessions = sessions.filter(s => s.verified);
  const lowCompliancePeriods = compliance && compliance.adherencePercentage < compliance.prescription?.complianceThreshold;

  return (
    <Layout title="Patient Details">
      {/* Patient Header */}
      <div className="card mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-2xl font-bold text-hospital-900 mb-1">
              {patient.name}
            </h3>
            <p className="text-hospital-600 text-sm">
              {patient.age || 'N/A'} years • {patient.sex || 'N/A'} • {patient.condition || patient.email}
            </p>
          </div>
          <button
            onClick={() => navigate('/doctor/dashboard')}
            className="text-hospital-600 hover:text-hospital-900"
          >
            Edit Regimen
          </button>
        </div>

        {compliance?.prescription && (
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-hospital-50 rounded">
              <p className="text-sm text-hospital-600 mb-1">Adherence</p>
              <div className="flex items-center gap-2">
                <div className="w-full bg-hospital-200 rounded-full h-2">
                  <div
                    className="bg-medical-green h-2 rounded-full transition-all"
                    style={{ width: `${compliance.adherencePercentage}%` }}
                  />
                </div>
                <p className="text-2xl font-bold text-hospital-900">
                  {compliance.adherencePercentage}%
                </p>
              </div>
            </div>
            <div className="p-4 bg-hospital-50 rounded">
              <p className="text-sm text-hospital-600 mb-1">Improvement</p>
              <p className="text-2xl font-bold text-medical-green">
                {compliance.improvementPercentage !== undefined ? `+${compliance.improvementPercentage}%` : 'N/A'}
              </p>
            </div>
            <div className="p-4 bg-hospital-50 rounded">
              <p className="text-sm text-hospital-600 mb-1">Status</p>
              <div className="mt-1">
                {getStatusBadge(compliance.riskStatus)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assigned Training Regimens */}
      <div className="card mb-6">
        <h3 className="text-lg font-bold text-hospital-900 mb-4">
          Assigned Training Regimens
        </h3>
        
        {compliance?.prescription?.regimen ? (
          <div className="border border-hospital-200 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-semibold text-hospital-900">
                  {compliance.prescription.regimen.name || 'Knee Rehabilitation - Phase 1'}
                </h4>
                <p className="text-sm text-hospital-600">
                  {compliance.prescription.regimen.frequency || 'Exercise details not available'}
                </p>
              </div>
              <span className="text-sm font-medium text-medical-blue">
                Frequency: {compliance.prescription.regimen.frequency || '1 session daily'}
              </span>
            </div>

            {compliance.prescription.regimen.exercises && compliance.prescription.regimen.exercises.length > 0 ? (
              <div className="space-y-2">
                {compliance.prescription.regimen.exercises.map((exercise, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-hospital-50 rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-medical-blue text-white flex items-center justify-center text-sm font-semibold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-hospital-900">{exercise.name}</p>
                        <p className="text-xs text-hospital-600">
                          {exercise.sets} × {exercise.reps} reps • {exercise.duration}s
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-hospital-600">No training regimen assigned</p>
        )}
      </div>

      {/* Daily Compliance & Doctor Actions */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-hospital-900">Daily Compliance</h3>
            <span className="text-sm text-hospital-600">Last 14 Days</span>
          </div>
          
          <div className="flex gap-2 mb-4 flex-wrap">
            {trendData && trendData.length > 0 ? (
              trendData.map((day, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                    day.sessions > 0 ? 'bg-medical-green text-white' : 'bg-hospital-200 text-hospital-600'
                  }`}
                  title={`${day.date}: ${day.sessions} session(s)`}
                >
                  {day.sessions > 0 ? '✓' : ''}
                </div>
              ))
            ) : (
              <p className="text-sm text-hospital-600">No session data available</p>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <span className="w-4 h-4 rounded-full bg-medical-green"></span>
            <span className="text-hospital-700">Completed</span>
            <span className="w-4 h-4 rounded-full bg-hospital-200 ml-4"></span>
            <span className="text-hospital-700">Pending</span>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-bold text-hospital-900 mb-4">Doctor Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => navigate(`/doctor/decision/${patient._id}`)}
              className="w-full text-left px-4 py-3 border border-hospital-200 rounded-lg hover:bg-hospital-50 flex items-center justify-between"
            >
              <span className="text-sm text-hospital-900">✏️ Adjust Regimen</span>
              <span className="text-hospital-400">›</span>
            </button>
            <button className="w-full text-left px-4 py-3 border border-hospital-200 rounded-lg hover:bg-hospital-50 flex items-center justify-between">
              <span className="text-sm text-hospital-900">⚠️ Advance to Next Phase</span>
              <span className="text-hospital-400">›</span>
            </button>
            <button className="w-full text-left px-4 py-3 border border-hospital-200 rounded-lg hover:bg-hospital-50 flex items-center justify-between">
              <span className="text-sm text-hospital-900">📝 Add Doctor Note</span>
              <span className="text-hospital-400">›</span>
            </button>
          </div>

          <div className="mt-6 space-y-2">
            <div className="text-sm font-medium text-hospital-700 mb-2">Flags</div>
            <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
              ⚠️ Consistently above threshold
            </div>
            {lowCompliancePeriods && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-900">
                ⚠️ Compliance below threshold
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 card">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-2xl font-bold text-hospital-900 mb-1 opacity-0">
                {patient.name}
              </h3>
              <p className="text-hospital-600 opacity-0">{patient.email}</p>
            </div>
            <button
              onClick={() => navigate(`/doctor/decision/${patient._id}`)}
              className="btn-primary opacity-0"
            >
              Record Decision
            </button>
          </div>

          {compliance?.prescription && (
            <div className="p-4 bg-hospital-50 rounded opacity-0">
              <p className="text-sm font-medium text-hospital-700 mb-2">
                Current Prescription
              </p>
              <p className="text-hospital-900">{compliance.prescription.condition}</p>
            </div>
          )}
        </div>

        <div className="space-y-4 opacity-0">
          <div className="card">
            <p className="text-sm text-hospital-600 mb-2">Compliance Rate</p>
            <p className="text-4xl font-bold text-hospital-900">
              {compliance?.adherencePercentage || 0}%
            </p>
            <p className="text-sm text-hospital-600 mt-2">
              Target: {compliance?.prescription?.complianceThreshold || 0}%
            </p>
          </div>

          <div className="card">
            <p className="text-sm text-hospital-600 mb-2">Current Streak</p>
            <p className="text-4xl font-bold text-medical-green">
              {compliance?.streak || 0}
            </p>
            <p className="text-sm text-hospital-600 mt-2">days</p>
          </div>
        </div>
      </div>

      {lowCompliancePeriods && (
        <div className="card bg-amber-50 border-amber-200 mb-6">
          <p className="text-sm font-medium text-amber-900 mb-1">
            Low Compliance Alert
          </p>
          <p className="text-sm text-amber-800">
            Patient compliance is below the prescribed threshold. 
            Consider follow-up consultation or treatment adjustment.
          </p>
        </div>
      )}

      <div className="card mb-6">
        <h3 className="text-lg font-bold text-hospital-900 mb-4">
          Compliance Trend
        </h3>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                stroke="#64748b"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#64748b"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="sessions" 
                stroke="#1e40af" 
                strokeWidth={2}
                dot={{ fill: '#1e40af', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-hospital-600 py-12">No trend data available</p>
        )}
      </div>

      <div className="card">
        <h3 className="text-lg font-bold text-hospital-900 mb-4">
          Session History
        </h3>
        {verifiedSessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-hospital-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-hospital-700">
                    Date & Time
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-hospital-700">
                    Exercise Type
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-hospital-700">
                    Duration
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-hospital-700">
                    Verification
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-hospital-700">
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody>
                {verifiedSessions.map((session) => (
                  <tr key={session._id} className="border-b border-hospital-100">
                    <td className="py-3 px-4 text-sm text-hospital-900">
                      {new Date(session.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-hospital-900">
                      {session.exerciseType}
                    </td>
                    <td className="py-3 px-4 text-sm text-hospital-900">
                      {session.duration} min
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className="badge-success">Verified</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-hospital-900">
                      {session.confidence}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-hospital-600 py-8">
            No verified sessions yet
          </p>
        )}
      </div>

      <div className="mt-6">
        <button onClick={() => navigate('/doctor/dashboard')} className="btn-secondary">
          Back to Dashboard
        </button>
      </div>
    </Layout>
  );
};

export default PatientDetail;
