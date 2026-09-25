document.addEventListener('DOMContentLoaded', async () => {
  const state = { page: 1, limit: 20, q: '', status: '' };
  const searchInput = document.getElementById('messageSearch');
  const statusFilter = document.getElementById('messageStatusFilter');
  const body = document.getElementById('messagesTableBody');
  const pager = document.getElementById('messagesPager');

  async function fetchMessages() {
    const params = new URLSearchParams({ page: state.page, limit: state.limit, q: state.q, status: state.status });
    const response = await fetch(`/api/messages?${params.toString()}`, { credentials: 'same-origin' });
    return response.json();
  }

  async function loadMessages() {
    const payload = await fetchMessages();
    if (!payload.success) return;
    body.innerHTML = (payload.data.messages || []).map((message) => `
      <tr>
        <td>${message.phone || '—'}</td>
        <td>${message.contact_name || '—'}</td>
        <td>${message.campaign_name || '—'}</td>
        <td>${message.template_name || '—'}</td>
        <td>${message.message_id || '—'}</td>
        <td><span class="badge ${message.status || 'sent'}">${message.status || 'sent'}</span></td>
        <td>${message.error_message || '—'}</td>
        <td>${message.created_at ? new Date(message.created_at).toLocaleString() : '—'}</td>
      </tr>
    `).join('');
    pager.innerHTML = `Page ${payload.data.page || 1} of ${Math.max(1, Math.ceil((payload.data.total || 0) / (payload.data.limit || 20)))}`;
  }

  searchInput.addEventListener('input', (event) => {
    state.q = event.target.value;
    state.page = 1;
    loadMessages();
  });

  statusFilter.addEventListener('change', (event) => {
    state.status = event.target.value;
    state.page = 1;
    loadMessages();
  });

  await loadMessages();
});
