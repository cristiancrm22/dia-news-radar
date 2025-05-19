
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Topic } from "@/types/news";
import NewsService from "@/services/NewsService";

const TopicsConfig = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [newTopic, setNewTopic] = useState("");
  
  useEffect(() => {
    // Load topics on component mount
    setTopics(NewsService.getTopics());
  }, []);

  const handleToggleTopic = (id: string) => {
    const updatedTopics = topics.map(topic => 
      topic.id === id ? { ...topic, enabled: !topic.enabled } : topic
    );
    setTopics(updatedTopics);
    NewsService.updateTopics(updatedTopics);
    
    const topic = updatedTopics.find(t => t.id === id);
    toast.success(`Tema "${topic?.name}" ${topic?.enabled ? 'activado' : 'desactivado'}`);
  };

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTopic.trim()) {
      toast.error("Por favor ingrese un nombre para el tema");
      return;
    }
    
    // Check if topic already exists
    if (topics.some(topic => topic.name.toLowerCase() === newTopic.toLowerCase())) {
      toast.error("Este tema ya existe");
      return;
    }
    
    const newTopicItem: Topic = {
      id: Date.now().toString(),
      name: newTopic.trim(),
      enabled: true
    };
    
    const updatedTopics = [...topics, newTopicItem];
    setTopics(updatedTopics);
    NewsService.updateTopics(updatedTopics);
    setNewTopic("");
    
    toast.success(`Tema "${newTopic}" añadido`);
  };

  const handleRemoveTopic = (id: string) => {
    const topicToRemove = topics.find(t => t.id === id);
    const updatedTopics = topics.filter(topic => topic.id !== id);
    
    setTopics(updatedTopics);
    NewsService.updateTopics(updatedTopics);
    
    toast.success(`Tema "${topicToRemove?.name}" eliminado`);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Configuración de Temas</h2>
      <p className="text-gray-600 mb-6">
        Configura los temas que quieres monitorear en las noticias
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Añadir nuevo tema</CardTitle>
          <CardDescription>
            Ingresa los temas que te interesan para buscar noticias relacionadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTopic} className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-grow space-y-2">
                <Label htmlFor="topicName">Nombre del tema</Label>
                <Input
                  id="topicName"
                  placeholder="Política, Deportes, Tecnología, etc."
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                />
              </div>
              <div className="self-end">
                <Button type="submit">Añadir tema</Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <h3 className="text-xl font-semibold mb-4">Temas configurados</h3>
      {topics.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No hay temas configurados</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map((topic) => (
            <Card key={topic.id} className="flex items-center p-4">
              <div className="flex-grow">
                <h4 className="font-medium">{topic.name}</h4>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`toggle-${topic.id}`}
                    checked={topic.enabled}
                    onCheckedChange={() => handleToggleTopic(topic.id)}
                  />
                  <Label htmlFor={`toggle-${topic.id}`} className="sr-only">
                    {topic.enabled ? "Activado" : "Desactivado"}
                  </Label>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleRemoveTopic(topic.id)}
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

export default TopicsConfig;
