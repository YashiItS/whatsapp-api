"use strict";

const crypto = require("crypto");
const config = require("./config");
const Conversation = require("./conversation");

function verifyWebhookSignature(req, buf) {
  const signature = req.headers["x-hub-signature-256"];
  if (!signature || !config.appSecret) return true;

  const expected = crypto.createHmac("sha256", config.appSecret).update(buf).digest("hex");
  return signature === `sha256=${expected}`;
}

function handleWebhookPayload(payload) {
  if (!payload || payload.object !== "whatsapp_business_account") {
    return;
  }

  payload.entry.forEach((entry) => {
    entry.changes.forEach((change) => {
      const value = change && change.value;
      if (!value) return;

      const senderPhoneNumberId = value.metadata && value.metadata.phone_number_id;

      if (value.statuses) {
        value.statuses.forEach((status) => Conversation.handleStatus(senderPhoneNumberId, status));
      }

      if (value.messages) {
        value.messages.forEach((message) => Conversation.handleMessage(senderPhoneNumberId, message));
      }
    });
  });
}

module.exports = {
  verifyWebhookSignature,
  handleWebhookPayload,
};
