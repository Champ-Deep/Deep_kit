import { Router } from 'express';
import {
  getVaults,
  createVault,
  deleteVault,
  getPasswords,
  getPasswordById,
  getPasswordDecrypted,
  createPassword,
  updatePassword,
  deletePassword,
  getStats,
  generatePassword
} from '../services/database';

const router = Router();

// Vaults
router.get('/vaults', async (req, res) => {
  try {
    const vaults = await getVaults();
    res.json(vaults);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/vaults', async (req, res) => {
  try {
    const vault = await createVault(req.body);
    res.status(201).json(vault);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/vaults/:id', async (req, res) => {
  try {
    const deleted = await deleteVault(parseInt(req.params.id, 10));
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Vault not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Passwords
router.get('/passwords', async (req, res) => {
  try {
    const { vault_id, search } = req.query;
    const passwords = await getPasswords(
      vault_id ? parseInt(vault_id as string, 10) : undefined,
      search as string | undefined
    );
    res.json(passwords);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/passwords/:id', async (req, res) => {
  try {
    const password = await getPasswordById(parseInt(req.params.id, 10));
    if (password) {
      res.json(password);
    } else {
      res.status(404).json({ error: 'Password not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/passwords/:id/decrypt', async (req, res) => {
  try {
    const password = await getPasswordDecrypted(parseInt(req.params.id, 10));
    if (password) {
      res.json(password);
    } else {
      res.status(404).json({ error: 'Password not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/passwords', async (req, res) => {
  try {
    const password = await createPassword(req.body);
    res.status(201).json(password);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/passwords/:id', async (req, res) => {
  try {
    const password = await updatePassword(parseInt(req.params.id, 10), req.body);
    if (password) {
      res.json(password);
    } else {
      res.status(404).json({ error: 'Password not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/passwords/:id', async (req, res) => {
  try {
    const deleted = await deletePassword(parseInt(req.params.id, 10));
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Password not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Password generator
router.post('/generate', (req, res) => {
  try {
    const { length, options } = req.body;
    const password = generatePassword(length, options);
    res.json({ password });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
