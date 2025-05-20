
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, Globe, ExternalLink } from "lucide-react";
import { NewsItem } from "@/types/news";

interface NewsCardProps {
  news: NewsItem;
}

const NewsCard = ({ news }: NewsCardProps) => {
  // Ensure URL has proper format with more robust validation
  const getValidUrl = (url: string): string => {
    if (!url || typeof url !== 'string') return '#';
    
    try {
      // Check if URL already has http/https
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      
      // Use URL constructor to validate
      const validatedUrl = new URL(url).toString();
      return validatedUrl;
    } catch (error) {
      console.error(`Invalid URL: ${url}`, error);
      
      // Try to extract domain from malformed URL as fallback
      try {
        // Simple regex to try to extract domain from malformed URL
        const domainMatch = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s]+\.\w+)/i);
        if (domainMatch && domainMatch[0]) {
          return 'https://' + domainMatch[0];
        }
      } catch (e) { /* Silently fail fallback attempt */ }
      
      // If all fails, return a safe default
      return 'https://www.google.com/search?q=' + encodeURIComponent(news.title);
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

  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start mb-2">
          <div className="text-sm text-muted-foreground">
            {formatDate(news.date)}
          </div>
          <Badge variant="outline" className="flex items-center">
            <Globe className="h-3 w-3 mr-1" />
            {news.sourceName}
          </Badge>
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
          href={getValidUrl(news.sourceUrl)} 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full"
        >
          <Button variant="outline" className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver noticia original
          </Button>
        </a>
      </CardFooter>
    </Card>
  );
};

export default NewsCard;
