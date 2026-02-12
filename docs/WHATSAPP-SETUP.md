# WhatsApp Integration Setup Guide

## Overview

DeepKit v0.5 includes WhatsApp integration through the **Gateway** service, using **n8n** as the bridge to WhatsApp Business API or Evolution API.

## Architecture

```
WhatsApp User → WhatsApp Business API → n8n → Gateway → Core API
                                    ↓
                              Response back to WhatsApp
```

## Prerequisites

1. **WhatsApp Business Account**
2. **Evolution API** or **WhatsApp Business API** access
3. **n8n** instance (already included in DeepKit)

## Setup Options

### Option 1: Evolution API (Recommended for local deployment)

Evolution API provides a self-hosted WhatsApp integration using WhatsApp Web.

#### Step 1: Deploy Evolution API

```bash
# Add to your docker-compose or deploy separately
docker run -d \
  --name evolution-api \
  --network deepkit-network \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=your-api-key \
  atendai/evolution-api:latest
```

#### Step 2: Configure Evolution API Webhook

1. Open Evolution API: http://localhost:8080
2. Create an instance and scan QR code with your phone
3. Configure webhook to send to n8n:
   - URL: `http://n8n:5678/webhook/whatsapp-inbound`
   - Events: `messages.upsert`

#### Step 3: Import n8n Workflow

1. Open n8n: http://localhost:5678
2. Go to **Workflows** → **Import from File**
3. Select: `config/n8n-workflows/whatsapp-integration.json`
4. Activate the workflow

#### Step 4: Configure Gateway

Add to your `.env`:

```env
N8N_WEBHOOK_URL=http://n8n:5678/webhook/whatsapp-outbound
```

### Option 2: WhatsApp Business API (Production)

Use this for production deployments with Meta's official API.

#### Step 1: Create WhatsApp Business Account

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create an app with WhatsApp Product
3. Add a phone number and verify it

#### Step 2: Get API Credentials

```
Phone Number ID: your-phone-number-id
Access Token: your-access-token
```

#### Step 3: Configure n8n WhatsApp Node

1. Open n8n: http://localhost:5678
2. Create credentials for WhatsApp Business API:
   - **Access Token**: Your access token
   - **Phone Number ID**: Your phone number ID
3. Create workflow with WhatsApp trigger and HTTP request nodes

#### Step 4: Configure Webhook

In your WhatsApp Business App settings:
- **Webhook URL**: `https://your-domain.com/webhook/whatsapp`
- **Verify Token**: Use `DEEPKIT_INTERNAL_TOKEN` from your `.env`

## Testing

### Test via Direct API

```bash
# Test Gateway webhook
curl -X POST http://localhost:3333/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "from": "1234567890",
    "body": "Hello DeepKit!",
    "profileName": "Test User"
  }'
```

### Test via n8n

1. In n8n, use the "Execute Workflow" feature
2. Send test payload to Gateway
3. Verify response in WhatsApp

## Troubleshooting

### Messages not received

1. Check Gateway logs:
   ```bash
   docker logs deepkit-gateway
   ```

2. Verify n8n webhook is active:
   ```bash
   curl http://localhost:5678/webhook/whatsapp-inbound
   ```

3. Check Evolution API connection:
   ```bash
   curl http://localhost:8080/
   ```

### Messages not sent

1. Verify `N8N_WEBHOOK_URL` in `.env`
2. Check n8n workflow is active
3. Verify WhatsApp instance is connected (Evolution API) or phone number is approved (Business API)

## Cross-Channel Session Example

User experience across channels:

**On WhatsApp:**
```
User: Create task: Buy groceries
DeepKit: ✅ Created task #45: Buy groceries
```

**On Telegram:**
```
User: Show my tasks
DeepKit: Here are your tasks:
        • #45 Buy groceries (pending)
```

**On Web:**
```
User: Mark task 45 as done
DeepKit: ✅ Task #45 marked as completed
```

All channels share the same session and context!

## Security Considerations

1. **Verify webhooks**: Always verify incoming webhook signatures
2. **Rate limiting**: Gateway has built-in rate limiting
3. **Authentication**: Use `DEEPKIT_INTERNAL_TOKEN` for service-to-service auth
4. **Data privacy**: WhatsApp messages are processed locally (OpenCode + Ollama)

## Next Steps

- [ ] Test multi-channel session persistence
- [ ] Set up webhook verification
- [ ] Configure backup WhatsApp number
- [ ] Add WhatsApp-specific commands (e.g., /menu, /status)

## References

- [Evolution API Docs](https://doc.evolution-api.com/)
- [WhatsApp Business API](https://business.whatsapp.com/products/business-platform)
- [n8n WhatsApp Node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.whatsApp/)
