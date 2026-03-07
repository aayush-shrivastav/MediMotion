const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');
const Prescription = require('./models/Prescription');
const Session = require('./models/Session');

dotenv.config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Prescription.deleteMany({});
    await Session.deleteMany({});
    console.log('Cleared existing data');

    // Create users
    const hashedPassword = await bcrypt.hash('password123', 10);

    const doctor1 = await User.create({
      name: 'Dr. Sarah Chen',
      email: 'doctor@fitcred.com',
      password: hashedPassword,
      role: 'doctor'
    });

    const doctor2 = await User.create({
      name: 'Dr. Michael Roberts',
      email: 'doctor2@fitcred.com',
      password: hashedPassword,
      role: 'doctor'
    });

    const patient1 = await User.create({
      name: 'John Anderson',
      email: 'patient@fitcred.com',
      password: hashedPassword,
      role: 'patient',
      assignedDoctor: doctor1._id
    });

    const patient2 = await User.create({
      name: 'Emily Martinez',
      email: 'patient2@fitcred.com',
      password: hashedPassword,
      role: 'patient',
      assignedDoctor: doctor1._id
    });

    const patient3 = await User.create({
      name: 'David Kim',
      email: 'patient3@fitcred.com',
      password: hashedPassword,
      role: 'patient',
      assignedDoctor: doctor2._id
    });

    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@fitcred.com',
      password: hashedPassword,
      role: 'admin'
    });

    console.log('Created users');

    // Create prescriptions
    const startDate1 = new Date();
    startDate1.setDate(startDate1.getDate() - 21); // 3 weeks ago

    const prescription1 = await Prescription.create({
      doctorId: doctor1._id,
      patientId: patient1._id,
      condition: 'Type 2 Diabetes Management',
      plan: {
        exerciseType: 'Cardiovascular Exercise',
        weeklyGoal: 5,
        sessionDuration: 30,
        instructions: 'Moderate-intensity aerobic exercise for 30 minutes, 5 times per week.'
      },
      duration: 84,
      complianceThreshold: 80,
      startDate: startDate1,
      endDate: new Date(startDate1.getTime() + 84 * 24 * 60 * 60 * 1000),
      notes: 'Monitor blood glucose levels before and after exercise.',
      status: 'active'
    });

    const startDate2 = new Date();
    startDate2.setDate(startDate2.getDate() - 14); // 2 weeks ago

    const prescription2 = await Prescription.create({
      doctorId: doctor1._id,
      patientId: patient2._id,
      condition: 'Hypertension Management',
      plan: {
        exerciseType: 'Walking',
        weeklyGoal: 4,
        sessionDuration: 25,
        instructions: 'Brisk walking for 25 minutes, 4 times per week.'
      },
      duration: 56,
      complianceThreshold: 75,
      startDate: startDate2,
      endDate: new Date(startDate2.getTime() + 56 * 24 * 60 * 60 * 1000),
      notes: 'Check blood pressure weekly.',
      status: 'active'
    });

    const startDate3 = new Date();
    startDate3.setDate(startDate3.getDate() - 7); // 1 week ago

    const prescription3 = await Prescription.create({
      doctorId: doctor2._id,
      patientId: patient3._id,
      condition: 'Post-Cardiac Event Rehabilitation',
      plan: {
        exerciseType: 'Supervised Cardio',
        weeklyGoal: 3,
        sessionDuration: 20,
        instructions: 'Low-intensity supervised cardio, 20 minutes, 3 times per week.'
      },
      duration: 42,
      complianceThreshold: 90,
      startDate: startDate3,
      endDate: new Date(startDate3.getTime() + 42 * 24 * 60 * 60 * 1000),
      notes: 'Patient must not exceed 120 bpm during exercise.',
      status: 'active'
    });

    console.log('Created prescriptions');

    // Create sessions for patient1 (good compliance)
    const sessions1 = [];
    for (let i = 0; i < 14; i++) {
      const sessionDate = new Date(startDate1);
      sessionDate.setDate(sessionDate.getDate() + i * 1.5);
      
      sessions1.push({
        patientId: patient1._id,
        prescriptionId: prescription1._id,
        exerciseType: 'Cardiovascular Exercise',
        duration: 30,
        verified: true,
        confidence: 85 + Math.floor(Math.random() * 15),
        verificationSource: 'manual',
        timestamp: sessionDate
      });
    }
    await Session.insertMany(sessions1);

    // Create sessions for patient2 (poor compliance)
    const sessions2 = [];
    for (let i = 0; i < 4; i++) {
      const sessionDate = new Date(startDate2);
      sessionDate.setDate(sessionDate.getDate() + i * 3);
      
      sessions2.push({
        patientId: patient2._id,
        prescriptionId: prescription2._id,
        exerciseType: 'Walking',
        duration: 25,
        verified: true,
        confidence: 75 + Math.floor(Math.random() * 20),
        verificationSource: 'manual',
        timestamp: sessionDate
      });
    }
    await Session.insertMany(sessions2);

    // Create sessions for patient3 (excellent compliance)
    const sessions3 = [];
    for (let i = 0; i < 3; i++) {
      const sessionDate = new Date(startDate3);
      sessionDate.setDate(sessionDate.getDate() + i * 2);
      
      sessions3.push({
        patientId: patient3._id,
        prescriptionId: prescription3._id,
        exerciseType: 'Supervised Cardio',
        duration: 20,
        verified: true,
        confidence: 90 + Math.floor(Math.random() * 10),
        verificationSource: 'manual',
        timestamp: sessionDate
      });
    }
    await Session.insertMany(sessions3);

    console.log('Created sessions');

    console.log('\n=== SEED DATA CREATED ===\n');
    console.log('Login Credentials:');
    console.log('Doctor: doctor@fitcred.com / password123');
    console.log('Patient 1: patient@fitcred.com / password123 (Good compliance)');
    console.log('Patient 2: patient2@fitcred.com / password123 (Poor compliance)');
    console.log('Patient 3: patient3@fitcred.com / password123 (Excellent compliance)');
    console.log('Admin: admin@fitcred.com / password123');
    console.log('\n========================\n');

    await mongoose.connection.close();
    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
