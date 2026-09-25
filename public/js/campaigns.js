document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('campaignForm');
  const tableBody = document.getElementById('campaignsTableBody');
  const templateSelect = document.getElementById('campaignTemplate');
  const campaignPreview = document.getElementById('campaignPreview');

  async function loadTemplates() {
    const response = await fetch('/api/templates', { credentials: 'same-origin' });
    const payload = await response.json();
    if (!payload.success || !Array.isArray(payload.data)) return;

    templateSelect.innerHTML = payload.data
      .filter((template) => String(template.status).toUpperCase() === 'APPROVED')
      .map((template) => `<option value="${template.name}">${template.name} (${template.language})</option>`)
      .join('');
  }

  async function loadCampaigns() {
    const response = await fetch('/api/campaigns', { credentials: 'same-origin' });
    const payload = await response.json();
    if (!payload.success) return;
    tableBody.innerHTML = (payload.data || []).map((campaign) => `
      <tr>
        <td>${campaign.name}</td>
        <td>${campaign.template_name}</td>
        <td>${campaign.language}</td>
        <td><span class="badge ${campaign.status || 'draft'}">${campaign.status || 'draft'}</span></td>
        <td>${campaign.total_contacts || 0}</td>
        <td><button type="button" class="secondary" data-send="${campaign.id}">Start</button></td>
      </tr>
    `).join('');

    tableBody.querySelectorAll('[data-send]').forEach((button) => {
      button.addEventListener('click', async () => {
        await fetch(`/api/campaigns/${button.dataset.send}/send`, { method: 'POST', credentials: 'same-origin' });
        loadCampaigns();
      });
    });
  }

  templateSelect.addEventListener('change', () => {
    campaignPreview.innerHTML = `<strong>Template:</strong> ${templateSelect.value}`;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      name: document.getElementById('campaignName').value,
      template_name: templateSelect.value,
      language: document.getElementById('campaignLanguage').value,
      status: 'draft',
    };

    await fetch('/api/campaigns', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    form.reset();
    await loadCampaigns();
  });

  await loadTemplates();
  await loadCampaigns();
});
