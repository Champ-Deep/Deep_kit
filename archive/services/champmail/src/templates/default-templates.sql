-- Default Email Templates for ChampMail
-- These templates will be created on first run

INSERT INTO email_templates (name, subject, html, variables) VALUES
(
  'welcome_email',
  'Welcome to {{company}}!',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #39FF14; color: #000; padding: 20px; text-align: center; }
    .content { padding: 30px 20px; }
    .button { display: inline-block; background: #39FF14; color: #000; padding: 12px 30px; text-decoration: none; margin: 20px 0; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome!</h1>
    </div>
    <div class="content">
      <h2>Hi {{name}},</h2>
      <p>Welcome to <strong>{{company}}</strong>! We''re excited to have you on board.</p>
      <p>Your account has been successfully created. You can now access all our features and start exploring.</p>
      <a href="{{login_url}}" class="button">Get Started</a>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      <p>Best regards,<br>The {{company}} Team</p>
    </div>
    <div class="footer">
      <p>© 2025 {{company}}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  '["name", "company", "login_url"]'::jsonb
),
(
  'lead_outreach',
  'Discover how {{company}} can help {{prospect_company}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #39FF14; color: #000; padding: 20px; }
    .content { padding: 30px 20px; }
    .highlight { background: #f4f4f4; border-left: 4px solid #39FF14; padding: 15px; margin: 20px 0; }
    .cta { display: inline-block; background: #39FF14; color: #000; padding: 12px 30px; text-decoration: none; margin: 20px 0; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>{{company}}</h2>
    </div>
    <div class="content">
      <p>Hi {{name}},</p>
      <p>I hope this email finds you well! I noticed that {{prospect_company}} is in the {{industry}} industry, and I thought you might be interested in learning how {{company}} can help streamline your {{pain_point}}.</p>
      <div class="highlight">
        <strong>Quick wins you could see:</strong>
        <ul>
          <li>{{benefit_1}}</li>
          <li>{{benefit_2}}</li>
          <li>{{benefit_3}}</li>
        </ul>
      </div>
      <p>Would you be open to a quick 15-minute call next week to explore this further?</p>
      <a href="{{calendar_link}}" class="cta">Schedule a Call</a>
      <p>Looking forward to connecting!</p>
      <p>Best regards,<br>{{sender_name}}<br>{{sender_title}}<br>{{company}}</p>
    </div>
  </div>
</body>
</html>',
  '["name", "prospect_company", "company", "industry", "pain_point", "benefit_1", "benefit_2", "benefit_3", "calendar_link", "sender_name", "sender_title"]'::jsonb
),
(
  'interview_invitation',
  'Interview Invitation: {{position}} at {{company}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #39FF14; color: #000; padding: 20px; text-align: center; }
    .content { padding: 30px 20px; }
    .details { background: #f9f9f9; border: 1px solid #ddd; padding: 20px; margin: 20px 0; }
    .button { display: inline-block; background: #39FF14; color: #000; padding: 12px 30px; text-decoration: none; margin: 20px 0; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Interview Invitation</h1>
    </div>
    <div class="content">
      <p>Dear {{candidate_name}},</p>
      <p>Thank you for your interest in the <strong>{{position}}</strong> role at {{company}}. We were impressed by your background and would like to invite you for an interview.</p>
      <div class="details">
        <h3>Interview Details:</h3>
        <p><strong>Date:</strong> {{interview_date}}</p>
        <p><strong>Time:</strong> {{interview_time}}</p>
        <p><strong>Duration:</strong> {{duration}}</p>
        <p><strong>Format:</strong> {{format}}</p>
        <p><strong>Interviewer:</strong> {{interviewer_name}}, {{interviewer_title}}</p>
      </div>
      <p>Please confirm your availability by clicking the button below:</p>
      <a href="{{confirmation_link}}" class="button">Confirm Attendance</a>
      <p>We look forward to meeting you!</p>
      <p>Best regards,<br>{{hr_name}}<br>Human Resources<br>{{company}}</p>
    </div>
  </div>
</body>
</html>',
  '["candidate_name", "position", "company", "interview_date", "interview_time", "duration", "format", "interviewer_name", "interviewer_title", "confirmation_link", "hr_name"]'::jsonb
),
(
  'meeting_reminder',
  'Reminder: Meeting with {{company}} - {{date}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #FFB000; color: #000; padding: 20px; text-align: center; }
    .content { padding: 30px 20px; }
    .meeting-box { background: #fff; border: 2px solid #FFB000; padding: 20px; margin: 20px 0; }
    .button { display: inline-block; background: #FFB000; color: #000; padding: 12px 30px; text-decoration: none; margin: 10px 5px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>⏰ Meeting Reminder</h2>
    </div>
    <div class="content">
      <p>Hi {{name}},</p>
      <p>This is a friendly reminder about your upcoming meeting:</p>
      <div class="meeting-box">
        <h3>{{meeting_title}}</h3>
        <p><strong>Date:</strong> {{date}}</p>
        <p><strong>Time:</strong> {{time}}</p>
        <p><strong>Duration:</strong> {{duration}}</p>
        <p><strong>Location:</strong> {{location}}</p>
        {{#if agenda}}
        <p><strong>Agenda:</strong></p>
        <p>{{agenda}}</p>
        {{/if}}
      </div>
      <div style="text-align: center;">
        <a href="{{meeting_link}}" class="button">Join Meeting</a>
        <a href="{{calendar_link}}" class="button">Add to Calendar</a>
      </div>
      <p>See you there!</p>
      <p>Best regards,<br>{{company}}</p>
    </div>
  </div>
</body>
</html>',
  '["name", "meeting_title", "date", "time", "duration", "location", "agenda", "meeting_link", "calendar_link", "company"]'::jsonb
),
(
  'invoice_notification',
  'Invoice #{{invoice_number}} from {{company}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #39FF14; color: #000; padding: 20px; text-align: center; }
    .content { padding: 30px 20px; }
    .invoice-box { background: #f9f9f9; border: 1px solid #ddd; padding: 20px; margin: 20px 0; }
    .amount { font-size: 32px; color: #39FF14; font-weight: bold; text-align: center; margin: 20px 0; }
    .button { display: inline-block; background: #39FF14; color: #000; padding: 12px 30px; text-decoration: none; margin: 20px 0; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Invoice</h1>
    </div>
    <div class="content">
      <p>Dear {{client_name}},</p>
      <p>Thank you for your business! Please find your invoice details below:</p>
      <div class="invoice-box">
        <p><strong>Invoice Number:</strong> #{{invoice_number}}</p>
        <p><strong>Date Issued:</strong> {{issue_date}}</p>
        <p><strong>Due Date:</strong> {{due_date}}</p>
        <div class="amount">{{currency}}{{amount}}</div>
        <p><strong>Description:</strong> {{description}}</p>
      </div>
      <p>Please proceed with the payment by the due date.</p>
      <a href="{{payment_link}}" class="button">Pay Now</a>
      <a href="{{invoice_pdf}}" class="button" style="background: #666;">Download PDF</a>
      <p>If you have any questions, please don''t hesitate to contact us.</p>
      <p>Best regards,<br>Accounts Department<br>{{company}}</p>
    </div>
  </div>
</body>
</html>',
  '["client_name", "invoice_number", "issue_date", "due_date", "currency", "amount", "description", "payment_link", "invoice_pdf", "company"]'::jsonb
)
ON CONFLICT (name) DO NOTHING;
