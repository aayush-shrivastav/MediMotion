import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FaceCapture from '../components/FaceCapture';

const Signup = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    sex: 'female',
    condition: ''
  });
  const [faceImage, setFaceImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (evt) => {
    const { name, value } = evt.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitClick = () => {
    const formElement = formRef.current;
    if (!formElement) return;

    if (!formElement.checkValidity()) {
      formElement.reportValidity();
      setError('Complete all required fields before signing up.');
    }
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    setError('');

    const ageValue = parseInt(form.age, 10);
    if (Number.isNaN(ageValue)) {
      setError('Enter a valid age to continue');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!faceImage) {
      setError('Capture a face snapshot to enable biometric verification');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        age: ageValue,
        sex: form.sex,
        condition: form.condition,
        role: 'patient',
        faceImage
      };

      const user = await signup(payload);
      if (user.role === 'doctor') {
        navigate('/doctor/dashboard');
      } else {
        navigate('/patient/home');
      }
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl grid md:grid-cols-2">
        <div className="p-6 md:p-10 border-r border-hospital-100">
          <h1 className="text-3xl font-bold text-hospital-900 mb-2">Create an account</h1>
          <p className="text-sm text-hospital-600 mb-6">
            FitCred pairs medical-grade exercise coaching with biometric verification. Your face snapshot never leaves the encrypted face service.
          </p>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="input-field"
                placeholder="Jane Doe"
                required
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="input-field"
                placeholder="you@email.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Age</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  name="age"
                  value={form.age}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Sex</label>
                <select name="sex" value={form.sex} onChange={handleChange} className="input-field" required>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="label">Condition</label>
                <select name="condition" value={form.condition} onChange={handleChange} className="input-field" required>
                  <option value="">Select</option>
                  <option value="Post-ACL Rehab">Post-ACL Rehab</option>
                  <option value="Lower Back Pain">Lower Back Pain</option>
                  <option value="Shoulder Rehab">Shoulder Rehab</option>
                  <option value="Hypertension">Hypertension</option>
                </select>
              </div>
            </div>

            <FaceCapture value={faceImage} onChange={setFaceImage} label="Identity capture" />

            {error && (
              <div className="p-3 rounded bg-red-50 border border-red-200 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
              onClick={handleSubmitClick}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-xs text-hospital-500 mt-4">
            By continuing you agree to consent-based camera use for identity verification. Images are converted to embeddings and never stored in FitCred.
          </p>
        </div>

        <div className="p-6 md:p-10 bg-hospital-900 text-white rounded-b-2xl md:rounded-b-none md:rounded-r-2xl flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Already have an account?</h2>
            <p className="text-sm text-white/80 mb-6">
              Log in to access your exercise prescriptions, AI form coaching, and doctor messaging.
            </p>
            <Link to="/login" className="btn-secondary w-full text-center text-hospital-900 bg-white">
              Log in
            </Link>
          </div>

          <div className="text-xs text-white/70 mt-10">
            <p>• HIPAA-aware authentication</p>
            <p>• Face verification only triggers with your consent</p>
            <p>• Embeddings never leave the ML service</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
