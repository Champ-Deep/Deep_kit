/**
 * send_email - Send emails via n8n workflow (SMTP)
 *
 * Triggers the send-email n8n workflow to send emails.
 * Requires SMTP credentials to be configured in n8n.
 */
const axios = require('axios');

module.exports = {
  definition: {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Send an email via n8n workflow automation. Use this when the user wants to send an email, compose a message, or contact someone via email.',
      parameters: {
        type: 'object',
        properties: {
          to: {
            type: 'string',
            description: 'Recipient email address'
          },
          subject: {
            type: 'string',
            description: 'Email subject line'
          },
          body: {
            type: 'string',
            description: 'Email body content (plain text)'
          },
          replyTo: {
            type: 'string',
            description: 'Optional reply-to email address'
          }
        },
        required: ['to', 'subject', 'body']
      }
    }
  },

  execute: async (args, context) => {
    const { to, subject, body, replyTo } = args;
    const n8nBaseURL = process.env.N8N_WEBHOOK_URL || 'http://deepkit-orchestrator:5678';

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return {
        success: false,
        error: `Invalid email address: ${to}`,
        type: 'note',
        data: {
          action: 'found',
          note: {
            id: 'error',
            title: 'Invalid Email',
            content: `The email address "${to}" is not valid. Please provide a valid email address.`
          }
        }
      };
    }

    try {
      const webhookUrl = `${n8nBaseURL}/webhook/send-email`;

      const response = await axios.post(webhookUrl, {
        to,
        subject,
        body,
        replyTo: replyTo || undefined
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data?.success) {
        return {
          success: true,
          type: 'note',
          data: {
            action: 'created',
            note: {
              id: `email-${Date.now()}`,
              title: 'Email Sent',
              content: `**To:** ${to}\n**Subject:** ${subject}\n\n${body.substring(0, 200)}${body.length > 200 ? '...' : ''}`,
              created_at: new Date().toISOString()
            }
          },
          message: `Email sent successfully to ${to}`,
          suggestions: [
            'Send another email',
            'Check my tasks',
            'What else can you help with?'
          ]
        };
      } else {
        throw new Error(response.data?.error || 'Email workflow returned unsuccessful');
      }

    } catch (error) {
      // Check if it's a connection error (n8n not running or workflow not active)
      let errorMessage = error.message;
      let helpText = '';

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        errorMessage = 'n8n automation service is not running';
        helpText = 'Start n8n with: docker compose up -d deepkit-orchestrator';
      } else if (error.response?.status === 404) {
        errorMessage = 'Email workflow not found in n8n';
        helpText = 'Import the send-email workflow from config/n8n-workflows/send-email.json';
      } else if (error.response?.status === 500) {
        errorMessage = 'Email sending failed - check SMTP configuration in n8n';
        helpText = 'Configure SMTP credentials in n8n: Settings → Credentials → SMTP';
      }

      return {
        success: false,
        error: errorMessage,
        type: 'note',
        data: {
          action: 'found',
          note: {
            id: 'error',
            title: 'Email Not Sent',
            content: `Failed to send email: ${errorMessage}\n\n${helpText ? `**Tip:** ${helpText}` : ''}`
          }
        },
        suggestions: [
          'Check n8n status',
          'List my services',
          'Help me configure email'
        ]
      };
    }
  }
};
