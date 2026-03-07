const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hacktu-medipal.onrender.com';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config = {
      ...options,
      headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async signup(payload) {
    const data = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(data.token);
    return data;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.setToken(null);
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // Users
  async getUser(id) {
    return this.request(`/users/${id}`);
  }

  async getUsers(role, params = {}) {
    const searchParams = new URLSearchParams();
    if (role) {
      searchParams.append('role', role);
    }
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value);
      }
    });
    const query = searchParams.toString();
    return this.request(`/users${query ? `?${query}` : ''}`);
  }

  // Prescriptions
  async createPrescription(data) {
    return this.request('/prescriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPrescription(id) {
    return this.request(`/prescriptions/${id}`);
  }

  async getPrescriptions(patientId) {
    const query = patientId ? `?patientId=${patientId}` : '';
    return this.request(`/prescriptions${query}`);
  }

  // Sessions
  async startSession(prescriptionId, exerciseType) {
    return this.request('/sessions/start', {
      method: 'POST',
      body: JSON.stringify({ prescriptionId, exerciseType }),
    });
  }

  async completeSession(data) {
    return this.request('/sessions/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSessions(patientId) {
    const query = patientId ? `?patientId=${patientId}` : '';
    return this.request(`/sessions${query}`);
  }

  async getSession(sessionId) {
    return this.request(`/sessions/${sessionId}`);
  }

  async getSessionAnalysis(sessionId) {
    return this.request(`/sessions/${sessionId}/analysis`);
  }

  async submitPTReview(sessionId, ptScore, notes) {
    return this.request(`/sessions/${sessionId}/review`, {
      method: 'POST',
      body: JSON.stringify({ ptScore, notes }),
    });
  }

  // Compliance
  async getPatientCompliance(patientId) {
    return this.request(`/compliance/patient/${patientId}`);
  }

  async getDoctorComplianceSummary(doctorId) {
    return this.request(`/compliance/summary/${doctorId}`);
  }

  // Decisions
  async createDecision(data) {
    return this.request('/decisions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDecisions(patientId) {
    const query = patientId ? `?patientId=${patientId}` : '';
    return this.request(`/decisions${query}`);
  }

  // Notifications
  async getNotifications(userId) {
    const query = userId ? `?userId=${userId}` : '';
    return this.request(`/notifications${query}`);
  }

  async markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  // Workouts (AI Verification)
  async verifyWorkout(data) {
    return this.request('/api/workouts/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getWorkoutStats(prescriptionId) {
    const query = prescriptionId ? `?prescriptionId=${prescriptionId}` : '';
    return this.request(`/api/workouts/stats${query}`);
  }

  // Face Verification
  async verifyFace(image) {
    return this.request('/face/verify', {
      method: 'POST',
      body: JSON.stringify({ image }),
    });
  }

  async registerFace(image, userId) {
    return this.request('/face/register', {
      method: 'POST',
      body: JSON.stringify({ image, userId }),
    });
  }
}

export default new ApiClient();
