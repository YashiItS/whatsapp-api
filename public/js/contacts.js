document.addEventListener('DOMContentLoaded', async () => {
  const state = { page: 1, limit: 20, q: '', status: '' };
  const tableBody = document.getElementById('contactsTableBody');
  const pager = document.getElementById('contactsPager');
  const searchInput = document.getElementById('contactSearch');
  const statusFilter = document.getElementById('contactStatusFilter');
  const form = document.getElementById('contactForm');
  const addButton = document.getElementById('addContactButton');
  const cancelButton = document.getElementById('cancelContactEdit');

  function setFormVisible(visible) {
    form.classList.toggle('hidden', !visible);
  }

  function renderRows(rows) {
    tableBody.innerHTML = rows.map((contact) => `
      <tr>
        <td><input type="checkbox" data-contact-id="${contact.id}" /></td>
        <td>${contact.name || '—'}</td>
        <td>${contact.phone || '—'}</td>
        <td>${contact.email || '—'}</td>
        <td>${(contact.tags || []).join(', ') || '—'}</td>
        <td><span class="badge ${contact.status || 'active'}">${contact.status || 'active'}</span></td>
        <td>
          <button type="button" class="secondary" data-action="edit" data-id="${contact.id}">Edit</button>
          <button type="button" class="secondary" data-action="delete" data-id="${contact.id}">Delete</button>
        </td>
      </tr>
    `).join('');

    tableBody.querySelectorAll('[data-action="edit"]').forEach((button) => {
      button.addEventListener('click', async () => {
        const contact = (await fetchContacts()).contacts.find((entry) => String(entry.id) === button.dataset.id);
        if (!contact) return;
        document.getElementById('contactId').value = contact.id;
        document.getElementById('contactName').value = contact.name || '';
        document.getElementById('contactPhone').value = contact.phone || '';
        document.getElementById('contactEmail').value = contact.email || '';
        document.getElementById('contactTags').value = (contact.tags || []).join(', ');
        document.getElementById('contactStatus').value = contact.status || 'active';
        setFormVisible(true);
      });
    });

    tableBody.querySelectorAll('[data-action="delete"]').forEach((button) => {
      button.addEventListener('click', async () => {
        await fetch(`/api/contacts/${button.dataset.id}`, { method: 'DELETE', credentials: 'same-origin' });
        await loadContacts();
      });
    });
  }

  async function fetchContacts() {
    const params = new URLSearchParams({ page: state.page, limit: state.limit, q: state.q, status: state.status });
    const response = await fetch(`/api/contacts?${params.toString()}`, { credentials: 'same-origin' });
    return response.json();
  }

  async function loadContacts() {
    const payload = await fetchContacts();
    if (!payload.success) return;
    const contacts = payload.data.contacts || [];
    renderRows(contacts);
    pager.innerHTML = `Page ${payload.data.page || 1} of ${Math.max(1, Math.ceil((payload.data.total || 0) / (payload.data.limit || 20)))}`;
  }

  searchInput.addEventListener('input', (event) => {
    state.q = event.target.value;
    state.page = 1;
    loadContacts();
  });

  statusFilter.addEventListener('change', (event) => {
    state.status = event.target.value;
    state.page = 1;
    loadContacts();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = document.getElementById('contactId').value;
    const payload = {
      name: document.getElementById('contactName').value,
      phone: document.getElementById('contactPhone').value,
      email: document.getElementById('contactEmail').value,
      tags: document.getElementById('contactTags').value,
      status: document.getElementById('contactStatus').value,
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/contacts/${id}` : '/api/contacts';
    await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    form.reset();
    setFormVisible(false);
    loadContacts();
  });

  addButton.addEventListener('click', () => setFormVisible(true));
  cancelButton.addEventListener('click', () => {
    form.reset();
    setFormVisible(false);
  });

  document.getElementById('exportContactsButton').addEventListener('click', async () => {
    const payload = await fetchContacts();
    const csv = [
      ['id', 'name', 'phone', 'email', 'tags', 'status', 'created_at', 'updated_at'].join(','),
      ...((payload.data.contacts || []).map((contact) => [contact.id, contact.name, contact.phone, contact.email, (contact.tags || []).join(';'), contact.status, contact.created_at, contact.updated_at].map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.csv';
    a.click();
    URL.revokeObjectURL(url);
  });

  await loadContacts();
});
