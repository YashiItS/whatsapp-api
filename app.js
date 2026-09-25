"use strict";

require("dotenv").config();

const path = require("node:path");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const config = require("./services/config");
const GraphApi = require("./services/graph-api");
const database = require("./services/database");
const { handleWebhookPayload, verifyWebhookSignature } = require("./services/webhook");

const app = express();
const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true";

config.checkEnvVariables();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.path === "/webhook") {
      const valid = verifyWebhookSignature(req, buf);
      if (!valid) {
        throw new Error("Webhook signature mismatch");
      }
    }
  },
}));
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000,
  },
}));

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many login attempts. Please try again later." },
});

function apiResponse(res, statusCode, payload) {
  return res.status(statusCode).json(payload);
}

function isAuthenticatedSession(req) {
  return !!(req.session && (req.session.user || req.session.authenticated));
}

function requirePageAuth(req, res, next) {
  if (!isAuthenticatedSession(req)) {
    return res.redirect("/login");
  }
  return next();
}

function requireApiAuth(req, res, next) {
  if (!isAuthenticatedSession(req)) {
    return apiResponse(res, 401, { success: false, error: "Authentication required" });
  }
  return next();
}

const publicDir = path.join(__dirname, "public");

app.use(express.static(publicDir));

app.get("/", (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect("/dashboard");
  }
  return res.sendFile(path.join(publicDir, "login.html"));
});

app.get("/login", (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect("/dashboard");
  }
  return res.sendFile(path.join(publicDir, "login.html"));
});

app.get("/dashboard", requirePageAuth, (req, res) => res.sendFile(path.join(publicDir, "dashboard.html")));
app.get("/contacts", requirePageAuth, (req, res) => res.sendFile(path.join(publicDir, "contacts.html")));
app.get("/campaigns", requirePageAuth, (req, res) => res.sendFile(path.join(publicDir, "campaigns.html")));
app.get("/messages", requirePageAuth, (req, res) => res.sendFile(path.join(publicDir, "messages.html")));
app.get("/templates", requirePageAuth, (req, res) => res.sendFile(path.join(publicDir, "templates.html")));

app.get("/webhook", (req, res) => {
  if (req.query["hub.mode"] !== "subscribe" || req.query["hub.verify_token"] !== config.verifyToken) {
    return apiResponse(res, 403, { success: false, error: "Verification failed" });
  }
  return res.status(200).send(req.query["hub.challenge"]);
});

app.post("/webhook", (req, res) => {
  try {
    handleWebhookPayload(req.body);
    return res.status(200).send("EVENT_RECEIVED");
  } catch (error) {
    console.error("Webhook processing failed:", error.message || error);
    return apiResponse(res, 500, { success: false, error: "Webhook processing failed" });
  }
});

app.get("/api/login", (req, res) => {
  return apiResponse(res, 405, { success: false, error: "GET /api/login is not supported. Use POST with JSON credentials." });
});

app.post("/api/login", loginLimiter, async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");

  if (!username || !password) {
    return apiResponse(res, 400, { success: false, error: "Username and password are required" });
  }

  const authenticated = await database.verifyAdmin(username, password);
  if (!authenticated) {
    return apiResponse(res, 401, { success: false, error: "Invalid username or password" });
  }

  req.session.authenticated = true;
  req.session.user = { username };
  const payload = { success: true, user: { username }, data: { user: { username } } };
  return apiResponse(res, 200, payload);
});

app.post("/api/logout", (req, res) => {
  if (req.session) {
    req.session.destroy((error) => {
      if (error) {
        return apiResponse(res, 500, { success: false, error: "Unable to log out" });
      }
      return apiResponse(res, 200, { success: true, data: {} });
    });
    return;
  }

  return apiResponse(res, 200, { success: true, data: {} });
});

app.get("/api/me", requireApiAuth, (req, res) => {
  return apiResponse(res, 200, { success: true, user: req.session.user, data: { user: req.session.user } });
});

app.get("/api/dashboard", requireApiAuth, async (req, res) => {
  const stats = database.getDashboardStats();
  return apiResponse(res, 200, {
    success: true,
    data: {
      ...stats,
      recentCampaigns: database.state.campaigns.slice(0, 5),
      recentMessages: database.state.messages.slice(0, 5),
    },
  });
});

app.get("/api/contacts", requireApiAuth, (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const q = String(req.query.q || "").trim();
  const status = String(req.query.status || "").trim();
  const result = database.listContacts({ page, limit, q, status });
  return apiResponse(res, 200, { success: true, data: result });
});

