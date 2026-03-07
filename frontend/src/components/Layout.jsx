import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo/MediPal Logo.png';

const Layout = ({ children, title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname.includes(path);

  return (
    <div className="min-h-screen bg-hospital-50 font-sans">
      <header className="bg-white border-b border-hospital-100 shadow-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="MediPal" className="h-12 w-auto" />
              <div className="flex flex-col justify-center">
                <p className="text-xs text-hospital-500 font-medium mt-1">Your Personal Medical Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-hospital-900">
                  {user?.name} <span className="font-normal text-hospital-400">| {user?.role === 'patient' ? 'Patient' : 'Doctor'}</span>
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="px-5 py-1.5 bg-white border border-hospital-200 text-hospital-900 text-sm font-semibold rounded-lg hover:bg-hospital-50 shadow-sm transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-hospital-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-4 py-3">
            {user?.role === 'patient' && (
              <>
                <button
                  onClick={() => navigate('/patient/home')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${isActive('/patient/home')
                      ? 'bg-medical-blue text-white shadow-md'
                      : 'text-hospital-600 hover:bg-hospital-50 hover:text-medical-blue'
                    }`}
                >
                  Home
                </button>
                <button
                  onClick={() => navigate('/patient/progress')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${isActive('/patient/progress')
                      ? 'bg-medical-blue text-white shadow-md'
                      : 'text-hospital-600 hover:bg-hospital-50 hover:text-medical-blue'
                    }`}
                >
                  Progress
                </button>
              </>
            )}
            {user?.role === 'doctor' && (
              <>
                <button
                  onClick={() => navigate('/doctor/dashboard')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${isActive('/doctor/dashboard')
                      ? 'bg-medical-blue text-white shadow-md'
                      : 'text-hospital-600 hover:bg-hospital-50 hover:text-medical-blue'
                    }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/doctor/prescription/new')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${isActive('/doctor/prescription/new')
                      ? 'bg-medical-blue text-white shadow-md'
                      : 'text-hospital-600 hover:bg-hospital-50 hover:text-medical-blue'
                    }`}
                >
                  New Prescription
                </button>
              </>
            )}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {title && (
          <h2 className="text-3xl font-bold text-hospital-900 mb-6 hidden">{title}</h2>
        )}
        {children}
      </main>
    </div>
  );
};

export default Layout;
