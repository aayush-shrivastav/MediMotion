import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import api from '../../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const Progress = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user?._id]);

  const loadData = async () => {
    if (!user?._id) {
      setLoading(false);
      return;
    }
    try {
      const [sessionsData, complianceData] = await Promise.all([
        api.getSessions(),
        api.getPatientCompliance(user._id)
      ]);
      setSessions(sessionsData);
      setCompliance(complianceData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeeklyData = () => {
    const weeks = {};
    sessions.forEach(session => {
      const date = new Date(session.timestamp);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = { week: weekKey, verified: 0, unverified: 0 };
      }

      if (session.verified) {
        weeks[weekKey].verified += 1;
      } else {
        weeks[weekKey].unverified += 1;
      }
    });

    return Object.values(weeks)
      .sort((a, b) => new Date(a.week) - new Date(b.week))
      .map(week => ({
        week: new Date(week.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        verified: week.verified,
        unverified: week.unverified
      }));
  };

  if (loading) {
    return (
      <Layout title="Progress">
        <div className="text-center text-hospital-600">Loading...</div>
      </Layout>
    );
  }

  const weeklyData = getWeeklyData();
  const verifiedCount = compliance?.verifiedSessions ?? sessions.filter(s => s.verified).length;
  const verificationRate = compliance?.verificationRate ?? (
    sessions.length > 0
      ? Math.round((sessions.filter(s => s.verified).length / sessions.length) * 100)
      : 0
  );
  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const missedSessions = compliance 
    ? Math.max(0, compliance.sessionsRequired - compliance.sessionsCompleted)
    : 0;

  const renderRiskLabel = () => {
    if (compliance?.riskStatus === 'on_track') {
      return <span className="badge-success">On Track</span>;
    }
    if (compliance?.riskStatus === 'no_active_prescription') {
      return <span className="badge-warning">No Active Plan</span>;
    }
    return <span className="badge-warning">At Risk</span>;
  };

  const getSessionStatus = (session) => {
    if (session.verified) {
      return { label: 'Verified', className: 'badge-success' };
    }

    if (session.terminatedEarly || session.terminationReason) {
      return { label: 'Terminated', className: 'badge-danger' };
    }

    const summaryStatus = session.verificationSummary?.status;
    if (summaryStatus === 'partial') {
      return { label: 'Partially Verified', className: 'badge-warning' };
    }
    if (summaryStatus === 'unverified') {
      return { label: 'Unverified', className: 'badge-danger' };
    }

    return { label: 'Pending', className: 'badge-warning' };
  };

  return (
    <Layout title="Progress & Compliance">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <p className="text-sm text-hospital-600 mb-2">Overall Compliance</p>
          <p className="text-4xl font-bold text-hospital-900">
            {compliance?.adherencePercentage || 0}%
          </p>
          <p className="text-sm text-hospital-600 mt-2">
            {compliance?.sessionsCompleted || 0} of {compliance?.sessionsRequired || 0} sessions
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-hospital-600 mb-2">Current Streak</p>
          <p className="text-4xl font-bold text-medical-green">
            {compliance?.streak || 0}
          </p>
          <p className="text-sm text-hospital-600 mt-2">consecutive days</p>
        </div>

        <div className="card">
          <p className="text-sm text-hospital-600 mb-2">Status</p>
          <p className="text-2xl font-bold">{renderRiskLabel()}</p>
          <p className="text-sm text-hospital-600 mt-2">
            Target: {compliance?.prescription?.complianceThreshold || 0}%
          </p>
        </div>

        <div className="card">
          <p className="text-sm text-hospital-600 mb-2">Verification Rate</p>
          <p className="text-4xl font-bold text-hospital-900">{verificationRate}%</p>
          <p className="text-sm text-hospital-600 mt-2">
            {verifiedCount} verified of {compliance?.sessionsCompleted || sessions.length} sessions
          </p>
        </div>
      </div>

      <div className="card mb-6">
        <h3 className="text-lg font-bold text-hospital-900 mb-4">Weekly Sessions</h3>
        {weeklyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="week" 
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
              <Legend />
              <Bar 
                dataKey="verified" 
                name="Verified"
                fill="#1e40af" 
                radius={[4, 4, 0, 0]}
                stackId="sessions"
              />
              <Bar 
                dataKey="unverified" 
                name="Pending/Failed"
                fill="#d97706" 
                radius={[4, 4, 0, 0]}
                stackId="sessions"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-hospital-600 py-12">No session data yet</p>
        )}
      </div>

      <div className="card">
        <h3 className="text-lg font-bold text-hospital-900 mb-4">Session History</h3>
        {recentSessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-hospital-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-hospital-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-hospital-700">Exercise</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-hospital-700">Duration</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-hospital-700">Verification</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-hospital-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.slice(0, 10).map((session) => {
                  const status = getSessionStatus(session);
                  return (
                  <tr key={session._id} className="border-b border-hospital-100">
                    <td className="py-3 px-4 text-sm text-hospital-900">
                      {new Date(session.timestamp).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-hospital-900">
                      {session.exerciseType}
                    </td>
                    <td className="py-3 px-4 text-sm text-hospital-900">
                      {session.duration} min
                    </td>
                      <td className="py-3 px-4 text-sm text-hospital-900">
                        {session.verificationSummary?.status || (session.verified ? 'verified' : 'pending')}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className={status.className}>{status.label}</span>
                      </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-hospital-600 py-8">No sessions logged yet</p>
        )}
      </div>

      {missedSessions > 0 && (
        <div className="card bg-amber-50 border-amber-200 mt-6">
          <p className="text-sm font-medium text-amber-900 mb-1">
            Missed Sessions
          </p>
          <p className="text-sm text-amber-800">
            You have missed {missedSessions} sessions based on your weekly goal. 
            Maintaining consistent compliance is important for your treatment plan.
          </p>
        </div>
      )}
    </Layout>
  );
};

export default Progress;
