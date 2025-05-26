
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Globe, Calendar } from "lucide-react";
import { NewsItem } from "@/types/news";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type NewsCardProps = {
  news: NewsItem;
};

export default function NewsCard({ news }: NewsCardProps) {
  const handleOpenNews = () => {
    if (news.sourceUrl) {
      window.open(news.sourceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg leading-tight cursor-pointer hover:text-blue-600" onClick={handleOpenNews}>
          {news.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-gray-700 mb-4 text-sm leading-relaxed">
          {news.summary || "Sin resumen disponible"}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <Calendar className="w-3 h-3" />
          <span>{news.date}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Globe className="w-3 h-3 text-gray-400" />
          <span className="text-gray-500">{news.sourceName}</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-4">
        <Badge variant="outline" className="text-xs">
          {news.sourceName}
        </Badge>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleOpenNews}
          className="flex items-center gap-1 text-xs"
        >
          Ver noticia
          <ExternalLink className="w-3 h-3" />
        </Button>
      </CardFooter>
    </Card>
  );
}
