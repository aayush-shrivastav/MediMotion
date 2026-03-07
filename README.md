# MediPal Medical Compliance PWA

A hospital-grade Progressive Web App for tracking prescribed exercise compliance, with role-based dashboards for doctors and patients and AI-assisted session verification.

## Features

### Patient Features

- View active prescriptions and session history
- Start and complete exercise sessions (curl, press, squat, walking)
- Real-time AI form analysis with feedback
- Compliance stats and streaks
- Face-based verification for enrollment and walking sessions
- Notifications for reminders and warnings

### Doctor Features

- Patient dashboard with compliance overview
- Create exercise and walking prescriptions
- Review session analysis and PT review deltas
- Record treatment decisions
- Monitor patient progress and session history

## Tech Stack

**Frontend:**

- React 18
- Vite
- React Router
- Tailwind CSS (v4)
- Recharts
- PWA (Service Worker + Manifest)

**Backend:**

- Node.js
- Express.js
- MongoDB + Mongoose
- JWT Authentication
- RESTful API
- Optional Face Verification Service (FastAPI)

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB (v5+)
- npm or yarn

### Installation

1. **Install Backend Dependencies**

```bash
cd backend
npm install
```

2. **Install Frontend Dependencies**

```bash
cd frontend
npm install
```

3. **Configure Environment**

Backend `.env`:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fitcred
JWT_SECRET=your_secret_key
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
FACE_SERVICE_URL=http://localhost:8001
```

If you use a different backend port, update the API base in `frontend/src/utils/api.js`.

4. **Start MongoDB**

```bash
mongod
```

5. **Seed Database (Optional)**

```bash
cd backend
node seed.js
```

6. **Start Backend Server**

```bash
cd backend
npm run dev
```

7. **Start Frontend**

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173`.

8. **Face Verification Service (Optional)**

Provide a FastAPI service endpoint via `FACE_SERVICE_URL`. The backend uses it for `/face/register` and `/face/verify`. Raw images are not persisted.

## Demo Credentials

After seeding the database:

**Doctor:**

- Email: `doctor@fitcred.com`
- Password: `password123`

**Patient (Good Compliance):**

- Email: `patient@fitcred.com`
- Password: `password123`

**Patient (Poor Compliance):**

- Email: `patient2@fitcred.com`
- Password: `password123`

## Project Structure

```
HACKTU-MediPal/
├── backend/
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API endpoints
│   ├── services/        # Integrations (face service)
│   ├── middleware/      # Auth middleware
│   ├── server.js        # Express app
│   └── seed.js          # Demo data
├── frontend/
│   ├── src/
│   │   ├── ai/          # Pose detection + rep counting
│   │   ├── components/  # Reusable components
│   │   ├── context/     # React Context (Auth)
│   │   ├── pages/       # Route pages
│   │   │   ├── patient/ # Patient views
│   │   │   └── doctor/  # Doctor views
│   │   ├── utils/       # API client
│   │   ├── App.jsx      # Main app + routing
│   │   └── main.jsx     # Entry point
│   ├── index.html
│   └── vite.config.js
└── README.md
```

## API Endpoints

### Health

- `GET /health` - Service status

### Authentication

- `POST /auth/signup` - Create user with biometric registration (requires `faceImage`)
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

### Users

- `GET /users/:id` - Get user by ID
- `GET /users?role=patient` - Get users by role
- `POST /users` - Create user (Admin only)

### Prescriptions

- `POST /prescriptions` - Create prescription
- `GET /prescriptions/:id` - Get prescription
- `GET /prescriptions?patientId=` - List prescriptions

### Sessions

- `POST /sessions/start` - Start session (curl, press, squat)
- `POST /sessions/complete` - Complete session with form analysis or walking verification
- `GET /sessions?patientId=` - List sessions
- `GET /sessions/:id` - Get session
- `GET /sessions/:id/analysis` - Doctor/patient analysis view
- `POST /sessions/:id/review` - Doctor PT review

### Workouts (AI)

- `POST /api/workouts/verify` - Submit AI-verified workout results
- `GET /api/workouts/stats?prescriptionId=` - Workout stats

### Face Verification

- `POST /face/register` - Register or refresh face embedding
- `POST /face/verify` - On-demand verification

### Compliance

- `GET /compliance/patient/:id` - Get patient compliance
- `GET /compliance/summary/:doctorId` - Doctor summary

### Decisions

- `POST /decisions` - Record decision
- `GET /decisions?patientId=` - List decisions

### Notifications

- `POST /notifications/schedule` - Schedule notification
- `GET /notifications?userId=` - Get notifications

## AI and Verification

- Pose detection, rep counting, and form analysis live in `frontend/src/ai`.
- Session completion supports both pose-based and walking verification flows.
- Face verification uses an external service configured by `FACE_SERVICE_URL`.

## Development

**Backend Dev Mode:**

```bash
cd backend
npm run dev
```

**Frontend Dev Mode:**

```bash
cd frontend
npm run dev
```

**Build for Production:**

```bash
cd frontend
npm run build
```

## Security

- JWT-based authentication
- Role-based access control
- Password hashing with bcrypt
- Input validation

## License

Proprietary - Medical Software

## Support

For issues or questions, contact the development team.
