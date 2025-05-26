import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Globe } from "lucide-react";
import { NewsItem } from "@/types/news";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type NewsCardProps = {
  news: {
    title: string;
    description: string;
    url: string;
    date: string;
  };
};

export default function NewsCard({ news }: NewsCardProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-lg">{news.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 mb-2">{news.description}</p>
        <div className="flex items-center gap-2 mt-2">
          <Globe className="w-4 h-4 text-gray-400" />
          <a
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline break-all flex items-center gap-1"
          >
            {news.url}
            <ExternalLink className="w-3 h-3 inline" />
          </a>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <Badge variant="outline">{news.date}</Badge>
      </CardFooter>
    </Card>
  );
}
