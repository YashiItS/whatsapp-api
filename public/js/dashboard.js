document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('statsGrid');
  const campaigns = document.getElementById('recentCampaigns');
  const messages = document.getElementById('recentMessages');

  const response = await fetch('/api/dashboard', { credentials: 'include' });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    window.location.href = '/login';
    return;
  }

  const stats = payload.data;
  const entityCards = [
    ['Total contacts', stats.contacts],
    ['Total campaigns', stats.campaigns],
    ['Total messages', stats.messages],
    ['Sent messages', stats.sent],
    ['Delivered messages', stats.delivered],
    ['Read messages', stats.read],
    ['Failed messages', stats.failed],
  ];

  grid.innerHTML = entityCards.map(([label, value]) => `
    <div class="stat-card">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
    </div>
  `).join('');

  campaigns.innerHTML = (stats.recentCampaigns || []).map((campaign) => `
    <div class="table-row">
      <strong>${campaign.name}</strong>
      <span>${campaign.template_name || '—'}</span>
      <span>${campaign.status}</span>
    </div>
  `).join('') || '<p>No campaigns yet.</p>';

  messages.innerHTML = (stats.recentMessages || []).map((message) => `
    <div class="table-row">
      <span>${message.phone}</span>
      <span>${message.template_name || '—'}</span>
      <span>${message.status}</span>
    </div>
  `).join('') || '<p>No recent messages.</p>';
});
