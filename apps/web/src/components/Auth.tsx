import React, { useState } from 'react'
import type { RouteKey } from '../constants/routes'
import { loginToAngelOne } from '../utils/api'
import { saveAngelOneToken } from '../utils/auth'

interface AuthProps {
  onNavigate: (route: RouteKey) => void
}

export default function Auth({ onNavigate }: AuthProps) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    clientcode: '',
    pin: '',
    totp: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showFields, setShowFields] = useState({
    password: false,
    clientcode: false,
    pin: false,
    totp: false,
  })

  const showError = (field: string, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }))
  }

  const validateForm = (): boolean => {
    // Clear previous errors first
    setErrors({})
    let isValid = true
    const newErrors: Record<string, string> = {}

    // Validate all required fields
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
      isValid = false
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required'
      isValid = false
    }

    if (!formData.clientcode.trim()) {
      newErrors.clientcode = 'Client code is required'
      isValid = false
    }

    if (!formData.pin.trim()) {
      newErrors.pin = 'PIN is required'
      isValid = false
    }

    if (!formData.totp.trim()) {
      newErrors.totp = 'TOTP is required'
      isValid = false
    } else if (!/^\d{6}$/.test(formData.totp.trim())) {
      newErrors.totp = 'TOTP must be 6 digits'
      isValid = false
    }

    // Set all errors at once
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
    }

    console.log('Form validation result:', isValid, 'New errors:', newErrors)
    return isValid
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error for this specific field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const toggleVisibility = (field: keyof typeof showFields) => {
    setShowFields((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('=== FORM SUBMISSION START ===')
    console.log('Form submitted with data:', formData)

    // Clear all previous errors first
    setErrors({})
    
    const validationResult = validateForm()
    console.log('Validation result:', validationResult)

    if (!validationResult) {
      console.log('❌ VALIDATION FAILED - API call will NOT be made')
      console.log('Current form errors:', errors)
      return
    }

    console.log('✅ VALIDATION PASSED - Proceeding with API call')
    setIsSubmitting(true)

    try {
      const requestData = {
        username: formData.username.trim(),
        password: formData.password.trim(),
        clientcode: formData.clientcode.trim(),
        pin: formData.pin.trim(),
        totp: formData.totp.trim(),
      }
      
      console.log('📡 CALLING API with data:', { ...requestData, password: '***', pin: '***' })
      console.log('🌐 API URL:', `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/api/auth/login`)

      const loginResponse = await loginToAngelOne(requestData)

      console.log('Login response:', loginResponse)

      if (loginResponse.status && loginResponse.data?.jwtToken) {
        // Save AngelOne token
        saveAngelOneToken(loginResponse.data.jwtToken)
        // Set app authentication token to mark user as authenticated
        localStorage.setItem('algoryx_auth_token', 'authenticated')
        onNavigate('dashboard')
      } else {
        throw new Error(loginResponse.message || 'Failed to get AngelOne token')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      const errorMessage = error.message || 'Login failed. Please try again.'
      const errorCode = error.errorcode || ''
      
      // Handle different error types
      if (errorCode === 'UNAUTHORIZED' || errorMessage.toLowerCase().includes('username') || errorMessage.toLowerCase().includes('password')) {
        // Username/password validation failed
        if (errorMessage.toLowerCase().includes('username')) {
          showError('username', errorMessage)
        } else {
          showError('password', errorMessage)
          setFormData((prev) => ({ ...prev, password: '' }))
        }
      } else if (errorMessage.toLowerCase().includes('clientcode') || errorCode.includes('CLIENTCODE')) {
        showError('clientcode', errorMessage)
        setFormData((prev) => ({ ...prev, clientcode: '' }))
      } else if (errorMessage.toLowerCase().includes('pin') || errorCode.includes('PIN')) {
        showError('pin', errorMessage)
        setFormData((prev) => ({ ...prev, pin: '' }))
      } else if (errorMessage.toLowerCase().includes('totp') || errorCode.includes('TOTP')) {
        showError('totp', errorMessage)
        setFormData((prev) => ({ ...prev, totp: '' }))
      } else {
        showError('totp', errorMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span className="auth-logo-icon">A</span>
            <span className="auth-logo-text">Algoryx Labs</span>
          </div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to continue to your trading dashboard</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-form-group">
            <label htmlFor="auth-username" className="auth-label">Username</label>
            <div className="auth-input-wrapper">
              <input
                type="text"
                id="auth-username"
                name="username"
                className={`auth-input ${errors.username ? 'auth-input-error' : ''}`}
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleInputChange}
                autoComplete="username"
                aria-required="true"
              />
            </div>
            {errors.username && <span className="auth-error" role="alert">{errors.username}</span>}
          </div>
          <div className="auth-form-group">
            <label htmlFor="auth-password" className="auth-label">Password</label>
            <div className="auth-input-wrapper">
              <input
                type={showFields.password ? 'text' : 'password'}
                id="auth-password"
                name="password"
                className={`auth-input ${errors.password ? 'auth-input-error' : ''}`}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                autoComplete="current-password"
                aria-required="true"
              />
              <button
                type="button"
                className="auth-toggle-visibility"
                onClick={() => toggleVisibility('password')}
                aria-label="Toggle visibility"
              >
                <svg className="auth-eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showFields.password ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </>
                  )}
                </svg>
              </button>
            </div>
            {errors.password && <span className="auth-error" role="alert">{errors.password}</span>}
          </div>
          <div className="auth-form-group">
            <label htmlFor="auth-clientcode" className="auth-label">Client Code</label>
            <div className="auth-input-wrapper">
              <input
                type={showFields.clientcode ? 'text' : 'password'}
                id="auth-clientcode"
                name="clientcode"
                className={`auth-input ${errors.clientcode ? 'auth-input-error' : ''}`}
                placeholder="Enter your AngelOne client code"
                value={formData.clientcode}
                onChange={handleInputChange}
                aria-required="true"
              />
              <button
                type="button"
                className="auth-toggle-visibility"
                onClick={() => toggleVisibility('clientcode')}
                aria-label="Toggle visibility"
              >
                <svg className="auth-eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showFields.clientcode ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </>
                  )}
                </svg>
              </button>
            </div>
            {errors.clientcode && <span className="auth-error" role="alert">{errors.clientcode}</span>}
          </div>
          <div className="auth-form-group">
            <label htmlFor="auth-pin" className="auth-label">PIN</label>
            <div className="auth-input-wrapper">
              <input
                type={showFields.pin ? 'text' : 'password'}
                id="auth-pin"
                name="pin"
                className={`auth-input ${errors.pin ? 'auth-input-error' : ''}`}
                placeholder="Enter your AngelOne PIN"
                value={formData.pin}
                onChange={handleInputChange}
                aria-required="true"
              />
              <button
                type="button"
                className="auth-toggle-visibility"
                onClick={() => toggleVisibility('pin')}
                aria-label="Toggle visibility"
              >
                <svg className="auth-eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showFields.pin ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </>
                  )}
                </svg>
              </button>
            </div>
            {errors.pin && <span className="auth-error" role="alert">{errors.pin}</span>}
          </div>
          <div className="auth-form-group">
            <label htmlFor="auth-totp" className="auth-label">TOTP</label>
            <div className="auth-input-wrapper">
              <input
                type={showFields.totp ? 'text' : 'password'}
                id="auth-totp"
                name="totp"
                className={`auth-input ${errors.totp ? 'auth-input-error' : ''}`}
                placeholder="Enter TOTP from authenticator app"
                value={formData.totp}
                onChange={handleInputChange}
                maxLength={6}
                pattern="[0-9]{6}"
                aria-required="true"
              />
              <button
                type="button"
                className="auth-toggle-visibility"
                onClick={() => toggleVisibility('totp')}
                aria-label="Toggle visibility"
              >
                <svg className="auth-eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showFields.totp ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </>
                  )}
                </svg>
              </button>
            </div>
            {errors.totp && <span className="auth-error" role="alert">{errors.totp}</span>}
          </div>
          <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
            <span className="auth-btn-text">{isSubmitting ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}

