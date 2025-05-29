import express from 'express';

const router = express.Router();

// Quick login endpoint that doesn't require database authentication
router.post('/dev-login', (req, res) => {
  const { role = 'learner' } = req.body;
  
  // Create a mock user for the session
  req.session.userId = 1;
  req.session.role = role;
  
  // Send back user data for the client
  res.status(200).json({ 
    message: 'Development login successful',
    user: {
      id: 1,
      username: role,
      firstName: 'Development',
      lastName: 'User',
      email: `${role}@example.com`,
      role: role,
      status: 'active',
      avatarUrl: null
    }
  });
});

export default router;