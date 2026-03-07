import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import SessionAnalysis from '../../components/SessionAnalysis';
import api from '../../utils/api';

const PatientSessions = () => {  
  const { patientId } = useParams();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [filter, setFilter] = useState('all'); // all, verified, unreviewed

  useEffect(() => {
    loadSessions();
  }, [patientId]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await api.getSessions(patientId);
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter(session => {
    if (filter === 'verified') return session.verified;
    if (filter === 'unreviewed') return !session.ptReview?.reviewed;
    return true;
  });

  const getStatusBadge = (session) => {
    if (session.exerciseType === 'walking') {
      if (session.terminatedEarly) {
        return <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Force Stopped</span>;
      }
      const status = session.verificationSummary?.status || 'pending';
      if (status === 'verified') {
        return <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Face Verified</span>;
      }
      if (status === 'partial') {
        return <span className="inline-block px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded">Partial Verification</span>;
      }
      if (status === 'unverified') {
        return <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Unverified</span>;
      }
      return <span className="inline-block px-2 py-1 bg-hospital-100 text-hospital-700 text-xs rounded">Pending</span>;
    }

    if (session.ptReview?.reviewed) {
      const deviation = Math.abs(session.ptReview.deviation);
      if (deviation > 20) {
        return <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Large Deviation</span>;
      }
      return <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded">PT Reviewed</span>;
    }
    return <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Needs Review</span>;
  };

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 85) return 'text-green-600';
    if (accuracy >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderMetrics = (session) => {
    if (session.exerciseType === 'walking') {
      const summary = session.verificationSummary || {};
      return (
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div className="bg-hospital-50 p-2 rounded">
            <div className="text-xs text-hospital-600">Duration</div>
            <div className="text-lg font-bold text-hospital-900">{session.duration}m</div>
          </div>
          <div className="bg-hospital-50 p-2 rounded">
            <div className="text-xs text-hospital-600">Face Checks</div>
            <div className="text-lg font-bold text-hospital-900">{summary.totalChecks || 0}</div>
          </div>
          <div className="bg-hospital-50 p-2 rounded">
            <div className="text-xs text-hospital-600">Passed</div>
            <div className="text-lg font-bold text-green-700">{summary.passed || 0}</div>
          </div>
          <div className="bg-hospital-50 p-2 rounded">
            <div className="text-xs text-hospital-600">Status</div>
            <div className="text-lg font-bold text-hospital-900 capitalize">{summary.status || 'Pending'}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-4 gap-3 mb-3">
        <div className="bg-hospital-50 p-2 rounded">
          <div className="text-xs text-hospital-600">Reps</div>
          <div className="text-lg font-bold text-hospital-900">{session.reps || 0}</div>
        </div>
        <div className="bg-hospital-50 p-2 rounded">
          <div className="text-xs text-hospital-600">Duration</div>
          <div className="text-lg font-bold text-hospital-900">{session.duration}s</div>
        </div>
        <div className="bg-hospital-50 p-2 rounded">
          <div className="text-xs text-hospital-600">AI Score</div>
          <div className={`text-lg font-bold ${getAccuracyColor(session.formAccuracy)}`}>
            {session.formAccuracy}%
          </div>
        </div>
        <div className="bg-hospital-50 p-2 rounded">
          <div className="text-xs text-hospital-600">PT Score</div>
          <div className="text-lg font-bold text-hospital-900">
            {session.ptReview?.ptScore || '-'}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Layout title="Patient Sessions">
        <div className="text-center text-hospital-600">Loading sessions...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Patient Sessions">
      {selectedSessionId && (
        <SessionAnalysis
          sessionId={selectedSessionId}
          onClose={() => setSelectedSessionId(null)}
        />
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 text-sm rounded transition ${
              filter === 'all'
                ? 'bg-medical-blue text-white'
                : 'bg-hospital-200 text-hospital-700 hover:bg-hospital-300'
            }`}
          >
            All ({sessions.length})
          </button>
          <button
            onClick={() => setFilter('verified')}
            className={`px-4 py-2 text-sm rounded transition ${
              filter === 'verified'
                ? 'bg-medical-blue text-white'
                : 'bg-hospital-200 text-hospital-700 hover:bg-hospital-300'
            }`}
          >
            Verified ({sessions.filter(s => s.verified).length})
          </button>
          <button
            onClick={() => setFilter('unreviewed')}
            className={`px-4 py-2 text-sm rounded transition ${
              filter === 'unreviewed'
                ? 'bg-medical-blue text-white'
                : 'bg-hospital-200 text-hospital-700 hover:bg-hospital-300'
            }`}
          >
            Needs Review ({sessions.filter(s => !s.ptReview?.reviewed).length})
          </button>
        </div>

        {/* Sessions List */}
        {filteredSessions.length === 0 ? (
          <div className="text-center py-8 text-hospital-600">
            <p>No sessions found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <div
                key={session._id}
                onClick={() => setSelectedSessionId(session._id)}
                className="bg-white border border-hospital-200 rounded-lg p-4 hover:shadow-lg transition cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-hospital-900">
                      {session.exerciseName || (session.exerciseType === 'walking' ? 'Walking' : 'Squat')}
                    </h3>
                    <p className="text-xs text-hospital-600">
                      {new Date(session.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {getStatusBadge(session)}
                </div>

                {renderMetrics(session)}

                {/* Deviation Warning */}
                {session.ptReview?.reviewed && Math.abs(session.ptReview.deviation) > 20 && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    ⚠️ Deviation: {Math.abs(session.ptReview.deviation).toFixed(0)}% (AI: {session.formAccuracy}% vs PT: {session.ptReview.ptScore}%)
                  </div>
                )}
                {session.exerciseType === 'walking' && session.terminationReason && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    Force stop reason: {session.terminationReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PatientSessions;
