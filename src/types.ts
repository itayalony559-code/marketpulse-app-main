export type Sector =
  | 'Technology'
  | 'Financials'
  | 'Healthcare'
  | 'Energy'
  | 'Consumer'
  | 'Communication'
  | 'Industrials'
  | 'Materials'
  | 'Utilities'
  | 'Real Estate';

export type Exchange =
  | 'NASDAQ'
  | 'NYSE'
  | 'LSE'
  | 'TSE'
  | 'HKEX'
  | 'Euronext'
  | 'DAX'
  | 'SIX'
  | 'ASX'
  | 'TSX'
  | 'BSE'
  | 'KRX'
  | 'NSE'
  | 'SSE'
  | 'SZSE'
  | 'BME'
  | 'BMV'
  | 'B3'
  | 'JSE'
  | 'SGX'
  | 'TWSE'
  | 'OMX'
  | 'BIST'
  | 'TELAVIV';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'HKD' | 'INR' | 'KRW' | 'CHF' | 'AUD' | 'CAD' | 'CNY' | 'BRL' | 'MXN' | 'ZAR' | 'SGD' | 'TWD' | 'SEK' | 'TRY' | 'ILS';

export type QuarterlyEarnings = {
  quarter: string;
  epsActual: number;
  epsEstimate: number;
  revenueActual: number;
  revenueEstimate: number;
};

export type Asset = {
  symbol: string;
  name: string;
  sector: Sector;
  exchange: Exchange;
  currency: Currency;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  preMarketPrice: number;
  preMarketChangePercent: number;
  afterHoursPrice: number;
  afterHoursChangePercent: number;
  volume: number;
  marketCap: number;
  high?: number;
  low?: number;
  sparkline: number[];
  earnings: QuarterlyEarnings[];
};

export type MarketIndex = {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  sparkline: number[];
};

export type NewsSentiment = 'positive' | 'negative' | 'neutral';

export type NewsArticle = {
  id: string;
  headline: string;
  summary: string;
  body: string[];
  source: string;
  publishedAt: string;
  minutesAgo: number;
  tickers: string[];
  premium: boolean;
  category: 'Markets' | 'Technology' | 'Earnings' | 'Economy' | 'Crypto';
  sentiment: NewsSentiment;
};

export type ChartPoint = {
  time: string;
  price: number;
};

export type ChartRange = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y';

export type MarketSession = 'PRE-MARKET' | 'OPEN' | 'AFTER-HOURS' | 'CLOSED';

export type SubscriptionContextType = {
  isPremium: boolean;
  activatePremium: (email?: string) => Promise<void>;
  resetPremium: () => void;
};
