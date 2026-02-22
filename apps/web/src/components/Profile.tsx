import { useEffect, useState } from 'react'
import { getProfile, type ProfileResponse } from '../utils/api'

export default function Profile() {
  const [profileData, setProfileData] = useState<ProfileResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await getProfile()
        if (response.status && response.data) {
          setProfileData(response.data)
        } else {
          setError(response.message || 'Failed to fetch profile')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const parseArrayField = (field: string[] | string): string[] => {
    if (Array.isArray(field)) {
      return field
    }
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field)
        return Array.isArray(parsed) ? parsed : [parsed]
      } catch {
        return [field]
      }
    }
    return []
  }

  if (loading) {
    return (
      <div className="page-content">
        <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Loading profile...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="card" style={{ padding: '32px' }}>
          <div style={{ color: 'var(--accent-red)', marginBottom: '16px' }}>Error: {error}</div>
          <button
            type="button"
            className="btn-pill primary"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="page-content">
        <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>No profile data available</div>
        </div>
      </div>
    )
  }

  const exchanges = parseArrayField(profileData.exchanges)
  const products = parseArrayField(profileData.products)

  return (
    <div className="page-content">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Profile
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Your account information and trading preferences
        </p>
      </div>

      <div className="card" style={{ padding: '32px' }}>
        <div style={{ display: 'grid', gap: '24px' }}>
          <div>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: 'var(--accent-red)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'white', 
              fontSize: '2rem', 
              fontWeight: 600,
              marginBottom: '24px'
            }}>
              {profileData.name.charAt(0).toUpperCase()}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                color: 'var(--text-secondary)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px',
                marginBottom: '8px'
              }}>
                Name
              </label>
              <div style={{ 
                fontSize: '1rem', 
                color: 'var(--text-primary)', 
                fontWeight: 500 
              }}>
                {profileData.name || 'N/A'}
              </div>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                color: 'var(--text-secondary)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px',
                marginBottom: '8px'
              }}>
                Client Code
              </label>
              <div style={{ 
                fontSize: '1rem', 
                color: 'var(--text-primary)', 
                fontWeight: 500 
              }}>
                {profileData.clientcode || 'N/A'}
              </div>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                color: 'var(--text-secondary)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px',
                marginBottom: '8px'
              }}>
                Email
              </label>
              <div style={{ 
                fontSize: '1rem', 
                color: 'var(--text-primary)', 
                fontWeight: 500 
              }}>
                {profileData.email || 'N/A'}
              </div>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                color: 'var(--text-secondary)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px',
                marginBottom: '8px'
              }}>
                Mobile Number
              </label>
              <div style={{ 
                fontSize: '1rem', 
                color: 'var(--text-primary)', 
                fontWeight: 500 
              }}>
                {profileData.mobileno || 'N/A'}
              </div>
            </div>

            <div>
              <label style={{ 
                display: 'block', 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                color: 'var(--text-secondary)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px',
                marginBottom: '8px'
              }}>
                Broker ID
              </label>
              <div style={{ 
                fontSize: '1rem', 
                color: 'var(--text-primary)', 
                fontWeight: 500 
              }}>
                {profileData.brokerid || 'N/A'}
              </div>
            </div>

            {profileData.lastlogintime && (
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  color: 'var(--text-secondary)', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}>
                  Last Login Time
                </label>
                <div style={{ 
                  fontSize: '1rem', 
                  color: 'var(--text-primary)', 
                  fontWeight: 500 
                }}>
                  {profileData.lastlogintime}
                </div>
              </div>
            )}

            {exchanges.length > 0 && (
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  color: 'var(--text-secondary)', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}>
                  Exchanges
                </label>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px' 
                }}>
                  {exchanges.map((exchange, index) => (
                    <span
                      key={index}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--bg-card-elevated)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.875rem',
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                      }}
                    >
                      {exchange}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {products.length > 0 && (
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  color: 'var(--text-secondary)', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}>
                  Products
                </label>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px' 
                }}>
                  {products.map((product, index) => (
                    <span
                      key={index}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--bg-card-elevated)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.875rem',
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                      }}
                    >
                      {product}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

