
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, Globe } from "lucide-react";
import { NewsItem } from "@/types/news";

interface NewsCardProps {
  news: NewsItem;
}

const NewsCard = ({ news }: NewsCardProps) => {
  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start mb-2">
          <div className="text-sm text-muted-foreground">
            {new Date(news.date).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })}
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
        {news.topics.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {news.topics.slice(0, 3).map((topic) => (
              <Badge key={topic} variant="secondary" className="text-xs">
                {topic}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <a 
          href={news.sourceUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full"
        >
          <Button variant="outline" className="w-full">
            <Link className="h-4 w-4 mr-2" />
            Ver noticia original
          </Button>
        </a>
      </CardFooter>
    </Card>
  );
};

export default NewsCard;
