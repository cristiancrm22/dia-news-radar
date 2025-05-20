
export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  sourceUrl: string;
  sourceName: string;
  imageUrl?: string;
  topics: string[];
  linkValid?: boolean; // Indica si el enlace ha sido validado
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

export interface EmailConfig {
  enabled: boolean;
  email: string;
  frequency: "daily" | "weekly";
  time: string;
  keywords: string[];
  lastSent?: string;
}

export interface SearchSettings {
  maxResults: number;
  includeTwitter: boolean;
  keywords: string[];
  validateLinks?: boolean; // Validar que los enlaces sean válidos
  currentDateOnly?: boolean; // Solo noticias del día actual
}

export interface NewsFeedResponse {
  status: string;
  articles: NewsItem[];
}

// Python script response structure
export interface PythonScriptNews {
  titulo: string;
  fecha: string;
  url: string;
  resumen: string;
  linkValido?: boolean; // Indicar si el enlace es válido
}

export interface PythonScriptResponse {
  status: string;
  data: PythonScriptNews[];
  error?: string;
}
