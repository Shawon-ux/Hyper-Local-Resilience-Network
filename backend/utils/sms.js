let client;
let twilio;

try {
  twilio = require('twilio');
} catch (err) {
  console.warn('Twilio module not installed; SMS functionality will be disabled. Install with `npm install twilio` to enable.');
}

// Initialize Twilio client (if credentials available)
if (twilio && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

/**
 * Send SMS notification
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - SMS message content
 * @returns {Promise<Object>} Twilio response or success indicator
 */
const sendSMS = async (phoneNumber, message) => {
  try {
    // If Twilio is not configured, log and return success (development fallback)
    if (!client) {
      console.log(`[SMS FALLBACK] To: ${phoneNumber}`);
      console.log(`[SMS FALLBACK] Message: ${message}`);
      return { success: true, fallback: true, message: 'SMS logged (Twilio not configured)' };
    }

    // Send SMS via Twilio
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    console.log(`SMS sent successfully. SID: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('Failed to send SMS:', error.message || error);
    // Log error but don't throw - allow app to continue
    return { success: false, error: error.message || 'SMS send failed' };
  }
};

/**
 * Send rejection SMS to requester
 * @param {string} phoneNumber - Requester's phone number
 * @param {string} requestTitle - Title of the rejected request
 * @returns {Promise<Object>} SMS send result
 */
const sendRejectionSMS = async (phoneNumber, requestTitle) => {
  const message = `Your request "${requestTitle}" was rejected. Please apply again with more details. Thank you!`;
  return sendSMS(phoneNumber, message);
};

/**
 * Send approval SMS to requester
 * @param {string} phoneNumber - Requester's phone number
 * @param {string} requestTitle - Title of the approved request
 * @returns {Promise<Object>} SMS send result
 */
const sendApprovalSMS = async (phoneNumber, requestTitle) => {
  const message = `Great news! Your request "${requestTitle}" has been approved and is now visible to helpers in your community.`;
  return sendSMS(phoneNumber, message);
};

module.exports = {
  sendSMS,
  sendRejectionSMS,
  sendApprovalSMS,
};
