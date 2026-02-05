// Portfolio types for AngelOne API

export interface Holding {
  tradingsymbol: string;
  exchange: string;
  isin: string;
  t1quantity: number;
  realisedquantity: number;
  quantity: number;
  authorisedquantity: number;
  product: string;
  collateralquantity: number | null;
  collateraltype: string | null;
  haircut: number;
  averageprice: number;
  ltp: number;
  symboltoken: string;
  close: number;
  profitandloss: number;
  pnlpercentage: number;
}

export interface GetHoldingResponse {
  tradingsymbol: string;
  exchange: string;
  isin: string;
  t1quantity: number;
  realisedquantity: number;
  quantity: number;
  authorisedquantity: number;
  product: string;
  collateralquantity: number | null;
  collateraltype: string | null;
  haircut: number;
  averageprice: number;
  ltp: number;
  symboltoken: string;
  close: number;
  profitandloss: number;
  pnlpercentage: number;
}

export interface TotalHolding {
  totalholdingvalue: number;
  totalinvvalue: number;
  totalprofitandloss: number;
  totalpnlpercentage: number;
}

export interface GetAllHoldingResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: {
    holdings: Holding[];
    totalholding: TotalHolding;
  };
}

export interface Position {
  exchange: string;
  symboltoken: string;
  producttype: string;
  tradingsymbol: string;
  symbolname: string;
  instrumenttype: string;
  priceden: string;
  pricenum: string;
  genden: string;
  gennum: string;
  precision: string;
  multiplier: string;
  boardlotsize: string;
  buyqty: string;
  sellqty: string;
  buyamount: string;
  sellamount: string;
  symbolgroup: string;
  strikeprice: string;
  optiontype: string;
  expirydate: string;
  lotsize: string;
  cfbuyqty: string;
  cfsellqty: string;
  cfbuyamount: string;
  cfsellamount: string;
  buyavgprice: string;
  sellavgprice: string;
  avgnetprice: string;
  netvalue: string;
  netqty: string;
  totalbuyvalue: string;
  totalsellvalue: string;
  cfbuyavgprice: string;
  cfsellavgprice: string;
  totalbuyavgprice: string;
  totalsellavgprice: string;
  netprice: string;
}

export interface GetPositionResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: Position[];
}

export interface ConvertPositionRequest {
  exchange: string;
  symboltoken: string;
  oldproducttype: string;
  newproducttype: string;
  tradingsymbol: string;
  symbolname: string;
  instrumenttype: string;
  priceden: string;
  pricenum: string;
  genden: string;
  gennum: string;
  precision: string;
  multiplier: string;
  boardlotsize: string;
  buyqty: string;
  sellqty: string;
  buyamount: string;
  sellamount: string;
  transactiontype: string;
  quantity: number;
  type: string;
}

export interface ConvertPositionResponse {
  status: boolean;
  message: string;
  errorcode: string;
  data: null;
}

