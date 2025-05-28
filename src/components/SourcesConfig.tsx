import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { NewsSource } from "@/types/news";
import NewsService from "@/services/NewsService";

const SourcesConfig = () => {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [newSource, setNewSource] = useState({ name: "", url: "" });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Load sources on component mount
    const loadSources = async () => {
      try {
        const loadedSources = await NewsService.getSources();
        setSources(loadedSources);
      } catch (error) {
        console.error("Error loading sources:", error);
        toast.error("Error al cargar las fuentes");
      } finally {
        setLoading(false);
      }
    };
    
    loadSources();
  }, []);

  const handleToggleSource = async (id: string) => {
    try {
      const updatedSources = sources.map(source => 
        source.id === id ? { ...source, enabled: !source.enabled } : source
      );
      setSources(updatedSources);
      await NewsService.updateSources(updatedSources);
      
      const source = updatedSources.find(s => s.id === id);
      toast.success(`${source?.name} ${source?.enabled ? 'activado' : 'desactivado'}`);
    } catch (error) {
      console.error("Error updating sources:", error);
      toast.error("Error al actualizar la fuente");
      // Revert the change
      const revertedSources = sources.map(source => 
        source.id === id ? { ...source, enabled: !source.enabled } : source
      );
      setSources(revertedSources);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newSource.name || !newSource.url) {
      toast.error("Por favor ingrese un nombre y URL para la fuente");
      return;
    }
    
    // Simple URL validation
    try {
      new URL(newSource.url);
    } catch (_) {
      toast.error("Por favor ingrese una URL válida");
      return;
    }
    
    try {
      const newSourceItem: NewsSource = {
        id: Date.now().toString(),
        name: newSource.name,
        url: newSource.url,
        enabled: true
      };
      
      const updatedSources = [...sources, newSourceItem];
      setSources(updatedSources);
      await NewsService.updateSources(updatedSources);
      setNewSource({ name: "", url: "" });
      
      toast.success(`${newSource.name} añadido como fuente`);
    } catch (error) {
      console.error("Error adding source:", error);
      toast.error("Error al añadir la fuente");
      // Remove the added source from state
      setSources(sources);
    }
  };

  const handleRemoveSource = async (id: string) => {
    try {
      const sourceToRemove = sources.find(s => s.id === id);
      const updatedSources = sources.filter(source => source.id !== id);
      
      setSources(updatedSources);
      await NewsService.updateSources(updatedSources);
      
      toast.success(`${sourceToRemove?.name} eliminado`);
    } catch (error) {
      console.error("Error removing source:", error);
      toast.error("Error al eliminar la fuente");
      // Keep the source in state
      setSources(sources);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Configuración de Fuentes</h2>
      <p className="text-gray-600 mb-6">
        Configura las fuentes de noticias que quieres monitorear
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Añadir nueva fuente</CardTitle>
          <CardDescription>
            Ingresa el nombre y la URL de la fuente que quieres agregar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddSource} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sourceName">Nombre de la fuente</Label>
                <Input
                  id="sourceName"
                  placeholder="El País, CNN, Twitter, etc."
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sourceUrl">URL de la fuente</Label>
                <Input
                  id="sourceUrl"
                  placeholder="https://www.example.com"
                  value={newSource.url}
                  onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit">Añadir fuente</Button>
          </form>
        </CardContent>
      </Card>

      <h3 className="text-xl font-semibold mb-4">Fuentes configuradas</h3>
      {sources.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No hay fuentes configuradas</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sources.map((source) => (
            <Card key={source.id} className="flex items-center p-4">
              <div className="flex-grow">
                <h4 className="font-medium">{source.name}</h4>
                <a 
                  href={source.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-blue-600 hover:underline"
                >
                  {source.url}
                </a>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`toggle-${source.id}`}
                    checked={source.enabled}
                    onCheckedChange={() => handleToggleSource(source.id)}
                  />
                  <Label htmlFor={`toggle-${source.id}`}>
                    {source.enabled ? "Activado" : "Desactivado"}
                  </Label>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleRemoveSource(source.id)}
                >
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SourcesConfig;
