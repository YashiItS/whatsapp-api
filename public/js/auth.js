async function safeJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function setUserBadge(username) {
  const userBadge = document.getElementById('userBadge');
  if (userBadge) {
    userBadge.textContent = username ? `Logged in: ${username}` : 'Not logged in';
  }
}

async function fetchCurrentUser() {
  const response = await fetch('/api/me', { method: 'GET', credentials: 'same-origin' });
  const data = await safeJson(response);
  if (response.ok && data.success && data.user) {
    setUserBadge(data.user.username);
    return data.user;
  }
  setUserBadge('');
  return null;
}

async function logoutUser() {
  const response = await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
  const data = await safeJson(response);
  if (response.ok && data.success) {
    window.location.href = '/login';
  }
}

function wireLogout() {
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', logoutUser);
  }
}

function initAuthGate() {
  wireLogout();
  fetchCurrentUser();
}

document.addEventListener('DOMContentLoaded', initAuthGate);
