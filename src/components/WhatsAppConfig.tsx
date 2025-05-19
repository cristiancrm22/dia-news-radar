import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { MessageCircle } from "lucide-react";
import NewsService from "@/services/NewsService";
import { WhatsAppConfig as WhatsAppConfigType } from "@/types/news";

const WhatsAppConfig = () => {
  const [config, setConfig] = useState<WhatsAppConfigType>({
    enabled: false,
    phoneNumber: "",
    apiKey: ""
  });
  
  useEffect(() => {
    // Load WhatsApp config on component mount
    const savedConfig = NewsService.getWhatsAppConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    }
  }, []);

  const handleToggleWhatsApp = () => {
    const updatedConfig = { ...config, enabled: !config.enabled };
    setConfig(updatedConfig);
    NewsService.updateWhatsAppConfig(updatedConfig);
    
    toast.success(`Integración con WhatsApp ${updatedConfig.enabled ? 'activada' : 'desactivada'}`);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!config.phoneNumber) {
      toast.error("Por favor ingrese un número de teléfono");
      return;
    }
    
    // Simple phone number validation
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(config.phoneNumber)) {
      toast.error("Por favor ingrese un número de teléfono válido");
      return;
    }
    
    NewsService.updateWhatsAppConfig(config);
    toast.success("Configuración de WhatsApp actualizada");
  };

  const handleTestWhatsApp = () => {
    if (!config.enabled) {
      toast.error("La integración con WhatsApp está desactivada");
      return;
    }
    
    if (!config.phoneNumber) {
      toast.error("Por favor configure un número de teléfono");
      return;
    }
    
    toast.success("Mensaje de prueba enviado a WhatsApp");
    // In a real application, you would make an API call to send a test message
    console.log("Sending test message to WhatsApp", config);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Configuración de WhatsApp</h2>
      <p className="text-gray-600 mb-6">
        Configura la integración con WhatsApp para recibir y enviar noticias
      </p>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Integración con WhatsApp</CardTitle>
              <CardDescription>
                Activa la integración para recibir noticias por WhatsApp
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="whatsapp-toggle"
                checked={config.enabled}
                onCheckedChange={handleToggleWhatsApp}
              />
              <Label htmlFor="whatsapp-toggle">
                {config.enabled ? "Activado" : "Desactivado"}
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Número de WhatsApp</Label>
              <Input
                id="phoneNumber"
                placeholder="+34612345678"
                value={config.phoneNumber}
                onChange={(e) => setConfig({ ...config, phoneNumber: e.target.value })}
                disabled={!config.enabled}
              />
              <p className="text-sm text-gray-500">
                Ingresa el número con el código de país (ej: +34 para España)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key de WhatsApp Business (opcional)</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Ingresa tu API Key de WhatsApp Business"
                value={config.apiKey || ""}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                disabled={!config.enabled}
              />
              <p className="text-sm text-gray-500">
                Solo es necesario si utilizas la API oficial de WhatsApp Business
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button 
                type="submit" 
                disabled={!config.enabled}
              >
                Guardar configuración
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                disabled={!config.enabled || !config.phoneNumber}
                onClick={handleTestWhatsApp}
                className="flex items-center"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Probar conexión
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instrucciones de uso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>Para recibir noticias por WhatsApp:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Asegúrate de que la integración esté activada y configurada correctamente.</li>
              <li>Envía un mensaje con la palabra <strong>"noticias"</strong> al número configurado para recibir las últimas noticias.</li>
              <li>Para buscar noticias sobre un tema específico, envía <strong>"noticias: [tema]"</strong> (ej: "noticias: tecnología").</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppConfig;
