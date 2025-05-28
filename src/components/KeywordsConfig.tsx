
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { DatabaseService } from "@/services/DatabaseService";
import { useAuth } from "@/hooks/useAuth";

const KeywordsConfig = () => {
  const { user } = useAuth();
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const loadKeywords = async () => {
      try {
        setLoading(true);
        const userKeywords = await DatabaseService.getUserKeywords();
        setKeywords(userKeywords);
      } catch (error) {
        console.error("Error loading keywords:", error);
        toast({
          title: "Error",
          description: "Error al cargar las palabras clave",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadKeywords();
  }, [user]);

  const addKeyword = async () => {
    if (!newKeyword.trim() || keywords.includes(newKeyword.trim()) || isSubmitting) {
      return;
    }

    const newKeywordTrimmed = newKeyword.trim();
    
    try {
      setIsSubmitting(true);
      await DatabaseService.addUserKeyword(newKeywordTrimmed);
      
      setKeywords(prev => [...prev, newKeywordTrimmed]);
      setNewKeyword("");
      
      toast({
        title: "Palabra clave agregada",
        description: `Se agregó "${newKeywordTrimmed}" a las palabras clave de monitoreo.`,
      });
    } catch (error) {
      console.error("Error adding keyword:", error);
      toast({
        title: "Error",
        description: "Error al agregar la palabra clave",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeKeyword = async (keywordToRemove: string) => {
    try {
      await DatabaseService.removeUserKeyword(keywordToRemove);
      
      setKeywords(prev => prev.filter(k => k !== keywordToRemove));
      
      toast({
        title: "Palabra clave eliminada",
        description: `Se eliminó "${keywordToRemove}" de las palabras clave de monitoreo.`,
      });
    } catch (error) {
      console.error("Error removing keyword:", error);
      toast({
        title: "Error",
        description: "Error al eliminar la palabra clave",
        variant: "destructive"
      });
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Debes iniciar sesión para gestionar las palabras clave.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Palabras Clave para Monitoreo</h2>
        <p className="text-gray-600">
          Configura las palabras clave que el Radar de Noticias monitoreará automáticamente
        </p>
        
        <div className="border rounded-lg p-6 bg-card">
          <div className="space-y-4">
            <Label htmlFor="keywords">Palabras clave actuales</Label>
            {keywords.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-4">
                {keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary" className="flex items-center gap-1 py-2">
                    {keyword}
                    <button 
                      type="button" 
                      onClick={() => removeKeyword(keyword)}
                      className="text-xs hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 mb-4">No hay palabras clave configuradas.</p>
            )}
            
            <div className="flex gap-2">
              <Input
                id="keywords"
                placeholder="Agregar palabra clave..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="flex-grow"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
                disabled={isSubmitting}
              />
              <Button 
                onClick={addKeyword} 
                variant="default" 
                disabled={!newKeyword.trim() || keywords.includes(newKeyword.trim()) || isSubmitting}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isSubmitting ? "Agregando..." : "Agregar"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeywordsConfig;
