document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('templatesList');
  const response = await fetch('/api/templates', { credentials: 'same-origin' });
  const payload = await response.json();

  if (!payload.success) {
    container.innerHTML = '<p>Unable to load templates.</p>';
    return;
  }

  container.innerHTML = (payload.data || []).map((template) => `
    <article class="template-card">
      <h3>${template.name}</h3>
      <p><strong>Language:</strong> ${template.language}</p>
      <p><strong>Category:</strong> ${template.category}</p>
      <p><strong>Status:</strong> ${template.status}</p>
      <pre>${JSON.stringify(template.components || [], null, 2)}</pre>
    </article>
  `).join('');
});
