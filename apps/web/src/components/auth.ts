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
            <div class="auth-input-wrapper">
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
              <button type="button" class="auth-toggle-visibility" data-field="auth-username" aria-label="Toggle visibility">
                <svg class="auth-eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
            <span class="auth-error" id="auth-username-error" role="alert"></span>
          </div>
          <div class="auth-form-group">
            <label for="auth-password" class="auth-label">Password</label>
            <div class="auth-input-wrapper">
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
              <button type="button" class="auth-toggle-visibility" data-field="auth-password" aria-label="Toggle visibility">
                <svg class="auth-eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
            <span class="auth-error" id="auth-password-error" role="alert"></span>
          </div>
          <div class="auth-form-group">
            <label for="auth-clientcode" class="auth-label">Client Code</label>
            <div class="auth-input-wrapper">
              <input 
                type="password" 
                id="auth-clientcode" 
                name="clientcode" 
                class="auth-input" 
                placeholder="Enter your AngelOne client code" 
                required 
                aria-required="true"
              />
              <button type="button" class="auth-toggle-visibility" data-field="auth-clientcode" aria-label="Toggle visibility">
                <svg class="auth-eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
            <span class="auth-error" id="auth-clientcode-error" role="alert"></span>
          </div>
          <div class="auth-form-group">
            <label for="auth-pin" class="auth-label">PIN</label>
            <div class="auth-input-wrapper">
              <input 
                type="password" 
                id="auth-pin" 
                name="pin" 
                class="auth-input" 
                placeholder="Enter your AngelOne PIN" 
                required 
                aria-required="true"
              />
              <button type="button" class="auth-toggle-visibility" data-field="auth-pin" aria-label="Toggle visibility">
                <svg class="auth-eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
            <span class="auth-error" id="auth-pin-error" role="alert"></span>
          </div>
          <div class="auth-form-group">
            <label for="auth-totp" class="auth-label">TOTP</label>
            <div class="auth-input-wrapper">
              <input 
                type="password" 
                id="auth-totp" 
                name="totp" 
                class="auth-input" 
                placeholder="Enter TOTP from authenticator app" 
                required 
                maxlength="6"
                pattern="[0-9]{6}"
                aria-required="true"
              />
              <button type="button" class="auth-toggle-visibility" data-field="auth-totp" aria-label="Toggle visibility">
                <svg class="auth-eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
            <span class="auth-error" id="auth-totp-error" role="alert"></span>
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
  const clientcodeInput = document.getElementById('auth-clientcode') as HTMLInputElement
  const pinInput = document.getElementById('auth-pin') as HTMLInputElement
  const totpInput = document.getElementById('auth-totp') as HTMLInputElement
  const usernameError = document.getElementById('auth-username-error')
  const passwordError = document.getElementById('auth-password-error')
  const clientcodeError = document.getElementById('auth-clientcode-error')
  const pinError = document.getElementById('auth-pin-error')
  const totpError = document.getElementById('auth-totp-error')
  const submitBtn = document.getElementById('auth-submit-btn') as HTMLButtonElement

  function clearErrors() {
    if (usernameError) usernameError.textContent = ''
    if (passwordError) passwordError.textContent = ''
    if (clientcodeError) clientcodeError.textContent = ''
    if (pinError) pinError.textContent = ''
    if (totpError) totpError.textContent = ''
    usernameInput?.classList.remove('auth-input-error')
    passwordInput?.classList.remove('auth-input-error')
    clientcodeInput?.classList.remove('auth-input-error')
    pinInput?.classList.remove('auth-input-error')
    totpInput?.classList.remove('auth-input-error')
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

    if (!clientcodeInput?.value.trim()) {
      showError(clientcodeInput, clientcodeError, 'Client code is required')
      isValid = false
    }

    if (!pinInput?.value.trim()) {
      showError(pinInput, pinError, 'PIN is required')
      isValid = false
    }

    if (!totpInput?.value.trim()) {
      showError(totpInput, totpError, 'TOTP is required')
      isValid = false
    } else if (!/^\d{6}$/.test(totpInput.value.trim())) {
      showError(totpInput, totpError, 'TOTP must be 6 digits')
      isValid = false
    }

    return isValid
  }

  const inputs = [usernameInput, passwordInput, clientcodeInput, pinInput, totpInput]
  inputs.forEach((input) => {
    input?.addEventListener('input', () => {
      if (input.classList.contains('auth-input-error')) {
        clearErrors()
      }
    })
  })

  // Initialize visibility toggle buttons
  document.querySelectorAll('.auth-toggle-visibility').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fieldId = (btn as HTMLElement).dataset.field
      if (!fieldId) return
      
      const input = document.getElementById(fieldId) as HTMLInputElement
      if (!input) return

      const isHidden = input.type === 'password'
      input.type = isHidden ? 'text' : 'password'
      
      // Update icon
      const icon = btn.querySelector('.auth-eye-icon')
      if (icon) {
        if (isHidden) {
          // Show eye-off icon (text is visible)
          icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
        } else {
          // Show eye icon (text is hidden)
          icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
        }
      }
    })
  })

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      
      if (!validateForm()) {
        return
      }

      const username = usernameInput?.value.trim()
      const password = passwordInput?.value
      const clientcode = clientcodeInput?.value.trim()
      const pin = pinInput?.value.trim()
      const totp = totpInput?.value.trim()

      if (username && password && clientcode && pin && totp) {
        if (submitBtn) {
          submitBtn.disabled = true
          const btnText = submitBtn.querySelector('.auth-btn-text')
          if (btnText) btnText.textContent = 'Signing in...'
        }

        try {
          // First authenticate against environment credentials
          const { authenticate, saveAngelOneToken } = await import('../utils/auth')
          const isAuthenticated = authenticate(username, password)
          
          if (!isAuthenticated) {
            throw new Error('Invalid username or password')
          }

          // Then call AngelOne API to get token
          const { loginToAngelOne } = await import('../utils/api')
          const loginResponse = await loginToAngelOne({
            clientcode,
            password: pin, // Use PIN as password for AngelOne API
            totp,
          })

          if (loginResponse.status && loginResponse.data?.jwtToken) {
            // Save AngelOne token to localStorage
            saveAngelOneToken(loginResponse.data.jwtToken)
            
            // Navigate to dashboard on successful authentication
            const { navigateTo } = await import('../router')
            navigateTo('dashboard')
            const { render } = await import('../app')
            render()
          } else {
            throw new Error(loginResponse.message || 'Failed to get AngelOne token')
          }
        } catch (error: any) {
          // Show error message
          if (submitBtn) {
            submitBtn.disabled = false
            const btnText = submitBtn.querySelector('.auth-btn-text')
            if (btnText) btnText.textContent = 'Sign In'
          }
          
          const errorMessage = error.message || 'Login failed. Please try again.'
          if (error.message?.includes('username') || error.message?.includes('password')) {
            showError(passwordInput, passwordError, errorMessage)
            passwordInput.value = ''
          } else if (error.message?.includes('clientcode')) {
            showError(clientcodeInput, clientcodeError, errorMessage)
            clientcodeInput.value = ''
          } else if (error.message?.includes('PIN') || error.message?.includes('pin')) {
            showError(pinInput, pinError, errorMessage)
            pinInput.value = ''
          } else if (error.message?.includes('TOTP') || error.message?.includes('totp')) {
            showError(totpInput, totpError, errorMessage)
            totpInput.value = ''
          } else {
            showError(totpInput, totpError, errorMessage)
          }
        }
      }
    })
  }
}

