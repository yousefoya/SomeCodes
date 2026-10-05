import { Router } from 'express';
import {
  sendOtp,
  verifyOtp,
  register,
  login,
  refresh,
  logout,
  getMe,
  sendChangePhoneOtp,
  changePhoneNumber,
  deleteAccount,
} from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

// Public Authentication Endpoints (Guarded by authRateLimiter)
router.post('/send-otp', authRateLimiter, sendOtp);
router.post('/verify-otp', authRateLimiter, verifyOtp);
router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/refresh', refresh);

// Protected Authentication & Account Management Endpoints
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getMe);
router.post('/phone/send-otp', requireAuth, authRateLimiter, sendChangePhoneOtp);
router.patch('/phone', requireAuth, changePhoneNumber);
router.delete('/account', requireAuth, deleteAccount);

export const authRoutes = router;
