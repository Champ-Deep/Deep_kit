import { Router } from 'express';
import {
  getClients,
  createClient,
  deleteClient,
  getInvoices,
  getInvoiceById,
  createInvoice,
  getInvoiceItems,
  updateInvoiceStatus,
  deleteInvoice,
  getPayments,
  createPayment,
  getStats
} from '../services/database';

// Event Bus + Event Constants from fabric
const { Events } = require('deepkit-fabric');
import { eventBus } from '../index';

const router = Router();

// Clients
router.get('/clients', async (req, res) => {
  try {
    const clients = await getClients();
    res.json(clients);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/clients', async (req, res) => {
  try {
    const client = await createClient(req.body);
    res.status(201).json(client);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/clients/:id', async (req, res) => {
  try {
    const deleted = await deleteClient(parseInt(req.params.id, 10));
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Client not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Invoices
router.get('/invoices', async (req, res) => {
  try {
    const { status, client_id } = req.query;
    const invoices = await getInvoices(
      status as string | undefined,
      client_id ? parseInt(client_id as string, 10) : undefined
    );
    res.json(invoices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/invoices/:id', async (req, res) => {
  try {
    const invoice = await getInvoiceById(parseInt(req.params.id, 10));
    if (invoice) {
      res.json(invoice);
    } else {
      res.status(404).json({ error: 'Invoice not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/invoices/:id/items', async (req, res) => {
  try {
    const items = await getInvoiceItems(parseInt(req.params.id, 10));
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/invoices', async (req, res) => {
  try {
    const invoice = await createInvoice(req.body);

    // Publish INVOICE_CREATED event to the Arsenal
    const correlationId = req.headers['x-correlation-id'] as string;
    eventBus.publish(Events.INVOICE_CREATED, {
      invoiceId: invoice.id,
      clientId: invoice.client_id,
      total: invoice.total,
      status: invoice.status,
    }, correlationId).catch(() => {});

    res.status(201).json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/invoices/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const invoice = await updateInvoiceStatus(parseInt(req.params.id, 10), status);
    if (invoice) {
      // Publish event when invoice is marked as paid
      if (status === 'paid') {
        const correlationId = req.headers['x-correlation-id'] as string;
        eventBus.publish(Events.INVOICE_PAID, {
          invoiceId: invoice.id,
          clientId: invoice.client_id,
          total: invoice.total,
        }, correlationId).catch(() => {});
      }
      res.json(invoice);
    } else {
      res.status(404).json({ error: 'Invoice not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/invoices/:id', async (req, res) => {
  try {
    const deleted = await deleteInvoice(parseInt(req.params.id, 10));
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ error: 'Invoice not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Payments
router.get('/payments', async (req, res) => {
  try {
    const { invoice_id } = req.query;
    const payments = await getPayments(
      invoice_id ? parseInt(invoice_id as string, 10) : undefined
    );
    res.json(payments);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/payments', async (req, res) => {
  try {
    const payment = await createPayment(req.body);

    // Publish PAYMENT_RECEIVED event
    const correlationId = req.headers['x-correlation-id'] as string;
    eventBus.publish(Events.PAYMENT_RECEIVED, {
      paymentId: payment.id,
      invoiceId: payment.invoice_id,
      amount: payment.amount,
      method: payment.payment_method,
    }, correlationId).catch(() => {});

    res.status(201).json(payment);
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
