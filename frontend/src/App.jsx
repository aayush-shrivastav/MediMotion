import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PatientHome from './pages/patient/Home';
import PrescriptionDetail from './pages/patient/PrescriptionDetail';
import SessionStart from './pages/patient/SessionStart';
import SessionLive from './pages/patient/SessionLive';
import SessionComplete from './pages/patient/SessionComplete';
import Progress from './pages/patient/Progress';
import DoctorDashboard from './pages/doctor/Dashboard';
import PatientDetail from './pages/doctor/PatientDetail';
import PatientSessions from './pages/doctor/PatientSessions';
import NewPrescription from './pages/doctor/NewPrescription';
import DecisionRecord from './pages/doctor/DecisionRecord';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Patient Routes */}
          <Route
            path="/patient/home"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/prescription/:id"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PrescriptionDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/session/start"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <SessionStart />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/session/live"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <SessionLive />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/session/complete"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <SessionComplete />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/progress"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <Progress />
              </ProtectedRoute>
            }
          />
          
          {/* Doctor Routes */}
          <Route
            path="/doctor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/patient/:id"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <PatientDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/patient/:patientId/sessions"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <PatientSessions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/prescription/new"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <NewPrescription />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/decision/:patientId"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DecisionRecord />
              </ProtectedRoute>
            }
          />
          
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
