# API Service

Backend API service for broker wrapper with AngelOne integration.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your AngelOne API credentials:
- `ANGEL_ONE_API_KEY`: Your AngelOne API key
- `ANGEL_ONE_BASE_URL`: AngelOne API base URL (default: https://apiconnect.angelone.in)
- `PORT`: Server port (default: 3000)

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Start Production Server

```bash
npm start
```

## API Endpoints

### Authentication Endpoints

#### 1. Login
**POST** `/api/auth/login`

Authenticate with AngelOne using client code, PIN, and TOTP.

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

#### 2. Generate Token
**POST** `/api/auth/generate-token`

Generate new tokens using refresh token.

**Headers:**
```
Authorization: Bearer <jwtToken>
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzUxMiJ9..."
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
    "feedToken": "eyJhbGciOiJIUzUxMiJ9..."
  }
}
```

#### 3. Get Profile
**GET** `/api/auth/profile`

Get user profile information.

**Headers:**
```
Authorization: Bearer <jwtToken>
```

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

### Portfolio Endpoints

#### 1. Get Holding
**GET** `/api/portfolio/holding`

Retrieve holding (long-term equity delivery stocks).

**Headers:**
```
Authorization: Bearer <jwtToken>
```

**Response:**
```json
{
  "tradingsymbol": "TATASTEEL-EQ",
  "exchange": "NSE",
  "isin": "INE081A01020",
  "t1quantity": 0,
  "realisedquantity": 2,
  "quantity": 2,
  "authorisedquantity": 0,
  "product": "DELIVERY",
  "collateralquantity": null,
  "collateraltype": null,
  "haircut": 0,
  "averageprice": 111.87,
  "ltp": 130.15,
  "symboltoken": "3499",
  "close": 129.6,
  "profitandloss": 37,
  "pnlpercentage": 16.34
}
```

#### 2. Get All Holdings
**GET** `/api/portfolio/holdings`

Retrieve all holdings with summary information.

**Headers:**
```
Authorization: Bearer <jwtToken>
```

**Response:**
```json
{
  "status": true,
  "message": "SUCCESS",
  "errorcode": "",
  "data": {
    "holdings": [
      {
        "tradingsymbol": "TATASTEEL-EQ",
        "exchange": "NSE",
        "isin": "INE081A01020",
        "quantity": 2,
        "averageprice": 111.87,
        "ltp": 130.15,
        "profitandloss": 37,
        "pnlpercentage": 16.34
      }
    ],
    "totalholding": {
      "totalholdingvalue": 5294,
      "totalinvvalue": 5116,
      "totalprofitandloss": 178.14,
      "totalpnlpercentage": 3.48
    }
  }
}
```

#### 3. Get Position
**GET** `/api/portfolio/position`

Retrieve position portfolio (net and day positions).

**Headers:**
```
Authorization: Bearer <jwtToken>
```

**Response:**
```json
{
  "status": true,
  "message": "SUCCESS",
  "errorcode": "",
  "data": [
    {
      "exchange": "NSE",
      "symboltoken": "2885",
      "producttype": "DELIVERY",
      "tradingsymbol": "RELIANCE-EQ",
      "symbolname": "RELIANCE",
      "netqty": "1",
      "netprice": "2235.80",
      "netvalue": "- 2235.80"
    }
  ]
}
```

#### 4. Convert Position
**POST** `/api/portfolio/convert-position`

Convert position from one product type to another (e.g., DELIVERY to INTRADAY).

**Headers:**
```
Authorization: Bearer <jwtToken>
```

**Request Body:**
```json
{
  "exchange": "NSE",
  "symboltoken": "2885",
  "oldproducttype": "DELIVERY",
  "newproducttype": "INTRADAY",
  "tradingsymbol": "RELIANCE-EQ",
  "symbolname": "RELIANCE",
  "instrumenttype": "",
  "priceden": "1",
  "pricenum": "1",
  "genden": "1",
  "gennum": "1",
  "precision": "2",
  "multiplier": "-1",
  "boardlotsize": "1",
  "buyqty": "1",
  "sellqty": "0",
  "buyamount": "2235.80",
  "sellamount": "0",
  "transactiontype": "BUY",
  "quantity": 1,
  "type": "DAY"
}
```

**Response:**
```json
{
  "status": true,
  "message": "SUCCESS",
  "errorcode": "",
  "data": null
}
```

### Health Check

**GET** `/health`

Returns server status.

## Architecture

The API follows a modular architecture:

- **`src/config/`** - Configuration files (API keys, endpoints)
- **`src/controllers/`** - Request handlers
- **`src/middleware/`** - Middleware functions (error handling, validation)
- **`src/routes/`** - Route definitions
- **`src/services/`** - Business logic and external API calls
- **`src/types/`** - TypeScript type definitions
- **`src/websocket/`** - WebSocket handlers (for future use)

