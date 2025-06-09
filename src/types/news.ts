
export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  sourceUrl: string;
  sourceName: string;
  imageUrl?: string;
  topics?: string[];
  linkValid?: boolean;
}

export interface NewsSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  logo?: string;
}

export interface WhatsAppConfig {
  phoneNumber: string;
  apiKey?: string;
  connectionMethod: "official" | "evolution" | "businesscloud";
  evolutionApiUrl?: string;
  enabled?: boolean; // Added enabled property
}

export interface EmailConfig {
  enabled: boolean;
  email: string;
  frequency: "daily" | "weekly";
  time: string;
  keywords: string[];
  lastSent?: string;
  // SMTP Configuration
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  useTLS?: boolean;
}

export interface SearchSettings {
  maxResults?: number;
  includeTwitter?: boolean;
  keywords: string[];
  validateLinks?: boolean;
  currentDateOnly?: boolean;
  searchHistory?: string[];
  deepScrape?: boolean; // Enable deep scraping of internal pages
  twitterUsers?: string[]; // Add Twitter users to monitor
  pythonScriptPath?: string; // Path to Python script
  pythonExecutable?: string; // Python executable (python or python3)
}

export interface NewsFeedResponse {
  status: string;
  articles: NewsItem[];
}

// Python script response structure - updated to match the exact format from the script
export interface PythonScriptNews {
  titulo: string;
  fecha: string;
  url: string;
  resumen: string;
  linkValido?: boolean;
}

export interface PythonScriptResponse {
  status: string;
  data: PythonScriptNews[];
  error?: string;
  csvPath?: string; // Path to the generated CSV file
  output?: string[]; // Terminal output from the script
}

// Python script execution status
export interface PythonScriptExecutionStatus {
  running: boolean;
  completed: boolean;
  progress: number;
  error?: string;
  csvPath?: string;
  startTime?: Date;
  endTime?: Date;
  output: string[]; // Terminal output from the Python script
}

// Python script execution parameters
export interface PythonScriptParams {
  keywords: string[];
  sources: string[];
  twitterUsers: string[];
  outputPath?: string;
  maxWorkers?: number;
  validateLinks?: boolean;
  currentDateOnly?: boolean;
  pythonExecutable?: string; // Added missing property
}

// Python script execution API response
export interface PythonScriptExecutionResponse {
  status: string;
  pid?: number;
  output?: string[];
  error?: string;
  csvPath?: string;
}

// WhatsApp subscription interface
export interface WhatsAppSubscription {
  id: string;
  user_id: string;
  phone_number: string;
  frequency: 'daily' | 'weekly' | 'hourly';
  time: string;
  keywords: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}
