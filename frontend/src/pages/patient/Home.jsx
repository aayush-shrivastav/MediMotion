import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import api from '../../utils/api';

const PatientHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prescription, setPrescription] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    if (!user?._id) return undefined;
    const refreshInterval = setInterval(loadData, 10000);
    return () => clearInterval(refreshInterval);
  }, [user?._id]);

  const loadData = async () => {
    if (!user?._id) {
      setLoading(false);
      return;
    }
    try {
      const prescriptions = await api.getPrescriptions();
      const activePrescription = prescriptions.find(p => p.status === 'active');
      setPrescription(activePrescription);

      if (activePrescription) {
        const complianceData = await api.getPatientCompliance(user._id);
        setCompliance(complianceData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Home">
        <div className="flex h-[50vh] items-center justify-center">
          <div className="text-hospital-400 animate-pulse">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!prescription) {
    return (
      <Layout title="Home">
        <div className="max-w-md mx-auto mt-10">
          <div className="card text-center p-8">
            <div className="w-16 h-16 bg-hospital-100 rounded-full flex items-center justify-center mx-auto mb-4 text-hospital-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-hospital-900 mb-2">No Active Prescription</h3>
            <p className="text-hospital-600">
              Contact your doctor to receive an exercise prescription and start your recovery journey.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto pb-12 space-y-8">
        {/* Welcome Header */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-medical-blue flex items-center justify-center text-white text-xl font-bold border-4 border-white shadow-sm">
                {user?.name?.charAt(0) || 'P'}
              </div>
              <div>
                <p className="text-hospital-500 font-medium text-sm">Hi, Welcome Back !</p>
                <h2 className="text-xl font-bold text-hospital-900 leading-none mt-0.5">{user?.name}</h2>
              </div>
            </div>
            <button className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-hospital-100 text-hospital-900 hover:bg-hospital-50 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </div>

          <h1 className="text-3xl font-bold text-hospital-900 leading-tight">
            Consistency beats perfection.<br />
            Let's begin !
          </h1>
        </div>

        {/* Progress Card */}
        <div className="bg-medical-blue rounded-[2rem] p-6 text-white shadow-xl shadow-blue-900/10 relative overflow-hidden">
          <div className="flex justify-between items-center mb-4 relative z-10">
            <h3 className="font-medium text-blue-100">7 day progress</h3>
            <span className="text-xs font-bold bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
              {Math.round(((compliance?.sessionsCompleted || 0) / Math.max(compliance?.sessionsRequired || 1, 1)) * 100)}% sessions complete
            </span>
          </div>

          <div className="flex gap-2 mb-6 h-2 relative z-10">
            {prescription?.plan?.weeklyGoal && [...Array(prescription.plan.weeklyGoal)].map((_, i) => {
              const completed = i < (compliance?.sessionsCompleted || 0);
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full ${completed ? 'bg-amber-300' : 'bg-white/20'}`}
                />
              );
            })}
          </div>

          <p className="text-blue-50 font-medium flex items-center gap-2 relative z-10 text-sm sm:text-base">
            Keep going and maintain your streak <span className="text-lg">🔥</span>
          </p>
        </div>

        {/* Regimen Card */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-hospital-100">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-lg font-bold text-hospital-900">Today's Regimen</h3>
            <span className="text-xs sm:text-sm text-hospital-500 font-medium text-right max-w-[50%]">
              {prescription.condition || 'General Therapy'}
            </span>
          </div>

          {prescription.regimen?.exercises && prescription.regimen.exercises.length > 0 ? (
            <div className="space-y-4 mb-6">
              {prescription.regimen.exercises.map((exercise, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate('/patient/session/start', {
                    state: {
                      prescriptionId: prescription._id,
                      exerciseName: exercise.name,
                      exerciseType: exercise.type || exercise.name?.toLowerCase(),
                      sets: exercise.sets,
                      reps: exercise.reps,
                      duration: exercise.duration,
                      instructions: exercise.instructions
                    }
                  })}
                  className="flex items-center justify-between p-3 -mx-3 hover:bg-hospital-50 rounded-2xl cursor-pointer group transition-all border border-transparent hover:border-hospital-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-hospital-900">{exercise.name}</h4>
                      <p className="text-xs text-hospital-500 font-medium mt-0.5">
                        {exercise.sets} sets{exercise.reps ? `, ${exercise.reps} reps each` : `, ${exercise.duration} seconds`}
                      </p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-hospital-300 group-hover:text-medical-blue transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-hospital-500">
              No exercises assigned for today.
            </div>
          )}

          <button
            onClick={() => {
              if (prescription.regimen?.exercises?.[0]) {
                const ex = prescription.regimen.exercises[0];
                navigate('/patient/session/start', {
                  state: {
                    prescriptionId: prescription._id,
                    exerciseName: ex.name,
                    exerciseType: ex.type || ex.name?.toLowerCase(),
                    sets: ex.sets,
                    reps: ex.reps,
                    duration: ex.duration,
                    instructions: ex.instructions
                  }
                });
              }
            }}
            disabled={!prescription.regimen?.exercises?.length}
            className="w-full py-4 bg-amber-300 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-hospital-900 font-bold text-lg rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
          >
            Start Session
          </button>
        </div>

        {/* Bottom Stats Grid */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-hospital-100 flex flex-col h-44 relative overflow-hidden group hover:border-blue-100 transition-all">
            <div className="flex items-center gap-2 mb-2 text-hospital-900 font-bold z-10">
              <span className="text-xl">🔥</span>
              Current Streak
            </div>
            <div className="mt-auto z-10">
              <span className="text-6xl font-bold text-medical-blue tracking-tighter">{compliance?.streak || 0}</span>
              <span className="text-hospital-500 font-bold ml-2 text-lg">Days</span>
            </div>
            {/* Decorative background element */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-50 rounded-full opacity-50 group-hover:scale-110 transition-transform" />
          </div>

          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-hospital-100 flex flex-col h-44 relative overflow-hidden group hover:border-blue-100 transition-all">
            <div className="flex items-center gap-2 mb-2 text-hospital-900 font-bold z-10">
              <svg className="w-5 h-5 text-hospital-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Progress Rate
            </div>
            <div className="mt-auto z-10">
              <span className="text-6xl font-bold text-medical-blue tracking-tighter">{compliance?.adherencePercentage || 0}%</span>
            </div>
            {/* Decorative background element */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-50 rounded-full opacity-50 group-hover:scale-110 transition-transform" />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PatientHome;
