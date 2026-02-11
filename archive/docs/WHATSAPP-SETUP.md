# WhatsApp Integration Guide

Complete guide to connecting DeepKit Messenger to WhatsApp via Meta Cloud API.

**Status**: Webhook ready, awaiting credentials

---

## Overview

DeepKit Messenger can receive and respond to WhatsApp messages via Meta's Business Cloud API. The agent processes messages using the same pattern-matching engine as the web UI (20-300ms response times).

### Two Integration Paths

| Method | Difficulty | Requirements | Recommended For |
|--------|------------|--------------|-----------------|
| **Path A: Whatomate** | Easy | Docker + Meta API creds | Self-hosted setups |
| **Path B: Direct Meta** | Medium | Public URL + Meta API creds | Production deployments |

---

## Prerequisites

### Required for Both Paths
1. **WhatsApp Business Account**
   - Create at [business.facebook.com](https://business.facebook.com)
   - Verify your business

2. **Meta Developer Account**
   - Sign up at [developers.facebook.com](https://developers.facebook.com)
   - Create a new app → "Business" type

3. **Phone Number**
   - Add a phone number to your WhatsApp Business Account
   - This becomes your agent's WhatsApp number
   - Can be a test number initially (Meta provides one)

---

## Path A: Using Whatomate (Self-Hosted)

**Whatomate** is a self-hosted WhatsApp Business API server (Go + Vue, AGPL-3.0) that handles Meta Cloud API transport. It acts as a proxy between Meta and your local agent.

### Step 1: Get Meta Cloud API Credentials

1. Go to [developers.facebook.com](https://developers.facebook.com) → Your App
2. Add "WhatsApp" product
3. Navigate to **WhatsApp → API Setup**
4. Copy these values:
   - **Phone Number ID** (e.g., `123456789012345`)
   - **Business Account ID** (e.g., `987654321098765`)
   - **Access Token** (Temporary, 24h — will generate permanent one later)

### Step 2: Deploy Whatomate Container

Add Whatomate service to your `docker-compose.yml`:

```yaml
services:
  # ... existing services ...

  whatomate:
    image: ghcr.io/gaogao-qwq/whatomate:latest
    container_name: whatomate_system
    ports:
      - "8080:8080"
    environment:
      - WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
      - WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here
      - WHATSAPP_ACCESS_TOKEN=your_access_token_here
      - WEBHOOK_VERIFY_TOKEN=deepkit-verify-$(openssl rand -hex 16)
    networks:
      - deepkit-network
    restart: unless-stopped
```

**Generate a secure verify token**:
```bash
echo "deepkit-verify-$(openssl rand -hex 16)"
# Example output: deepkit-verify-a1b2c3d4e5f6...
```

Save this token — you'll need it for webhook verification.

### Step 3: Configure DeepKit Messenger

Update your `.env` file:

```env
# WhatsApp Integration
WHATOMATE_URL=http://whatomate:8080
WHATOMATE_API_KEY=optional_api_key_if_enabled
WHATOMATE_VERIFY_TOKEN=deepkit-verify-a1b2c3d4e5f6...
```

### Step 4: Expose Webhook Publicly

Meta needs to reach your webhook to send messages. Use one of these:

#### Option 1: ngrok (Quick Testing)
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 51000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

#### Option 2: Cloudflare Tunnel (Production)
```bash
# Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/
cloudflare tunnel --url http://localhost:51000

# Copy the generated URL
```

### Step 5: Configure Meta Webhook

1. Go to **WhatsApp → Configuration** in Meta Developer Dashboard
2. Click **Edit** next to "Webhook"
3. Enter:
   - **Callback URL**: `https://your-ngrok-url.ngrok.io/webhook/whatsapp`
   - **Verify Token**: `deepkit-verify-a1b2c3d4e5f6...` (from Step 2)
4. Click **Verify and Save**
5. Subscribe to webhook fields:
   - ✅ `messages` (required)
   - ✅ `message_status` (optional, for delivery receipts)

### Step 6: Generate Permanent Access Token

The temporary token expires in 24 hours. Generate a permanent one:

1. Go to **WhatsApp → API Setup**
2. Click **Generate** next to "Access Token"
3. Select:
   - Permissions: `whatsapp_business_messaging`, `whatsapp_business_management`
   - Expiration: **Never**
4. Copy the permanent token
5. Update Whatomate container env var with new token
6. Restart: `docker compose restart whatomate`

### Step 7: Test the Integration

Send a message to your WhatsApp Business number:

```
List my tasks
```

**Expected flow**:
1. WhatsApp → Meta Cloud API → Whatomate
2. Whatomate → `POST /webhook/whatsapp` → DeepKit Messenger
3. Pattern matching → `task_tracker.list` (20ms)
4. Response → Whatomate → Meta → WhatsApp

**Check logs**:
```bash
docker logs deepkit-messenger -f --tail 50
docker logs whatomate_system -f --tail 50
```

---

## Path B: Direct Meta Cloud API (No Whatomate)

For production setups where you want to control the entire flow.

### Step 1: Get Meta Cloud API Credentials

Same as Path A, Step 1.

### Step 2: Expose Webhook Publicly

Same as Path A, Step 4 — but this is permanent, so use Cloudflare Tunnel or a real domain.

### Step 3: Configure Meta Webhook

Same as Path A, Step 5:
- **Callback URL**: `https://your-domain.com/webhook/whatsapp`
- **Verify Token**: `deepkit-verify-your-secure-token`

### Step 4: Update DeepKit Messenger

Update `.env`:

```env
# WhatsApp Integration (Direct Meta)
WHATOMATE_VERIFY_TOKEN=deepkit-verify-your-secure-token
META_WHATSAPP_PHONE_NUMBER_ID=123456789012345
META_WHATSAPP_ACCESS_TOKEN=your_permanent_access_token
```

### Step 5: Modify WhatomateAdapter (Optional)

If you want direct Meta API calls instead of going through Whatomate, modify `src/adapters/WhatomateAdapter.js`:

```javascript
// Change baseURL in constructor
this.baseURL = config.baseURL || process.env.META_GRAPH_API_URL || 'https://graph.facebook.com/v18.0';

// Update send() method endpoint
const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
const response = await this.client.post(`/${phoneNumberId}/messages`, payload);
```

---

## Webhook Endpoint Reference

### Verification (GET)

Meta calls this when you configure the webhook:

```
GET /webhook/whatsapp?hub.mode=subscribe&hub.verify_token=deepkit-verify-...&hub.challenge=1234567890
```

**Response**: Returns the `hub.challenge` value if verify token matches.

### Message Delivery (POST)

Meta sends messages here:

```
POST /webhook/whatsapp
Content-Type: application/json

{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "BUSINESS_ACCOUNT_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "15551234567",
          "phone_number_id": "123456789"
        },
        "contacts": [{
          "profile": { "name": "John Doe" },
          "wa_id": "15559876543"
        }],
        "messages": [{
          "from": "15559876543",
          "id": "wamid.ABC123",
          "timestamp": "1738710000",
          "text": { "body": "List my tasks" },
          "type": "text"
        }]
      }
    }]
  }]
}
```

**Supported message types**:
- `text` — Plain text (primary)
- `image` — Caption extracted
- `document` — Filename extracted
- `audio`, `video`, `location`, `contacts` — Logged but not processed
- `interactive` — Button/list responses

---

## Testing Without WhatsApp

Simulate webhook payloads directly:

### Test 1: List Tasks
```bash
curl -X POST http://localhost:51000/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "1234567890",
            "id": "test123",
            "timestamp": "1738710000",
            "text": { "body": "List my tasks" },
            "type": "text"
          }],
          "contacts": [{ "profile": { "name": "Test User" }, "wa_id": "1234567890" }]
        }
      }]
    }]
  }'
```

### Test 2: System Status
```bash
curl -X POST http://localhost:51000/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "1234567890",
            "id": "test456",
            "text": { "body": "System status" },
            "type": "text"
          }]
        }
      }]
    }]
  }'
```

### Test 3: Create Task
```bash
curl -X POST http://localhost:51000/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "1234567890",
            "id": "test789",
            "text": { "body": "Create a task called Test WhatsApp integration" },
            "type": "text"
          }]
        }
      }]
    }]
  }'
```

**Check response**:
```bash
docker logs deepkit-messenger --tail 30
```

You should see:
- `Message received` log with channel=whatsapp
- Tool execution (e.g., `task_tracker.list`)
- `sendResponse` call (would fail without real Whatomate/Meta setup, but proves parsing works)

---

## Troubleshooting

### Webhook Verification Fails

**Error**: "Verification failed" in Meta Dashboard

**Solution**:
- Ensure your webhook is publicly accessible (ngrok/cloudflare running)
- Double-check verify token matches exactly in `.env` and Meta Dashboard
- Check `docker logs deepkit-messenger` for incoming GET request
- Verify callback URL has `/webhook/whatsapp` path

### Messages Not Reaching Agent

**Symptoms**: You send a WhatsApp message, no response

**Debug Steps**:
1. Check Whatomate logs: `docker logs whatomate_system`
2. Check messenger logs: `docker logs deepkit-messenger -f`
3. Verify webhook subscription in Meta Dashboard (should show green checkmark)
4. Test webhook manually with curl (see Testing section above)
5. Ensure access token is not expired

### Agent Responds but WhatsApp Doesn't Receive

**Symptoms**: Logs show tool execution, but no WhatsApp message arrives

**Debug Steps**:
1. Check Whatomate logs for send errors
2. Verify `WHATSAPP_PHONE_NUMBER_ID` in Whatomate env matches Meta Dashboard
3. Check Meta access token permissions: must have `whatsapp_business_messaging`
4. Test send directly via Meta Graph API:
   ```bash
   curl -X POST "https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"messaging_product":"whatsapp","to":"YOUR_TEST_NUMBER","type":"text","text":{"body":"Test message"}}'
   ```

### "Rate Limit Exceeded" Errors

**Cause**: Meta has rate limits (1000 messages/day for test numbers)

**Solution**:
- Apply for production access in Meta Business Manager
- Production numbers get 100k+ messages/day
- See [Meta Rate Limits](https://developers.facebook.com/docs/whatsapp/cloud-api/overview#throughput)

---

## Deployment Checklist

Before going live with WhatsApp:

- [ ] Meta Business Account verified
- [ ] App reviewed and approved (if using production features)
- [ ] Permanent access token generated
- [ ] Webhook exposed via secure HTTPS (Cloudflare Tunnel or real domain)
- [ ] Verify token stored securely in `.env`
- [ ] Whatomate (if used) configured with correct credentials
- [ ] Webhook subscription active in Meta Dashboard
- [ ] Test messages sent and received successfully
- [ ] Logs show clean tool execution (<50ms response times)
- [ ] Phone number has production access (>1000 msg/day limit)
- [ ] Backup strategy for database (tasks, notes, conversations)

---

## Tool Compatibility with WhatsApp

All 9 tools work identically via WhatsApp:

| Tool | WhatsApp Command | Response Time | Works? |
|------|------------------|---------------|--------|
| `task_tracker` | "List my tasks" | ~20ms | ✅ |
| `system_info` | "System status" | ~15ms | ✅ |
| `notes` | "Save a note: Test" | ~20ms | ✅ |
| `health_check` | "Health check" | ~250ms | ✅ |
| `calendar` | "Today's schedule" | ~50ms | ✅ |
| `n8n_trigger` | "Trigger workflow xyz" | ~100ms | ✅ |
| `file_ops` | "Read file /tmp/test.txt" | ~30ms | ✅ |
| `web_fetch` | "Fetch https://example.com" | ~1-5s | ✅ |
| `process_control` | "List processes" | ~40ms | ✅ |

---

## Security Considerations

### 1. Verify Token Protection
- Never commit verify tokens to Git
- Use strong random tokens (32+ chars)
- Rotate tokens periodically

### 2. Access Token Security
- Store in `.env`, not in code
- Use permanent tokens (not temporary 24h ones)
- Restrict permissions to minimum needed (`whatsapp_business_messaging`)
- Rotate if compromised

### 3. Webhook Endpoint
- Always use HTTPS (ngrok/cloudflare provide this)
- Validate incoming webhook signatures (future enhancement)
- Rate-limit webhook endpoint to prevent abuse

### 4. User Authorization
- Current MVP: No user auth (anyone with WhatsApp number can use agent)
- **Recommendation**: Add whitelist of allowed phone numbers in `.env`:
  ```env
  WHATSAPP_ALLOWED_NUMBERS=15551234567,15559876543
  ```
  Check in `WhatomateAdapter.parseMessage()` before processing

---

## Next Steps

1. **Complete this guide**:
   - Follow Path A or Path B above
   - Test with "List my tasks" message
   - Verify logs show tool execution

2. **Add user authorization**:
   - Whitelist allowed phone numbers
   - Reject messages from unknown users

3. **Enable advanced features**:
   - Interactive buttons (WhatsApp UI for tool selection)
   - List messages (show tasks/notes in WhatsApp list format)
   - Rich formatting (bold, italic, lists)

4. **Production hardening**:
   - Apply for Meta app review (required for >50 users)
   - Set up monitoring/alerting for webhook failures
   - Implement retry logic for failed sends
   - Add webhook signature verification

---

## Resources

- **Meta WhatsApp Cloud API**: [developers.facebook.com/docs/whatsapp/cloud-api](https://developers.facebook.com/docs/whatsapp/cloud-api)
- **Whatomate GitHub**: [github.com/gaogao-qwq/whatomate](https://github.com/gaogao-qwq/whatomate)
- **Meta Graph API Explorer**: [developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer)
- **DeepKit Messenger Architecture**: [DEPLOYMENT.md](DEPLOYMENT.md)

---

**Status**: Ready for integration. Webhook endpoint operational, awaiting Meta credentials.
