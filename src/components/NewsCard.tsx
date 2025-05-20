
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Globe } from "lucide-react";
import { NewsItem } from "@/types/news";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NewsCardProps {
  news: NewsItem;
}

const NewsCard = ({ news }: NewsCardProps) => {
  // Enhanced URL validation that better handles different URL formats
  const getValidUrl = (url: string): string => {
    if (!url || typeof url !== 'string') return '#';
    
    try {
      // Clean the URL and ensure it has a protocol
      let cleanUrl = url.trim();
      
      // Remove any text before the actual URL if it was embedded in text
      const urlMatches = cleanUrl.match(/(https?:\/\/[^\s]+)/);
      if (urlMatches && urlMatches[1]) {
        cleanUrl = urlMatches[1];
      }
      
      // Add https protocol if missing
      if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = 'https://' + cleanUrl;
      }
      
      // Validate URL
      const validatedUrl = new URL(cleanUrl).toString();
      return validatedUrl;
    } catch (error) {
      console.error(`Invalid URL: ${url}`, error);
      
      // Advanced fallback mechanism for improperly formatted URLs
      try {
        // Extract domain parts from malformed URL
        const domainMatch = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s]+\.[a-z]{2,})/i);
        if (domainMatch && domainMatch[0]) {
          const domain = domainMatch[0];
          return domain.startsWith('http') ? domain : 'https://' + domain;
        }
        
        // If we can identify a common news domain in the string, use that
        const commonDomains = [
          'clarin.com', 'lanacion.com.ar', 'infobae.com', 'pagina12.com.ar', 
          'ambito.com', 'perfil.com', 'cronista.com', 'telam.com.ar'
        ];
        
        for (const domain of commonDomains) {
          if (url.includes(domain)) {
            return `https://www.${domain}`;
          }
        }
      } catch (e) { /* Silent fallback failure */ }
      
      // Last resort - search for the title
      return `https://www.google.com/search?q=${encodeURIComponent(news.title)}`;
    }
  };

  // Format the date in a more readable way
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString; // Return original if parsing fails
    }
  };

  const validUrl = getValidUrl(news.sourceUrl);
  const isValidUrl = validUrl !== '#' && !validUrl.startsWith('https://www.google.com/search');

  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start mb-2">
          <div className="text-sm text-muted-foreground">
            {formatDate(news.date)}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="flex items-center">
                  <Globe className="h-3 w-3 mr-1" />
                  {news.sourceName}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{new URL(validUrl).hostname}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardTitle className="text-lg line-clamp-2">{news.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <CardDescription className="line-clamp-3">{news.summary}</CardDescription>
        {news.topics && news.topics.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {news.topics.slice(0, 3).map((topic, idx) => (
              <Badge key={`${topic}-${idx}`} variant="secondary" className="text-xs">
                {topic}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <a 
          href={validUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full"
        >
          <Button variant="outline" className={`w-full ${!isValidUrl ? 'text-muted-foreground' : ''}`}>
            <ExternalLink className="h-4 w-4 mr-2" />
            {isValidUrl ? 'Ver noticia original' : 'Buscar noticia en Google'}
          </Button>
        </a>
      </CardFooter>
    </Card>
  );
};

export default NewsCard;
