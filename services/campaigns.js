"use strict";

function normalizeCampaign(campaign) {
  return {
    ...campaign,
    status: campaign.status || "draft",
    language: campaign.language || "en_US",
    total_contacts: Number(campaign.total_contacts || 0),
    sent_count: Number(campaign.sent_count || 0),
    delivered_count: Number(campaign.delivered_count || 0),
    read_count: Number(campaign.read_count || 0),
    failed_count: Number(campaign.failed_count || 0),
  };
}

module.exports = {
  normalizeCampaign,
};
