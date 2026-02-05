// Brokerage Calculator types for AngelOne API

export interface BrokerageOrder {
  product_type: string;
  transaction_type: string;
  quantity: string;
  price: string;
  exchange: string;
  symbol_name: string;
  token: string;
}

export interface BrokerageChargeBreakup {
  name: string;
  amount: number;
  msg: string;
  breakup: BrokerageChargeBreakup[];
}

export interface BrokerageChargeDetail {
  total_charges: number;
  trade_value: number;
  breakup: BrokerageChargeBreakup[];
}

export interface BrokerageSummary {
  total_charges: number;
  trade_value: number;
  breakup: BrokerageChargeBreakup[];
}

export interface EstimateChargesRequest {
  orders: BrokerageOrder[];
}

export interface EstimateChargesResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: {
    summary: BrokerageSummary;
    charges: BrokerageChargeDetail[];
  };
}

