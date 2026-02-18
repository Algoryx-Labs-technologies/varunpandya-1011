export function renderAuth(): string {
  return `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-logo">
            <span class="auth-logo-icon">A</span>
            <span class="auth-logo-text">Algoryx Labs</span>
          </div>
          <h1 class="auth-title">Welcome Back</h1>
          <p class="auth-subtitle">Sign in to continue to your trading dashboard</p>
        </div>
        <form class="auth-form" id="auth-form" novalidate>
          <div class="auth-form-group">
            <label for="auth-username" class="auth-label">Username</label>
            <input 
              type="text" 
              id="auth-username" 
              name="username" 
              class="auth-input" 
              placeholder="Enter your username" 
              required 
              autocomplete="username"
              aria-required="true"
            />
            <span class="auth-error" id="auth-username-error" role="alert"></span>
          </div>
          <div class="auth-form-group">
            <label for="auth-password" class="auth-label">Password</label>
            <input 
              type="password" 
              id="auth-password" 
              name="password" 
              class="auth-input" 
              placeholder="Enter your password" 
              required 
              autocomplete="current-password"
              aria-required="true"
            />
            <span class="auth-error" id="auth-password-error" role="alert"></span>
          </div>
          <button type="submit" class="auth-submit-btn" id="auth-submit-btn">
            <span class="auth-btn-text">Sign In</span>
          </button>
        </form>
      </div>
    </div>
  `
}

export function initAuth(): void {
  const form = document.getElementById('auth-form') as HTMLFormElement
  const usernameInput = document.getElementById('auth-username') as HTMLInputElement
  const passwordInput = document.getElementById('auth-password') as HTMLInputElement
  const usernameError = document.getElementById('auth-username-error')
  const passwordError = document.getElementById('auth-password-error')
  const submitBtn = document.getElementById('auth-submit-btn')

  function clearErrors() {
    if (usernameError) usernameError.textContent = ''
    if (passwordError) passwordError.textContent = ''
    usernameInput?.classList.remove('auth-input-error')
    passwordInput?.classList.remove('auth-input-error')
  }

  function showError(input: HTMLInputElement, errorEl: HTMLElement | null, message: string) {
    input.classList.add('auth-input-error')
    if (errorEl) errorEl.textContent = message
  }

  function validateForm(): boolean {
    clearErrors()
    let isValid = true

    if (!usernameInput?.value.trim()) {
      showError(usernameInput, usernameError, 'Username is required')
      isValid = false
    }

    if (!passwordInput?.value) {
      showError(passwordInput, passwordError, 'Password is required')
      isValid = false
    } else if (passwordInput.value.length < 3) {
      showError(passwordInput, passwordError, 'Password must be at least 3 characters')
      isValid = false
    }

    return isValid
  }

  if (usernameInput) {
    usernameInput.addEventListener('input', () => {
      if (usernameInput.classList.contains('auth-input-error')) {
        clearErrors()
      }
    })
  }

  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      if (passwordInput.classList.contains('auth-input-error')) {
        clearErrors()
      }
    })
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      
      if (!validateForm()) {
        return
      }

      const username = usernameInput?.value.trim()
      const password = passwordInput?.value

      if (username && password) {
        if (submitBtn) {
          submitBtn.disabled = true
          const btnText = submitBtn.querySelector('.auth-btn-text')
          if (btnText) btnText.textContent = 'Signing in...'
        }

        // Authenticate against environment credentials
        import('../utils/auth').then(({ authenticate }) => {
          const isAuthenticated = authenticate(username, password)
          
          if (isAuthenticated) {
            // Navigate to dashboard on successful authentication
            import('../router').then(({ navigateTo }) => {
              navigateTo('dashboard')
              import('../app').then(({ render }) => render())
            })
          } else {
            // Show authentication error
            if (submitBtn) {
              submitBtn.disabled = false
              const btnText = submitBtn.querySelector('.auth-btn-text')
              if (btnText) btnText.textContent = 'Sign In'
            }
            showError(passwordInput, passwordError, 'Invalid username or password')
            passwordInput.value = ''
          }
        })
      }
    })
  }
}

