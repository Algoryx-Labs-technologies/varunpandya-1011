"""
Angel One SmartAPI Integration Module
Handles authentication, order placement, and position management
"""
import pyotp
from smartapi import SmartConnect
from typing import Dict, List, Optional, Any
from loguru import logger
import json
from datetime import datetime
from config import Config


class AngelOneBroker:
    """Wrapper class for Angel One SmartAPI"""
    
    def __init__(self):
        self.api_key = Config.ANGEL_ONE_API_KEY
        self.client_id = Config.ANGEL_ONE_CLIENT_ID
        self.password = Config.ANGEL_ONE_PASSWORD
        self.totp_secret = Config.ANGEL_ONE_TOTP_SECRET
        self.obj = None
        self.feed_token = None
        self.jwt_token = None
        
    def connect(self) -> bool:
        """Initialize and authenticate with Angel One API"""
        try:
            self.obj = SmartConnect(api_key=self.api_key)
            
            # Generate TOTP
            totp = pyotp.TOTP(self.totp_secret)
            totp_code = totp.now()
            
            # Generate session
            data = self.obj.generateSession(
                self.client_id,
                self.password,
                totp_code
            )
            
            if data['status']:
                self.jwt_token = data['data']['jwtToken']
                self.feed_token = data['data']['feedToken']
                logger.info("Successfully connected to Angel One API")
                return True
            else:
                logger.error(f"Failed to connect: {data['message']}")
                return False
                
        except Exception as e:
            logger.error(f"Error connecting to Angel One: {str(e)}")
            return False
    
    def get_profile(self) -> Optional[Dict]:
        """Get user profile"""
        try:
            return self.obj.getProfile(self.jwt_token)
        except Exception as e:
            logger.error(f"Error getting profile: {str(e)}")
            return None
    
    def place_buy_order(
        self,
        symbol: str,
        token: str,
        quantity: int,
        price: float,
        order_type: str = "LIMIT"
    ) -> Optional[Dict]:
        """
        Place a buy order
        
        Args:
            symbol: Trading symbol (e.g., 'NIFTY25JAN29100CE')
            token: Instrument token
            quantity: Number of lots/contracts
            price: Limit price
            order_type: Order type (LIMIT/MARKET)
        """
        try:
            order_params = {
                "variety": Config.VARIETY,
                "tradingsymbol": symbol,
                "symboltoken": token,
                "transactiontype": "BUY",
                "exchange": Config.EXCHANGE,
                "ordertype": order_type,
                "producttype": Config.PRODUCT_TYPE,
                "duration": Config.ORDER_DURATION,
                "price": str(price),
                "squareoff": "0",
                "stoploss": "0",
                "quantity": str(quantity)
            }
            
            response = self.obj.placeOrder(order_params)
            logger.info(f"Buy order placed: {symbol} | Qty: {quantity} | Price: {price}")
            return response
            
        except Exception as e:
            logger.error(f"Error placing buy order: {str(e)}")
            return None
    
    def place_sell_order(
        self,
        symbol: str,
        token: str,
        quantity: int,
        price: float,
        order_type: str = "LIMIT"
    ) -> Optional[Dict]:
        """
        Place a sell order
        
        Args:
            symbol: Trading symbol
            token: Instrument token
            quantity: Number of lots/contracts
            price: Limit price
            order_type: Order type (LIMIT/MARKET)
        """
        try:
            order_params = {
                "variety": Config.VARIETY,
                "tradingsymbol": symbol,
                "symboltoken": token,
                "transactiontype": "SELL",
                "exchange": Config.EXCHANGE,
                "ordertype": order_type,
                "producttype": Config.PRODUCT_TYPE,
                "duration": Config.ORDER_DURATION,
                "price": str(price),
                "squareoff": "0",
                "stoploss": "0",
                "quantity": str(quantity)
            }
            
            response = self.obj.placeOrder(order_params)
            logger.info(f"Sell order placed: {symbol} | Qty: {quantity} | Price: {price}")
            return response
            
        except Exception as e:
            logger.error(f"Error placing sell order: {str(e)}")
            return None
    
    def cancel_order(self, order_id: str) -> Optional[Dict]:
        """Cancel an order"""
        try:
            response = self.obj.cancelOrder(
                Config.VARIETY,
                order_id
            )
            logger.info(f"Order cancelled: {order_id}")
            return response
        except Exception as e:
            logger.error(f"Error cancelling order: {str(e)}")
            return None
    
    def get_all_open_orders(self) -> List[Dict]:
        """Get all open orders"""
        try:
            response = self.obj.orderBook()
            if response and response.get('status'):
                return response.get('data', [])
            return []
        except Exception as e:
            logger.error(f"Error getting open orders: {str(e)}")
            return []
    
    def get_position(self) -> List[Dict]:
        """Get current positions"""
        try:
            response = self.obj.position()
            if response and response.get('status'):
                return response.get('data', [])
            return []
        except Exception as e:
            logger.error(f"Error getting positions: {str(e)}")
            return []
    
    def get_tradebook(self) -> List[Dict]:
        """Get trade book (executed trades)"""
        try:
            response = self.obj.tradeBook()
            if response and response.get('status'):
                return response.get('data', [])
            return []
        except Exception as e:
            logger.error(f"Error getting tradebook: {str(e)}")
            return []
    
    def get_ltp(self, exchange: str, symbol_token: str) -> Optional[float]:
        """Get Last Traded Price (LTP)"""
        try:
            response = self.obj.ltpData(exchange, symbol_token)
            if response and response.get('status'):
                return float(response['data']['ltp'])
            return None
        except Exception as e:
            logger.error(f"Error getting LTP: {str(e)}")
            return None
    
    def get_historical_data(
        self,
        token: str,
        exchange: str,
        interval: str,
        from_date: str,
        to_date: str
    ) -> Optional[List[Dict]]:
        """
        Get historical OHLC data
        
        Args:
            token: Instrument token
            exchange: Exchange (NSE/NFO)
            interval: Timeframe (ONE_MINUTE, FIVE_MINUTE, FIFTEEN_MINUTE)
            from_date: Start date (YYYY-MM-DD HH:mm:ss)
            to_date: End date (YYYY-MM-DD HH:mm:ss)
        """
        try:
            response = self.obj.getCandleData({
                "exchange": exchange,
                "symboltoken": token,
                "interval": interval,
                "fromdate": from_date,
                "todate": to_date
            })
            
            if response and response.get('status'):
                return response.get('data', [])
            return []
        except Exception as e:
            logger.error(f"Error getting historical data: {str(e)}")
            return None
    
    def cancel_all(self) -> int:
        """
        Cancel all open orders
        
        Returns:
            Number of orders cancelled
        """
        try:
            open_orders = self.get_all_open_orders()
            cancelled_count = 0
            
            for order in open_orders:
                order_id = order.get('orderid') or order.get('order_id')
                if order_id:
                    result = self.cancel_order(str(order_id))
                    if result and result.get('status'):
                        cancelled_count += 1
            
            logger.info(f"Cancelled {cancelled_count} orders")
            return cancelled_count
        except Exception as e:
            logger.error(f"Error cancelling all orders: {str(e)}")
            return 0
    
    def logout(self):
        """Logout from Angel One API"""
        try:
            if self.obj:
                self.obj.terminateSession(self.client_id)
                logger.info("Logged out from Angel One API")
        except Exception as e:
            logger.error(f"Error logging out: {str(e)}")
