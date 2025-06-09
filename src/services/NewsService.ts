import { supabase } from "@/integrations/supabase/client";
import { NewsItem, NewsSource, WhatsAppConfig, EmailConfig, SearchSettings } from "@/types/news";
import { DatabaseService } from "./DatabaseService";
import PythonNewsAdapter from "./PythonNewsAdapter";

class NewsService {
  private static async _getNewsFromSources(
    keywords: string[],
    sources: NewsSource[],
    includeTwitter: boolean,
    maxResults: number,
    validateLinks: boolean,
    currentDateOnly: boolean,
    deepScrape: boolean,
    twitterUsers: string[],
    pythonExecutable?: string
  ): Promise<NewsItem[]> {
    let allNews: NewsItem[] = [];

    // Fetch news from Python script
    try {
      const pythonNews = await PythonNewsAdapter.fetchNewsFromPythonScript({
        keywords: keywords,
        sources: sources.map((s) => s.url),
        includeTwitter: includeTwitter,
        maxResults: maxResults,
        validateLinks: validateLinks,
        currentDateOnly: currentDateOnly,
        deepScrape: deepScrape,
        twitterUsers: twitterUsers,
        pythonExecutable: pythonExecutable
      });
      allNews = allNews.concat(pythonNews);
    } catch (error) {
      console.error("Error fetching news from Python script:", error);
    }

    return allNews;
  }

  private static async _searchNews(
    keywords: string[],
    sources: NewsSource[],
    includeTwitter: boolean,
    maxResults: number,
    validateLinks: boolean,
    currentDateOnly: boolean,
    deepScrape: boolean,
    twitterUsers: string[],
    pythonExecutable?: string
  ): Promise<NewsItem[]> {
    let allNews: NewsItem[] = [];

    // Fetch news from Python script
    try {
      const pythonNews = await PythonNewsAdapter.fetchNewsFromPythonScript({
        keywords: keywords,
        sources: sources.map((s) => s.url),
        includeTwitter: includeTwitter,
        maxResults: maxResults,
        validateLinks: validateLinks,
        currentDateOnly: currentDateOnly,
        deepScrape: deepScrape,
        twitterUsers: twitterUsers,
        pythonExecutable: pythonExecutable
      });
      allNews = allNews.concat(pythonNews);
    } catch (error) {
      console.error("Error fetching news from Python script:", error);
    }

    return allNews;
  }

  static async getWhatsAppConfig(): Promise<WhatsAppConfig> {
    try {
      const config = await DatabaseService.getUserWhatsAppConfig();
      return {
        phoneNumber: config.phoneNumber || "",
        apiKey: config.apiKey,
        connectionMethod: config.connectionMethod || "official",
        evolutionApiUrl: config.evolutionApiUrl
      };
    } catch (error) {
      console.error("Error getting WhatsApp config:", error);
      return {
        phoneNumber: "",
        connectionMethod: "official"
      };
    }
  }

  static async getEmailConfig(): Promise<EmailConfig> {
    try {
      const config = await DatabaseService.getUserEmailConfig();
      return {
        enabled: config.enabled || false,
        email: config.email || "",
        frequency: config.frequency || "daily",
        time: config.time || "09:00",
        keywords: config.keywords || [],
        lastSent: config.lastSent,
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpUsername: config.smtpUsername,
        smtpPassword: config.smtpPassword,
        useTLS: config.useTLS,
      };
    } catch (error) {
      console.error("Error getting email config:", error);
      return {
        enabled: false,
        email: "",
        frequency: "daily",
        time: "09:00",
        keywords: [],
      };
    }
  }

  static async getSources(): Promise<NewsSource[]> {
    try {
      return await DatabaseService.getNewsSources();
    } catch (error) {
      console.error("Error getting sources:", error);
      return [];
    }
  }

  static async getKeywords(): Promise<string[]> {
    try {
      return await DatabaseService.getSearchKeywords();
    } catch (error) {
      console.error("Error getting keywords:", error);
      return [];
    }
  }

  static async getTwitterUsers(): Promise<string[]> {
    try {
      return await DatabaseService.getTwitterUsers();
    } catch (error) {
      console.error("Error getting Twitter users:", error);
      return [];
    }
  }

  static async getSearchSettings(): Promise<SearchSettings> {
    try {
      const settings = await DatabaseService.getSearchSettings();
      return {
        maxResults: settings.maxResults,
        includeTwitter: settings.includeTwitter,
        keywords: settings.keywords || [],
        validateLinks: settings.validateLinks,
        currentDateOnly: settings.currentDateOnly,
        searchHistory: settings.searchHistory,
        deepScrape: settings.deepScrape,
        twitterUsers: settings.twitterUsers || [],
        pythonScriptPath: settings.pythonScriptPath,
        pythonExecutable: settings.pythonExecutable
      };
    } catch (error) {
      console.error("Error getting search settings:", error);
      return {
        keywords: [],
      };
    }
  }

  static async updateSources(sources: NewsSource[]) {
    try {
      await DatabaseService.updateNewsSources(sources);
    } catch (error) {
      console.error("Error updating sources:", error);
    }
  }

