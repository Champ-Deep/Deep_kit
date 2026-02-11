import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { createUser, getUserByUsername, getUserByEmail } from '../services/database';
import { generateToken } from '../middleware/auth';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, full_name } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'username, email, and password are required',
      });
    }

    // Username validation (alphanumeric + underscore, 3-30 chars)
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({
        error: 'Invalid username',
        message: 'Username must be 3-30 characters (letters, numbers, underscore only)',
      });
    }

    // Email validation (basic)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address',
      });
    }

    // Password strength (min 6 chars for now)
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password must be at least 6 characters',
      });
    }

    // Check if username already exists
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({
        error: 'Username taken',
        message: 'This username is already registered',
      });
    }

    // Check if email already exists
    const existingEmail = await getUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({
        error: 'Email taken',
        message: 'This email is already registered',
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const user = await createUser({
      username,
      email,
      password_hash,
      full_name: full_name || null,
    });

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
    });

    // Return user (without password hash) and token
    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/auth/login
 * Login existing user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'username and password are required',
      });
    }

    // Find user
    const user = await getUserByUsername(username);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect',
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Username or password is incorrect',
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
    });

    // Return user (without password hash) and token
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        created_at: user.created_at,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get('/me', async (req: Request, res: Response) => {
  // Note: This route should be protected by requireAuth middleware when mounted
  if (!req.user) {
    return res.status(401).json({
      error: 'Not authenticated',
      message: 'Please login first',
    });
  }

  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
    },
  });
});

export default router;
