# Authentication Setup

This application uses environment variables for authentication credentials and integrates with AngelOne API.

## Setup Instructions

1. Create a `.env` file in the `apps/web` directory (if it doesn't exist)

2. Add the following environment variables:

```env
VITE_AUTH_USERNAME=your_username_here
VITE_AUTH_PASSWORD=your_password_here
VITE_API_BASE_URL=http://localhost:3001
```

3. Replace `your_username_here` and `your_password_here` with your desired credentials

4. Set `VITE_API_BASE_URL` to your backend API URL (defaults to `http://localhost:3001`)

5. Restart the development server for changes to take effect

## Example

```env
VITE_AUTH_USERNAME=admin
VITE_AUTH_PASSWORD=admin123
VITE_API_BASE_URL=http://localhost:3001
```

## Login Flow

1. **Frontend Authentication**: User enters username and password (validated against env variables)
2. **AngelOne API Login**: After successful frontend auth, the app calls the AngelOne login API with:
   - Client Code (entered by user)
   - Password (same as frontend password)
   - TOTP (6-digit code from authenticator app)
3. **Token Storage**: The JWT token from AngelOne API is saved to localStorage with key `angle one token`
4. **Navigation**: User is redirected to the dashboard

## Login Form Fields

- **Username**: Frontend authentication username (from env)
- **Password**: Frontend authentication password (from env)
- **Client Code**: Your AngelOne client code
- **TOTP**: 6-digit code from your authenticator app

## How It Works

- The authentication middleware checks credentials against environment variables
- Only one user is supported (configured via env variables)
- Authentication state is stored in localStorage
- AngelOne JWT token is stored in localStorage with key `angle one token`
- All routes except `/` (auth page) are protected
- Users are automatically redirected to the login page if not authenticated
- A logout button is available in the header for authenticated users

## API Integration

The app calls the backend API at `/api/auth/login` endpoint with:
```json
{
  "clientcode": "your_client_code",
  "password": "your_password",
  "totp": "123456"
}
```

The response includes a `jwtToken` which is saved to localStorage.

## Security Note

⚠️ **Important**: Environment variables prefixed with `VITE_` are exposed to the client-side code. This is a frontend-only authentication solution. For production use, implement proper backend authentication.

