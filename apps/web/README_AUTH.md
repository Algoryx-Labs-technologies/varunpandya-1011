# Authentication Setup

This application uses environment variables for authentication credentials.

## Setup Instructions

1. Create a `.env` file in the `apps/web` directory (if it doesn't exist)

2. Add the following environment variables:

```env
VITE_AUTH_USERNAME=your_username_here
VITE_AUTH_PASSWORD=your_password_here
```

3. Replace `your_username_here` and `your_password_here` with your desired credentials

4. Restart the development server for changes to take effect

## Example

```env
VITE_AUTH_USERNAME=admin
VITE_AUTH_PASSWORD=admin123
```

## How It Works

- The authentication middleware checks credentials against environment variables
- Only one user is supported (configured via env variables)
- Authentication state is stored in localStorage
- All routes except `/` (auth page) are protected
- Users are automatically redirected to the login page if not authenticated
- A logout button is available in the header for authenticated users

## Security Note

⚠️ **Important**: Environment variables prefixed with `VITE_` are exposed to the client-side code. This is a frontend-only authentication solution. For production use, implement proper backend authentication.

