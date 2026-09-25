"use strict";

const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const config = require("./config");
const { sanitizeContact } = require("./contacts");
const { normalizeCampaign } = require("./campaigns");

const state = {
  initialized: false,
  useMemory: true,
  pool: null,
  admins: [],
  contacts: [],
  campaigns: [],
  messages: [],
  templates: [
    { id: 1, name: "hello_world", language: "en_US", category: "MARKETING", status: "APPROVED", components: [{ type: "BODY", text: "Hello!" }] },
    { id: 2, name: "diwali_offer", language: "en_US", category: "MARKETING", status: "APPROVED", components: [{ type: "BODY", text: "Diwali offer" }] },
  ],
};

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 9)}`;
}

async function initializeDatabase() {
  if (state.initialized) {
    return state;
  }

  state.initialized = true;

  if (config.databaseUrl) {
    state.pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseUrl.includes("render") ? { rejectUnauthorized: false } : false,
    });

    try {
      await state.pool.query("SELECT 1");
      state.useMemory = false;
      console.log("Database connected");
    } catch (error) {
      console.warn("PostgreSQL unavailable; using in-memory fallback for local development.");
      state.pool = null;
      state.useMemory = true;
    }
  }

  if (state.useMemory) {
    const passwordHash = await bcrypt.hash(config.adminPass, 10);
    state.admins = [{
      id: 1,
      username: config.adminUser,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
    }];

    state.contacts = [
      { id: 1, name: "Demo Contact", phone: "919876543210", email: "demo@example.com", tags: ["vip"], status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 2, name: "Support Team", phone: "919988776655", email: "support@example.com", tags: ["support"], status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];

    state.campaigns = [
      { id: 1, name: "Welcome Campaign", template_name: "hello_world", language: "en_US", status: "draft", total_contacts: 2, sent_count: 1, delivered_count: 1, read_count: 0, failed_count: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];

    state.messages = [
      { id: 1, campaign_id: 1, contact_id: 1, phone: "919876543210", message_id: "wamid_1", template_name: "hello_world", status: "sent", error_message: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 2, campaign_id: 1, contact_id: 2, phone: "919988776655", message_id: "wamid_2", template_name: "hello_world", status: "delivered", error_message: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
  }

  return state;
}

async function verifyAdmin(username, password) {
  await initializeDatabase();
  const admin = state.admins.find((entry) => entry.username === username);
  if (!admin) return false;
  return bcrypt.compare(password, admin.password_hash);
}

function getDashboardStats() {
  const contacts = state.contacts.length;
  const campaigns = state.campaigns.length;
  const messages = state.messages.length;
  const sent = state.messages.filter((m) => String(m.status).toLowerCase() === "sent").length;
  const delivered = state.messages.filter((m) => String(m.status).toLowerCase() === "delivered").length;
  const read = state.messages.filter((m) => String(m.status).toLowerCase() === "read").length;
  const failed = state.messages.filter((m) => String(m.status).toLowerCase() === "failed").length;

  return {
    contacts,
    campaigns,
    messages,
    sent,
    delivered,
    read,
    failed,
  };
}

function listContacts(options = {}) {
  const q = (options.q || "").trim().toLowerCase();
  const status = (options.status || "").trim().toLowerCase();
  let contacts = [...state.contacts];

  if (q) {
    contacts = contacts.filter((contact) => {
      const values = [contact.name, contact.phone, contact.email, (contact.tags || []).join(" ")].join(" ").toLowerCase();
      return values.includes(q);
    });
  }

  if (status) {
    contacts = contacts.filter((contact) => String(contact.status || "").toLowerCase() === status);
  }

  const total = contacts.length;
  const page = Number(options.page) > 0 ? Number(options.page) : 1;
  const limit = Number(options.limit) > 0 ? Number(options.limit) : 20;
  const start = (page - 1) * limit;

  return { contacts: contacts.slice(start, start + limit), total, page, limit };
}

function createContact(input) {
  const contact = sanitizeContact({
    id: makeId("contact"),
    ...input,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  state.contacts.unshift(contact);
  return contact;
}

function updateContact(id, input) {
  const index = state.contacts.findIndex((contact) => String(contact.id) === String(id));
  if (index === -1) return null;

  const updated = sanitizeContact({
    ...state.contacts[index],
    ...input,
    id: state.contacts[index].id,
    updated_at: new Date().toISOString(),
  });

  state.contacts[index] = updated;
  return updated;
}

function deleteContact(id) {
  const before = state.contacts.length;
  state.contacts = state.contacts.filter((contact) => String(contact.id) !== String(id));
  return state.contacts.length !== before;
}

function listMessages(options = {}) {
  const q = (options.q || "").trim().toLowerCase();
  const status = (options.status || "").trim().toLowerCase();
  let messages = [...state.messages];

  if (q) {
    messages = messages.filter((message) => [message.phone, message.template_name, message.status, message.message_id].join(" ").toLowerCase().includes(q));
  }

  if (status) {
    messages = messages.filter((message) => String(message.status || "").toLowerCase() === status);
  }

  const total = messages.length;
  const page = Number(options.page) > 0 ? Number(options.page) : 1;
  const limit = Number(options.limit) > 0 ? Number(options.limit) : 20;
  const start = (page - 1) * limit;

  return { messages: messages.slice(start, start + limit), total, page, limit };
}

function listCampaigns() {
  return state.campaigns.map((campaign) => normalizeCampaign(campaign));
}

function createCampaign(input) {
  const campaign = normalizeCampaign({
    id: makeId("campaign"),
    ...input,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  state.campaigns.unshift(campaign);
  return campaign;
}

function getCampaignById(id) {
  return state.campaigns.find((campaign) => String(campaign.id) === String(id)) || null;
}

function listTemplates() {
  return [...state.templates];
}

function saveMessage(message) {
  state.messages.unshift(message);
  return message;
}

module.exports = {
  initializeDatabase,
  verifyAdmin,
  getDashboardStats,
  listContacts,
  createContact,
  updateContact,
  deleteContact,
  listMessages,
  listCampaigns,
  createCampaign,
  getCampaignById,
  listTemplates,
  saveMessage,
  state,
};
