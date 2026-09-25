"use strict";

const bcrypt = require("bcryptjs");
const config = require("./config");

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

async function ensureDefaultAdmin(adminStore) {
  const username = config.adminUser;
  const password = config.adminPass;

  const existing = adminStore.find((admin) => admin.username === username);
  if (existing) {
    return existing;
  }

  const passwordHash = await hashPassword(password);
  const admin = {
    id: Date.now(),
    username,
    password_hash: passwordHash,
    created_at: new Date().toISOString(),
  };

  adminStore.push(admin);
  return admin;
}

module.exports = {
  hashPassword,
  verifyPassword,
  ensureDefaultAdmin,
};