  static async updateKeywords(keywords: string[]) {
    try {
      await DatabaseService.updateSearchKeywords(keywords);
    } catch (error) {
      console.error("Error updating keywords:", error);
    }
  }

  static async updateTwitterUsers(twitterUsers: string[]) {
    try {
      await DatabaseService.updateTwitterUsers(twitterUsers);
    } catch (error) {
      console.error("Error updating Twitter users:", error);
    }
  }

  static async updateSearchSettings(settings: SearchSettings) {
    try {
      await DatabaseService.updateSearchSettings(settings);
    } catch (error) {
      console.error("Error updating search settings:", error);
    }
  }

  static async updateWhatsAppConfig(config: WhatsAppConfig) {
    try {
      await DatabaseService.updateUserWhatsAppConfig(config);
    } catch (error) {
      console.error("Error updating WhatsApp config:", error);
    }
  }

  static async updateEmailConfig(config: EmailConfig) {
    try {
      await DatabaseService.updateUserEmailConfig(config);
    } catch (error) {
      console.error("Error updating email config:", error);
    }
  }

  static async getNews(): Promise<NewsItem[]> {
    try {
      const searchSettings = await this.getSearchSettings();
      const sources = await this.getSources();

      return await this._getNewsFromSources(
        searchSettings.keywords,
        sources,
        searchSettings.includeTwitter || false,
        searchSettings.maxResults || 10,
        searchSettings.validateLinks || false,
        searchSettings.currentDateOnly || false,
        searchSettings.deepScrape || false,
        searchSettings.twitterUsers || [],
        searchSettings.pythonExecutable
      );
    } catch (error) {
      console.error("Error getting news:", error);
      return [];
    }
  }

  static async searchNews(
    keywords: string[],
    searchAllSources: boolean = false
  ): Promise<NewsItem[]> {
    try {
      const searchSettings = await this.getSearchSettings();
      const sources = searchAllSources ? await this.getSources() : [];

      return await this._searchNews(
        keywords,
        sources,
        searchSettings.includeTwitter || false,
        searchSettings.maxResults || 10,
        searchSettings.validateLinks || false,
        searchSettings.currentDateOnly || false,
        searchSettings.deepScrape || false,
        searchSettings.twitterUsers || [],
        searchSettings.pythonExecutable
      );
    } catch (error) {
      console.error("Error searching news:", error);
      return [];
    }
  }

  static async testWhatsApp(phoneNumber: string, message: string) {
    try {
      const config = await this.getWhatsAppConfig();
      
      const WhatsAppService = (await import('./WhatsAppService')).WhatsAppService;
      return await WhatsAppService.sendMessage(config, phoneNumber, message);
    } catch (error) {
      console.error("Error testing WhatsApp:", error);
      return { success: false, error: error.message };
    }
  }

  static async sendEmail(emailConfig: EmailConfig, subject: string, html: string) {
    try {
      const PythonNewsAdapter = (await import('./PythonNewsAdapter')).default;
      return await PythonNewsAdapter.sendEmailViaPython({
        smtpHost: emailConfig.smtpHost || "",
        smtpPort: emailConfig.smtpPort || 587,
        smtpUsername: emailConfig.smtpUsername || "",
        smtpPassword: emailConfig.smtpPassword || "",
        to: emailConfig.email,
        subject: subject,
        html: html,
        useTLS: emailConfig.useTLS || false
      });
    } catch (error) {
      console.error("Error sending email:", error);
      return { success: false, error: error.message };
    }
  }

  static async testEmail(emailConfig: EmailConfig) {
    try {
      const PythonNewsAdapter = (await import('./PythonNewsAdapter')).default;
      return await PythonNewsAdapter.sendEmailViaPython({
        smtpHost: emailConfig.smtpHost || "",
        smtpPort: emailConfig.smtpPort || 587,
        smtpUsername: emailConfig.smtpUsername || "",
        smtpPassword: emailConfig.smtpPassword || "",
        to: emailConfig.email,
        subject: "Test Email",
        html: "<h1>Test Email</h1><p>This is a test email from NewsRadar.</p>",
        useTLS: emailConfig.useTLS || false
      });
    } catch (error) {
      console.error("Error testing email:", error);
      return { success: false, error: error.message };
    }
  }

  static async validateEmailSettings(emailConfig: EmailConfig) {
    if (!emailConfig.smtpHost) {
      return { success: false, error: "SMTP Host is required" };
    }
    if (!emailConfig.smtpPort) {
      return { success: false, error: "SMTP Port is required" };
    }
    if (!emailConfig.smtpUsername) {
      return { success: false, error: "SMTP Username is required" };
    }
    if (!emailConfig.smtpPassword) {
      return { success: false, error: "SMTP Password is required" };
    }
    if (!emailConfig.email) {
      return { success: false, error: "Email is required" };
    }
    return { success: true };
  }

  static async getDefaultWhatsAppConfig(): Promise<WhatsAppConfig> {
    return {
      phoneNumber: "",
      apiKey: "",
      connectionMethod: "official",
      evolutionApiUrl: ""
    };
  }

  static async getDefaultEmailConfig(): Promise<EmailConfig> {
    return {
      enabled: false,
      email: "",
      frequency: "daily",
      time: "09:00",
      keywords: [],
    };
  }
}

export default NewsService;
