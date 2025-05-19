import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { MessageCircle } from "lucide-react";
import NewsService from "@/services/NewsService";
import { WhatsAppConfig as WhatsAppConfigType } from "@/types/news";

const WhatsAppConfig = () => {
  const [config, setConfig] = useState<WhatsAppConfigType>({
    enabled: false,
    phoneNumber: "",
    apiKey: "",
    connectionMethod: "official",
    evolutionApiUrl: ""
  });
  
  const [isTesting, setIsTesting] = useState(false);
  
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

  const handleSaveConfig = async (e: React.FormEvent) => {
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

    if (config.connectionMethod === "evolution" && !config.evolutionApiUrl) {
      toast.error("Por favor ingrese la URL de Evolution API");
      return;
    }
    
    // Test connection before saving if using Evolution API
    if (config.connectionMethod === "evolution") {
      try {
        const isConnected = await testEvolutionApiConnection(config.evolutionApiUrl, config.apiKey);
        if (!isConnected) {
          toast.error("No se pudo conectar a Evolution API. Verifique la URL y la API Key");
          return;
        }
      } catch (error) {
        toast.error("Error al conectar con Evolution API");
        console.error(error);
        return;
      }
    }
    
    NewsService.updateWhatsAppConfig(config);
    toast.success("Configuración de WhatsApp actualizada");
  };

  const testEvolutionApiConnection = async (url: string, apiKey?: string): Promise<boolean> => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      const response = await fetch(`${url.trim()}/api/status`, {
        method: 'GET',
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        return data && data.status === "success";
      }
      return false;
    } catch (error) {
      console.error("Error testing Evolution API connection:", error);
      return false;
    }
  };

  const handleTestWhatsApp = async () => {
    if (!config.enabled) {
      toast.error("La integración con WhatsApp está desactivada");
      return;
    }
    
    if (!config.phoneNumber) {
      toast.error("Por favor configure un número de teléfono");
      return;
    }

    setIsTesting(true);
    
    try {
      // Attempt to send a test message
      const testMessage = "Este es un mensaje de prueba del Radar de Noticias.";
      
      if (config.connectionMethod === "evolution") {
        if (!config.evolutionApiUrl) {
          toast.error("URL de Evolution API no configurada");
          setIsTesting(false);
          return;
        }
        
        const success = await sendTestMessageViaEvolutionApi(testMessage);
        if (success) {
          toast.success("Mensaje de prueba enviado correctamente a través de Evolution API");
        } else {
          toast.error("Error al enviar mensaje de prueba a través de Evolution API");
        }
      } else {
        // Send via official WhatsApp API
        const success = await NewsService.sendWhatsAppMessage(config.phoneNumber, testMessage);
        if (success) {
          toast.success("Mensaje de prueba enviado a WhatsApp");
        } else {
          toast.error("Error al enviar mensaje de prueba a WhatsApp");
        }
      }
    } catch (error) {
      console.error("Error testing WhatsApp connection:", error);
      toast.error("Error al probar la conexión con WhatsApp");
    } finally {
      setIsTesting(false);
    }
  };
  
  const sendTestMessageViaEvolutionApi = async (message: string): Promise<boolean> => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }
      
      const response = await fetch(`${config.evolutionApiUrl.trim()}/message/sendText/${config.phoneNumber}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          number: config.phoneNumber.replace('+', ''),
          textMessage: message
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data && data.status === "success";
      }
      return false;
    } catch (error) {
      console.error("Error sending test message via Evolution API:", error);
      return false;
    }
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
              <Label htmlFor="connectionMethod">Método de conexión</Label>
              <Select
                value={config.connectionMethod}
                onValueChange={(value) => setConfig({ ...config, connectionMethod: value })}
                disabled={!config.enabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar método de conexión" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="official">API Oficial de WhatsApp Business</SelectItem>
                  <SelectItem value="evolution">Evolution API</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Elige el método para conectar con WhatsApp
              </p>
            </div>
            
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
            
            {config.connectionMethod === "evolution" && (
              <div className="space-y-2">
                <Label htmlFor="evolutionApiUrl">URL de Evolution API</Label>
                <Input
                  id="evolutionApiUrl"
                  placeholder="https://tu-servidor-evolution-api.com"
                  value={config.evolutionApiUrl || ""}
                  onChange={(e) => setConfig({ ...config, evolutionApiUrl: e.target.value })}
                  disabled={!config.enabled || config.connectionMethod !== "evolution"}
                />
                <p className="text-sm text-gray-500">
                  URL completa donde tienes instalado Evolution API
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="apiKey">
                {config.connectionMethod === "evolution" ? "API Key de Evolution API" : "API Key de WhatsApp Business"}
              </Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={`Ingresa tu API Key de ${config.connectionMethod === "evolution" ? "Evolution API" : "WhatsApp Business"}`}
                value={config.apiKey || ""}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                disabled={!config.enabled}
              />
              <p className="text-sm text-gray-500">
                {config.connectionMethod === "evolution" 
                  ? "API Key para autenticación con Evolution API (opcional según configuración)"
                  : "Necesario para usar la API oficial de WhatsApp Business"
                }
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
                disabled={!config.enabled || !config.phoneNumber || isTesting}
                onClick={handleTestWhatsApp}
                className="flex items-center"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                {isTesting ? "Enviando..." : "Probar conexión"}
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
              <li>Para limitar la búsqueda a una fuente específica, envía <strong>"noticias: [tema] de [fuente]"</strong> (ej: "noticias: economía de El País").</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppConfig;
