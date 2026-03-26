(function swaggerLoginBootstrap() {
  const STORAGE_KEY = 'swaggerBearerToken';
  const LOGIN_ERROR_ID = 'swagger-login-error';

  function getUi() {
    return window.ui;
  }

  function getStoredToken() {
    return window.localStorage.getItem(STORAGE_KEY);
  }

  function setStoredToken(token) {
    window.localStorage.setItem(STORAGE_KEY, token);
  }

  function clearStoredToken() {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function setError(message) {
    const errorNode = document.getElementById(LOGIN_ERROR_ID);

    if (errorNode) {
      errorNode.textContent = message || '';
    }
  }

  function authorizeToken(token) {
    const ui = getUi();

    if (!ui || !token) {
      return;
    }

    try {
      ui.authActions.authorize({
        bearerAuth: {
          name: 'bearerAuth',
          schema: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          },
          value: token
        }
      });
    } catch (_error) {
      // Swagger UI may not be ready yet; a later interval retry handles this.
    }
  }

  function createLoginPanel() {
    if (document.getElementById('swagger-login-panel')) {
      return;
    }

    const wrapper = document.querySelector('.swagger-ui');

    if (!wrapper) {
      return;
    }

    const panel = document.createElement('section');
    panel.id = 'swagger-login-panel';
    panel.style.margin = '16px auto';
    panel.style.maxWidth = '1460px';
    panel.style.padding = '0 20px';

    panel.innerHTML = [
      '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;padding:16px 20px;border:1px solid #d7dde8;border-radius:12px;background:#f7f9fc;box-shadow:0 8px 24px rgba(15,23,42,0.06);">',
      '<div style="min-width:200px;flex:1 1 220px;">',
      '<label for="swagger-login-username" style="display:block;margin-bottom:6px;font:600 12px/1.4 sans-serif;color:#334155;">Username</label>',
      '<input id="swagger-login-username" type="text" autocomplete="username" style="width:100%;height:40px;padding:0 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;">',
      '</div>',
      '<div style="min-width:200px;flex:1 1 220px;">',
      '<label for="swagger-login-password" style="display:block;margin-bottom:6px;font:600 12px/1.4 sans-serif;color:#334155;">Password</label>',
      '<input id="swagger-login-password" type="password" autocomplete="current-password" style="width:100%;height:40px;padding:0 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;">',
      '</div>',
      '<button id="swagger-login-submit" type="button" style="height:40px;padding:0 16px;border:0;border-radius:8px;background:#0f766e;color:#fff;font:600 14px/1 sans-serif;cursor:pointer;">Login</button>',
      '<button id="swagger-login-logout" type="button" style="height:40px;padding:0 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#0f172a;font:600 14px/1 sans-serif;cursor:pointer;">Logout</button>',
      '<div style="flex:1 1 100%;font:500 12px/1.5 sans-serif;color:#475569;">Use a superadmin account to load the protected OpenAPI spec and try secured routes.</div>',
      '<div id="swagger-login-error" style="flex:1 1 100%;min-height:18px;font:500 12px/1.5 sans-serif;color:#b91c1c;"></div>',
      '</div>'
    ].join('');

    wrapper.prepend(panel);

    const usernameInput = document.getElementById('swagger-login-username');
    const passwordInput = document.getElementById('swagger-login-password');
    const loginButton = document.getElementById('swagger-login-submit');
    const logoutButton = document.getElementById('swagger-login-logout');

    async function login() {
      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      if (!username || !password) {
        setError('Username and password are required.');
        return;
      }

      setError('');
      loginButton.disabled = true;
      loginButton.textContent = 'Logging in...';

      try {
        const response = await window.fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error && payload.error.message ? payload.error.message : 'Login failed');
        }

        const token = payload.data && payload.data.token;

        if (!token) {
          throw new Error('Login succeeded but no token was returned');
        }

        setStoredToken(token);
        authorizeToken(token);
        window.location.reload();
      } catch (error) {
        setError(error.message || 'Login failed');
      } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'Login';
      }
    }

    loginButton.addEventListener('click', login);
    passwordInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        login();
      }
    });
    logoutButton.addEventListener('click', () => {
      clearStoredToken();
      setError('');
      window.location.reload();
    });
  }

  const existingToken = getStoredToken();

  let attempts = 0;
  const intervalId = window.setInterval(() => {
    attempts += 1;

    createLoginPanel();

    if (existingToken) {
      authorizeToken(existingToken);
    }

    if (getUi() || attempts >= 20) {
      window.clearInterval(intervalId);
    }
  }, 250);
})();
