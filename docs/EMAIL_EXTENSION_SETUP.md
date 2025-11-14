# Email Extension Setup and Troubleshooting Guide

## 🚨 Current Issue: Region Mismatch

**Problem**: The Firestore Send Email extension is in **ERRORED** state due to a region mismatch.

- **Extension Functions Region**: `us-central1`
- **Firestore Database Region**: `nam5`

## 🔧 IMMEDIATE FIX (Recommended)

### Option 1: Reconfigure Extension Region

1. **Go to Firebase Console**:
   ```
   https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/extensions
   ```

2. **Find the "Trigger Email from Firestore" extension**

3. **Click "Manage" → "Reconfigure"**

4. **Update Configuration**:
   - **Firestore Instance Location**: Change to `nam5`
   - Keep all other settings the same (SMTP, collection name, etc.)

5. **Save Changes**
   - The extension will redeploy functions to the correct region
   - Wait 2-3 minutes for deployment to complete

6. **Verify Fix**:
   ```bash
   firebase ext:list --project=YOUR_FIREBASE_PROJECT_ID
   ```
   - Status should change from `ERRORED` to `ACTIVE`

## 📧 Testing Email Extension

### Quick Test (After Fix)

```bash
# Simple automated test
node test-email-extension-simple.js

# Comprehensive test suite
./test-email-extension.sh
```

### Manual Firestore Test

1. **Go to Firestore Console**:
   ```
   https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/firestore/data/~2Fmail
   ```

2. **Add Document to `mail` Collection**:
   ```json
   {
     "to": "your-email@example.com",
     "message": {
       "subject": "Test Email",
       "text": "This is a test email from the fixed extension",
       "html": "<p>This is a <strong>test email</strong> from the fixed extension</p>"
     }
   }
   ```

3. **Monitor Document Changes**:
   - Document should update with `delivered: true` or `error` field
   - Check email inbox for delivered message

## 🛠 SMTP Configuration Options

### SendGrid (Recommended)

```
SMTP_CONNECTION_URI: smtps://apikey:YOUR_API_KEY@smtp.sendgrid.net:465
```

**Features**:
- Categories for email organization
- Custom arguments for tracking
- Dynamic templates
- Comprehensive analytics

### Gmail with App Password

```
SMTP_CONNECTION_URI: smtps://your-email@gmail.com:APP_PASSWORD@smtp.gmail.com:465
```

**Setup**:
1. Enable 2FA on Gmail account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use App Password in SMTP URI

### Gmail with OAuth2

```
SMTP_CONNECTION_URI: smtps://smtp.gmail.com:465
```

**Additional OAuth2 Settings**:
- OAuth2 Client ID
- OAuth2 Client Secret  
- OAuth2 Refresh Token
- OAuth2 SMTP User

## 🧪 Advanced Testing Features

### SendGrid Categories Test

```json
{
  "to": "test@example.com",
  "categories": ["newsletter", "marketing", "test"],
  "message": {
    "subject": "SendGrid Categories Test",
    "text": "Testing SendGrid category functionality"
  },
  "customArgs": {
    "campaign": "email-test",
    "user_id": "12345"
  }
}
```

### Multi-Recipient Test

```json
{
  "to": ["recipient1@example.com", "recipient2@example.com"],
  "bcc": ["bcc@example.com"],
  "message": {
    "subject": "Multi-Recipient Test",
    "text": "This email goes to multiple recipients"
  }
}
```

### Custom Headers Test

```json
{
  "to": "test@example.com",
  "message": {
    "subject": "Custom Headers Test",
    "text": "Testing custom email headers"
  },
  "headers": {
    "X-Custom-Header": "TestValue",
    "List-Unsubscribe": "<mailto:unsubscribe@example.com>"
  }
}
```

## 📊 Monitoring and Debugging

### Real-time Log Monitoring

```bash
firebase functions:log --project=YOUR_FIREBASE_PROJECT_ID --follow
```

### Extension Status Check

```bash
firebase ext:list --project=YOUR_FIREBASE_PROJECT_ID
```

### Function Status Check

```bash
firebase functions:list --project=YOUR_FIREBASE_PROJECT_ID
```

## 🔍 Common Issues and Solutions

### 1. Extension Still ERRORED After Reconfiguration

**Solution**: Wait 2-3 minutes for deployment, then check:
```bash
firebase ext:list --project=YOUR_FIREBASE_PROJECT_ID
```

### 2. Emails Not Sending

**Check**:
1. Extension status is `ACTIVE`
2. SMTP credentials are correct
3. Mail collection document structure is valid
4. Check Functions logs for errors

### 3. SendGrid Features Not Working

**Verify**:
1. SMTP URI includes `sendgrid.net`
2. API key has Mail Send permissions
3. Categories and custom args are properly formatted

### 4. Gmail Authentication Issues

**Check**:
1. App Password is correctly generated
2. 2FA is enabled on Gmail account
3. No special characters in password need escaping

## 📱 Testing Dashboard Component

The `EmailExtensionTesting` component provides:

- **Interactive Testing**: Send different email types
- **Real-time Monitoring**: Watch email status changes
- **Email History**: View all sent emails
- **Activity Logs**: Live operation logging
- **Troubleshooting Guide**: Built-in help

### Usage

```tsx
import EmailExtensionTesting from '@/components/EmailExtensionTesting';

export default function TestPage() {
  return <EmailExtensionTesting />;
}
```

## 🚀 Production Checklist

### Before Going Live

1. **✅ Extension Status**: ACTIVE
2. **✅ SMTP Configuration**: Verified and tested
3. **✅ Email Templates**: Created and tested
4. **✅ Monitoring**: Logs and alerts configured
5. **✅ Rate Limits**: SMTP provider limits understood
6. **✅ Unsubscribe**: Headers configured if needed

### Security Considerations

1. **SMTP Credentials**: Store securely, never in code
2. **Email Validation**: Validate recipient addresses
3. **Rate Limiting**: Implement sending limits
4. **Spam Compliance**: Follow CAN-SPAM guidelines

## 📚 Additional Resources

### Firebase Console Links

- **Extensions**: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/extensions
- **Firestore**: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/firestore/data
- **Functions**: https://console.firebase.google.com/project/YOUR_FIREBASE_PROJECT_ID/functions/logs

### Documentation

- **Extension Documentation**: [Firebase Email Extension](https://firebase.google.com/products/extensions/firebase-firestore-send-email)
- **SendGrid API**: [SendGrid Documentation](https://docs.sendgrid.com/)
- **Gmail API**: [Gmail API Documentation](https://developers.google.com/gmail/api)

### Testing Scripts

- **Simple Test**: `node test-email-extension-simple.js`
- **Comprehensive Test**: `./test-email-extension.sh`
- **Region Fix**: `./fix-email-extension-region.sh`
- **Configuration Validator**: `./validate-email-extension.sh`

## 🎯 Next Steps

1. **Fix Region Issue**: Reconfigure extension to use `nam5` region
2. **Test Basic Email**: Send simple test email
3. **Configure SMTP**: Set up production email service
4. **Test Advanced Features**: Categories, templates, multi-recipient
5. **Deploy Testing Dashboard**: Add to your application
6. **Monitor Production**: Set up logging and alerts

---

**Last Updated**: September 19, 2025  
**Status**: Email extension in ERRORED state due to region mismatch  
**Priority**: HIGH - Fix region configuration first
