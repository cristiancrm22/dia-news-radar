
export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  sourceUrl: string;
  sourceName: string;
  imageUrl?: string;
  topics: string[];
}

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  logo?: string;
}

export interface Topic {
  id: string;
  name: string;
  enabled: boolean;
}

export interface WhatsAppConfig {
  enabled: boolean;
  phoneNumber: string;
  apiKey?: string;
  connectionMethod: "official" | "evolution" | "businesscloud";
  evolutionApiUrl?: string;
}
