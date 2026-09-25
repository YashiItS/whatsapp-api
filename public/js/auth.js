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

function showLoginError(message) {
  const loginError = document.getElementById('loginError');
  if (!loginError) return;
  loginError.textContent = message || 'Invalid username or password';
  loginError.classList.remove('hidden');
}

async function fetchCurrentUser() {
  const response = await fetch('/api/me', { method: 'GET', credentials: 'include' });
  const data = await safeJson(response);
  if (response.ok && data.success && data.user) {
    setUserBadge(data.user.username);
    return data.user;
  }
  setUserBadge('');
  return null;
}

async function logoutUser() {
  const response = await fetch('/api/logout', { method: 'POST', credentials: 'include' });
  const data = await safeJson(response);
  if (response.ok && data.success) {
    window.location.href = '/login';
  }
}

function bindLoginForm() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username')?.value?.trim() || '';
    const password = document.getElementById('password')?.value || '';
    const loginError = document.getElementById('loginError');

    if (loginError) {
      loginError.classList.add('hidden');
    }

    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    const data = await safeJson(response);

    if (response.ok && data.success) {
      window.location.href = '/dashboard';
      return;
    }

    showLoginError(data.error || 'Invalid username or password');
  });
}

function wireLogout() {
  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', logoutUser);
  }
}

function initAuthGate() {
  bindLoginForm();
  wireLogout();
  fetchCurrentUser();
}

document.addEventListener('DOMContentLoaded', initAuthGate);
