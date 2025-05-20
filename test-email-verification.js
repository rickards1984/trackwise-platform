// Test script to verify email verification flow
import fetch from 'node-fetch';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Base URL for testing
const API_URL = 'http://localhost:5000/api/v2';

// Step 1: Register a test user
async function registerTestUser() {
  console.log('Step 1: Registering test user...');
  
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: `testuser_${Date.now()}`,
        password: 'Password123!',
        email: `test_${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'User',
        role: 'learner',
      }),
    });

    const data = await response.json();
    console.log('Registration response:', data);
    
    if (response.ok) {
      return data.userId; // Return the user ID for verification check
    } else {
      console.error('Registration failed:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Error during registration:', error);
    return null;
  }
}

// Step 2: Get verification token from database (for testing purposes)
async function getVerificationToken(userId) {
  console.log(`Step 2: Getting verification token for user ${userId}...`);
  
  try {
    const response = await fetch(`${API_URL}/auth/test/get-verification-token/${userId}`, {
      method: 'GET',
    });

    const data = await response.json();
    console.log('Verification token response:', data);
    
    if (response.ok) {
      return data.token;
    } else {
      console.error('Failed to get verification token:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Error getting verification token:', error);
    return null;
  }
}

// Step 3: Verify the email using the token
async function verifyEmail(token) {
  console.log(`Step 3: Verifying email with token ${token}...`);
  
  try {
    // Direct browser to verification URL
    const verificationUrl = `http://localhost:5000/api/v2/auth/verify-email/${token}`;
    console.log(`Verification URL: ${verificationUrl}`);
    console.log('Please navigate to this URL in your browser to complete verification');
    
    return true;
  } catch (error) {
    console.error('Error during verification:', error);
    return false;
  }
}

// Step 4: Check user status after verification
async function checkUserStatus(userId) {
  console.log(`Step 4: Checking user status for user ${userId}...`);
  
  try {
    const response = await fetch(`${API_URL}/auth/test/user-status/${userId}`, {
      method: 'GET',
    });

    const data = await response.json();
    console.log('User status response:', data);
    
    if (response.ok) {
      return data.status;
    } else {
      console.error('Failed to check user status:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Error checking user status:', error);
    return null;
  }
}

// Run the test
async function runTest() {
  console.log('=== Email Verification Flow Test ===');
  
  // Step 1: Register a test user
  const userId = await registerTestUser();
  if (!userId) {
    console.log('Test failed: Unable to register user');
    return;
  }
  
  // Step 2: Get the verification token
  const token = await getVerificationToken(userId);
  if (!token) {
    console.log('Test failed: Unable to get verification token');
    return;
  }
  
  // Step 3: Verify the email
  const verificationSuccess = await verifyEmail(token);
  if (verificationSuccess) {
    console.log('\nPlease navigate to the verification URL to complete the test.');
  }
  
  // Step 4: Check the user status (this would need to be done after the user clicks the verification link)
  console.log('\nAfter verification, you can check the user status with:');
  console.log(`curl http://localhost:5000/api/v2/auth/test/user-status/${userId}`);
  
  console.log('\nTest complete. Follow these steps to complete the verification:');
  console.log('1. Navigate to the verification URL shown above');
  console.log('2. Confirm you are redirected to the verification success page');
  console.log('3. Check the user status using the curl command above - it should show "active"');
  console.log('4. Try logging in with your credentials\n');
}

runTest();