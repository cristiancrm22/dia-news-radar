
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import NewsService from "@/services/NewsService";
import { EmailConfig as EmailConfigType } from "@/types/news";
import { X } from "lucide-react";

const EmailConfig = () => {
  const [config, setConfig] = useState<EmailConfigType>({
    enabled: false,
    email: "",
    frequency: "daily",
    time: "08:00",
    keywords: []
  });
  
  const [newKeyword, setNewKeyword] = useState("");

  useEffect(() => {
    // Cargar configuración
    const savedConfig = NewsService.getEmailConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    }
  }, []);

  const handleConfigChange = (updatedConfig: Partial<EmailConfigType>) => {
    const newConfig = { ...config, ...updatedConfig };
    setConfig(newConfig);
    NewsService.updateEmailConfig(newConfig);
    
    toast({
      title: "Configuración actualizada",
      description: "Se guardó la configuración de correos electrónicos"
    });
  };

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    
    if (!config.keywords.includes(newKeyword.trim())) {
      const updatedKeywords = [...config.keywords, newKeyword.trim()];
      handleConfigChange({ keywords: updatedKeywords });
      setNewKeyword("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    const updatedKeywords = config.keywords.filter(k => k !== keyword);
    handleConfigChange({ keywords: updatedKeywords });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Correos</CardTitle>
        <CardDescription>
          Configure el envío automático de resúmenes de noticias por correo electrónico
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Label htmlFor="email-enabled" className="flex flex-col space-y-1">
            <span>Activar envío de correos</span>
            <span className="font-normal text-xs text-muted-foreground">
              Recibirá resúmenes de noticias en su correo electrónico
            </span>
          </Label>
          <Switch
            id="email-enabled"
            checked={config.enabled}
            onCheckedChange={(enabled) => handleConfigChange({ enabled })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-address">Correo electrónico</Label>
          <Input
            id="email-address"
            type="email"
            placeholder="correo@ejemplo.com"
            value={config.email}
            onChange={(e) => handleConfigChange({ email: e.target.value })}
            disabled={!config.enabled}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="frequency">Frecuencia</Label>
            <Select
              disabled={!config.enabled}
              value={config.frequency}
              onValueChange={(frequency: "daily" | "weekly") => handleConfigChange({ frequency })}
            >
              <SelectTrigger id="frequency">
                <SelectValue placeholder="Seleccione frecuencia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diario</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Hora de envío</Label>
            <Input
              id="time"
              type="time"
              value={config.time}
              onChange={(e) => handleConfigChange({ time: e.target.value })}
              disabled={!config.enabled}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="keywords">Palabras clave para monitorear</Label>
          <form onSubmit={handleAddKeyword} className="flex gap-2">
            <Input
              id="keywords"
              placeholder="Agregar palabra clave"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              disabled={!config.enabled}
              className="flex-grow"
            />
            <Button 
              type="submit" 
              disabled={!config.enabled || !newKeyword.trim()}
            >
              Agregar
            </Button>
          </form>
        </div>

        {config.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {config.keywords.map((keyword, idx) => (
              <Badge key={idx} variant="secondary" className="px-2 py-1 flex items-center gap-1">
                {keyword}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleRemoveKeyword(keyword)}
                />
              </Badge>
            ))}
          </div>
        )}

        {config.lastSent && (
          <p className="text-sm text-muted-foreground">
            Último envío: {new Date(config.lastSent).toLocaleString('es-ES')}
          </p>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => {
            setConfig({
              enabled: false,
              email: "",
              frequency: "daily",
              time: "08:00",
              keywords: []
            });
            NewsService.updateEmailConfig({
              enabled: false,
              email: "",
              frequency: "daily",
              time: "08:00",
              keywords: []
            });
            toast({
              title: "Configuración reiniciada",
              description: "Se restableció la configuración por defecto"
            });
          }}
        >
          Restablecer
        </Button>

        <Button 
          onClick={() => {
            NewsService.testEmailService(config.email)
              .then(success => {
                if (success) {
                  toast({
                    title: "Correo enviado",
                    description: `Se ha enviado un correo de prueba a ${config.email}`
                  });
                } else {
                  toast({
                    title: "Error",
                    description: "No se pudo enviar el correo de prueba",
                    variant: "destructive"
                  });
                }
              })
              .catch(() => {
                toast({
                  title: "Error",
                  description: "No se pudo enviar el correo de prueba",
                  variant: "destructive"
                });
              });
          }}
          disabled={!config.enabled || !config.email}
        >
          Enviar correo de prueba
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EmailConfig;