app.post("/api/contacts", requireApiAuth, (req, res) => {
  const result = database.createContact(req.body || {});
  return apiResponse(res, 201, { success: true, data: { contact: result } });
});

app.put("/api/contacts/:id", requireApiAuth, (req, res) => {
  const result = database.updateContact(req.params.id, req.body || {});
  if (!result) {
    return apiResponse(res, 404, { success: false, error: "Contact not found" });
  }
  return apiResponse(res, 200, { success: true, data: { contact: result } });
});

app.delete("/api/contacts/:id", requireApiAuth, (req, res) => {
  const removed = database.deleteContact(req.params.id);
  if (!removed) {
    return apiResponse(res, 404, { success: false, error: "Contact not found" });
  }
  return apiResponse(res, 200, { success: true, data: { deleted: true } });
});

app.get("/api/campaigns", requireApiAuth, (req, res) => {
  return apiResponse(res, 200, { success: true, data: database.listCampaigns() });
});

app.post("/api/campaigns", requireApiAuth, (req, res) => {
  const campaign = database.createCampaign(req.body || {});
  return apiResponse(res, 201, { success: true, data: { campaign } });
});

app.post("/api/campaigns/:id/send", requireApiAuth, async (req, res) => {
  const campaign = database.getCampaignById(req.params.id);
  if (!campaign) {
    return apiResponse(res, 404, { success: false, error: "Campaign not found" });
  }

  const contacts = database.listContacts({ limit: 500 }).contacts;
  const recipients = contacts.filter((contact) => String(contact.status || "active").toLowerCase() === "active");

  for (let index = 0; index < recipients.length; index += 1) {
    const contact = recipients[index];
    try {
      const response = await GraphApi.sendHelloWorldMessage(contact.phone);
      database.saveMessage({
        id: `${campaign.id}_${contact.id}_${Date.now()}`,
        campaign_id: campaign.id,
        contact_id: contact.id,
        phone: contact.phone,
        message_id: response && response.messages ? response.messages[0]?.id : null,
        template_name: campaign.template_name || "hello_world",
        status: "sent",
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      database.saveMessage({
        id: `${campaign.id}_${contact.id}_${Date.now()}_failed`,
        campaign_id: campaign.id,
        contact_id: contact.id,
        phone: contact.phone,
        message_id: null,
        template_name: campaign.template_name || "hello_world",
        status: "failed",
        error_message: error.message || "Send failed",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  return apiResponse(res, 200, { success: true, data: { campaignId: campaign.id, sentTo: recipients.length } });
});

app.get("/api/messages", requireApiAuth, (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const q = String(req.query.q || "").trim();
  const status = String(req.query.status || "").trim();
  const result = database.listMessages({ page, limit, q, status });
  const messages = result.messages.map((message) => {
    const contact = database.state.contacts.find((entry) => String(entry.id) === String(message.contact_id));
    const campaign = database.state.campaigns.find((entry) => String(entry.id) === String(message.campaign_id));
    return {
      ...message,
      contact_name: contact ? contact.name : "Unknown",
      campaign_name: campaign ? campaign.name : "Unknown",
    };
  });
  return apiResponse(res, 200, { success: true, data: { ...result, messages } });
});

app.get("/api/templates", requireApiAuth, (req, res) => {
  return apiResponse(res, 200, { success: true, data: database.listTemplates() });
});

app.post("/api/test-whatsapp", requireApiAuth, async (req, res) => {
  const phone = String(req.body?.to || "").trim();
  if (!phone) {
    return apiResponse(res, 400, { success: false, error: "A non-empty \"to\" field is required" });
  }

  try {
    const response = await GraphApi.sendHelloWorldMessage(phone);
    return apiResponse(res, 200, { success: true, data: { response } });
  } catch (error) {
    console.error("Test WhatsApp message failed:", error.message || error);
    return apiResponse(res, 502, { success: false, error: "WhatsApp message could not be sent." });
  }
});

app.use((error, req, res, next) => {
  if (error && error.message === "Webhook signature mismatch") {
    return apiResponse(res, 403, { success: false, error: "Invalid webhook signature" });
  }
  console.error("Unhandled error:", error && error.message ? error.message : error);
  if (!res.headersSent) {
    return apiResponse(res, 500, { success: false, error: "Internal server error" });
  }
  return next(error);
});

async function startServer(port = config.port) {
  await database.initializeDatabase();
  return new Promise((resolve) => {
    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`Server running on port ${server.address().port}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer(config.port);
}

module.exports = { app, startServer };
