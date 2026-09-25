"use strict";

function normalizePhone(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\D/g, "");
}

function sanitizeContact(contact) {
  const phone = normalizePhone(contact.phone || "");
  const tags = Array.isArray(contact.tags)
    ? contact.tags
    : typeof contact.tags === "string"
      ? contact.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
      : [];

  return {
    ...contact,
    phone,
    tags,
    status: contact.status || "active",
  };
}

module.exports = {
  normalizePhone,
  sanitizeContact,
};
