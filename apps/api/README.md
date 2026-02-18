# API Service

Backend API service with AngelOne SmartAPI authentication integration.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Set your `ANGELONE_API_KEY` and other configuration values

## Development

```bash
npm run dev
```

The server will start on `http://localhost:3001` (or the port specified in `.env`).

## Build

```bash
npm run build
```

## Production

```bash
npm start
```

## API Endpoints

### Authentication

#### POST `/api/auth/login`
Login with client code, password, and TOTP.

**Request Body:**
```json
{
  "clientcode": "Your_client_code",
  "password": "Your_pin",
  "totp": "enter_the_code_displayed_on_your_authenticator_app",
  "state": "optional_state_variable"
}
```

**Response:**
```json
{
  "status": true,
  "message": "SUCCESS",
  "errorcode": "",
  "data": {
    "jwtToken": "eyJhbGciOiJIUzUxMiJ9...",
    "refreshToken": "eyJhbGciOiJIUzUxMiJ9...",
    "feedToken": "eyJhbGciOiJIUzUxMiJ9...",
    "state": "live"
  }
}
```

#### POST `/api/auth/generate-token`
Generate new tokens using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzUxMiJ9..."
}
```

**Headers:**
- `Authorization: Bearer <jwt_token>` (optional)

**Response:**
```json
{
  "status": true,
  "message": "SUCCESS",
  "errorcode": "",
  "data": {
    "jwtToken": "eyJhbGciOiJIUzUxMiJ9...",
    "refreshToken": "eyJhbGciOiJIUzUxMiJ9...",
    "feedToken": "eyJhbGciOiJIUzUxMiJ9..."
  }
}
```

#### GET `/api/auth/profile`
Get user profile information.

**Headers:**
- `Authorization: Bearer <jwt_token>` (required)

**Response:**
```json
{
  "status": true,
  "message": "SUCCESS",
  "errorcode": "",
  "data": {
    "clientcode": "YOUR_CLIENT_CODE",
    "name": "YOUR_NAME",
    "email": "",
    "mobileno": "",
    "exchanges": ["NSE", "BSE", "MCX", "CDS", "NCDEX", "NFO"],
    "products": ["DELIVERY", "INTRADAY", "MARGIN"],
    "lastlogintime": "",
    "brokerid": "B2C"
  }
}
```

#### GET `/api/auth/rms`
Get RMS (Risk Management System) limit - fund, cash and margin information for equity and commodity segments.

**Headers:**
- `Authorization: Bearer <jwt_token>` (required)

**Response:**
```json
{
  "status": true,
  "message": "SUCCESS",
  "errorcode": "",
  "data": {
    "net": "9999999999999",
    "availablecash": "9999999999999",
    "availableintradaypayin": "0",
    "availablelimitmargin": "0",
    "collateral": "0",
    "m2munrealized": "0",
    "m2mrealized": "0",
    "utiliseddebits": "0",
    "utilisedspan": "0",
    "utilisedoptionpremium": "0",
    "utilisedholdingsales": "0",
    "utilisedexposure": "0",
    "utilisedturnover": "0",
    "utilisedpayout": "0"
  }
}
```

#### POST `/api/auth/logout`
Logout and invalidate the API session. Destroys the access token and requires a new login flow.

**Headers:**
- `Authorization: Bearer <jwt_token>` (required)

**Request Body:**
```json
{
  "clientcode": "CLIENT_CODE"
}
```

**Response:**
```json
{
  "status": true,
  "message": "SUCCESS",
  "errorcode": "",
  "data": ""
}
```

### Brokerage Calculator

#### POST `/api/brokerage/estimate-charges`
Calculate brokerage charges and taxes that will be incurred for placing trades.

**Headers:**
- `Authorization: Bearer <jwt_token>` (required)

**Request Body:**
```json
{
  "orders": [
    {
      "product_type": "DELIVERY",
      "transaction_type": "BUY",
      "quantity": "10",
      "price": "800",
      "exchange": "NSE",
      "symbol_name": "745AS33",
      "token": "17117"
    },
    {
      "product_type": "DELIVERY",
      "transaction_type": "BUY",
      "quantity": "10",
      "price": "800",
      "exchange": "BSE",
      "symbol_name": "PIICL151223",
      "token": "726131"
    }
  ]
}
```

**Response:**
```json
{
  "status": true,
  "message": "SUCCESS",
  "errorcode": "",
  "data": {
    "summary": {
      "total_charges": 3.0796,
      "trade_value": 16000,
      "breakup": [
        {
          "name": "Angel One Brokerage",
          "amount": 0.0,
          "msg": "",
          "breakup": []
        },
        {
          "name": "External Charges",
          "amount": 2.976,
          "msg": "",
          "breakup": [
            {
              "name": "Exchange Transaction Charges",
              "amount": 0.56,
              "msg": "",
              "breakup": []
            },
            {
              "name": "Stamp Duty",
              "amount": 2.4,
              "msg": "",
              "breakup": []
            },
            {
              "name": "SEBI Fees",
              "amount": 0.016,
              "msg": "",
              "breakup": []
            }
          ]
        },
        {
          "name": "Taxes",
          "amount": 0.1036,
          "msg": "",
          "breakup": [
            {
              "name": "Security Transaction Tax",
              "amount": 0.0,
              "msg": "",
              "breakup": []
            },
            {
              "name": "GST",
              "amount": 0.1036,
              "msg": "",
              "breakup": []
            }
          ]
        }
      ]
    },
    "charges": [
      {
        "total_charges": 1.5162,
        "trade_value": 8000,
        "breakup": [...]
      },
      {
        "total_charges": 1.5634,
        "trade_value": 8000,
        "breakup": [...]
      }
    ]
  }
}
```

### Health Check

#### GET `/health`
Check if the API service is running.

**Response:**
```json
{
  "status": "ok",
  "message": "API service is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Project Structure

```
apps/api/
├── src/
│   ├── config/
│   │   └── angelone.config.ts    # AngelOne API configuration
│   ├── routes/
│   │   ├── auth.routes.ts         # Authentication routes
│   │   └── brokerage.routes.ts    # Brokerage calculator routes
│   ├── services/
│   │   └── angelone.service.ts    # AngelOne API service
│   ├── types/
│   │   └── angelone.types.ts      # TypeScript type definitions
│   └── index.ts                    # Main server file
├── package.json
├── tsconfig.json
└── README.md
```

## Environment Variables

- `ANGELONE_API_KEY` - Your AngelOne API key (required)
- `ANGELONE_BASE_URL` - AngelOne API base URL (default: https://apiconnect.angelone.in)
- `CLIENT_LOCAL_IP` - Client local IP address (optional)
- `CLIENT_PUBLIC_IP` - Client public IP address (optional)
- `MAC_ADDRESS` - MAC address (optional)
- `PORT` - Server port (default: 3001)

