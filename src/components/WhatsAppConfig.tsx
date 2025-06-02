// Corrigiendo el error TS2322
// Asegurarse de usar los tipos correctos para connectionMethod
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { WhatsAppConfig as WhatsAppConfigType } from "@/types/news";
import NewsService from "@/services/NewsService";
import { WhatsAppService } from "@/services/WhatsAppService";
import { useLogs } from "@/hooks/useLogs";
import LogViewer from "@/components/LogViewer";

const WhatsAppConfig = () => {
  const { logs, addLog, clearLogs } = useLogs();
  const [config, setConfig] = useState<WhatsAppConfigType>({
    enabled: false,
    phoneNumber: "",
    apiKey: "",
    connectionMethod: "official",
    evolutionApiUrl: ""
  });
  
  const [testMessage, setTestMessage] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Load config with proper async handling
    const loadConfig = async () => {
      try {
        const savedConfig = await NewsService.getWhatsAppConfig();
        setConfig(savedConfig);
      } catch (error) {
        console.error("Error loading WhatsApp config:", error);
      }
    };
    
    loadConfig();
  }, []);

  const handleEnabledChange = (enabled: boolean) => {
    setConfig(prev => ({ ...prev, enabled }));
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig(prev => ({ ...prev, phoneNumber: e.target.value }));
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig(prev => ({ ...prev, apiKey: e.target.value }));
  };

  const handleConnectionMethodChange = (value: "official" | "evolution" | "businesscloud") => {
    setConfig(prev => ({ ...prev, connectionMethod: value }));
  };

  const handleEvolutionApiUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig(prev => ({ ...prev, evolutionApiUrl: e.target.value }));
  };

  const handleSaveConfig = () => {
    NewsService.updateWhatsAppConfig(config);
    toast({
      title: "Configuración guardada",
      description: "La configuración de WhatsApp se ha guardado correctamente"
    });
  };

  const handleTestMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTestMessage(e.target.value);
  };

  const handleTestPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTestPhone(e.target.value);
  };

  const handleSendTestMessage = async () => {
    if (!testMessage.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingrese un mensaje para enviar",
        variant: "destructive"
      });
      return;
    }

    if (!testPhone.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingrese un número de teléfono",
        variant: "destructive"
      });
      return;
    }

    setSending(true);
    try {
      addLog('info', 'whatsapp', 'Iniciando envío de mensaje de prueba');
      
      const result = await WhatsAppService.testConfiguration(
        config,
        testPhone,
        testMessage,
        (type, message, details) => addLog(type, 'whatsapp', message, details)
      );
      
      if (result.success) {
        toast({
          title: "Mensaje enviado",
          description: `Mensaje enviado a ${testPhone}`
        });
        addLog('success', 'whatsapp', `Mensaje enviado exitosamente a ${testPhone}`);
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo enviar el mensaje a WhatsApp",
          variant: "destructive"
        });
        addLog('error', 'whatsapp', `Error al enviar mensaje: ${result.error}`);
      }
    } catch (error: any) {
      console.error("Error sending test message:", error);
      addLog('error', 'whatsapp', `Error inesperado al enviar mensaje: ${error.message}`, error);
      toast({
        title: "Error",
        description: "Error al enviar el mensaje de prueba",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de WhatsApp</CardTitle>
          <CardDescription>
            Configure la integración con WhatsApp para recibir y enviar notificaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="whatsapp-enabled" className="flex flex-col space-y-1">
              <span>Habilitar WhatsApp</span>
              <span className="font-normal text-sm text-muted-foreground">
                Activa la integración con WhatsApp
              </span>
            </Label>
            <Switch
              id="whatsapp-enabled"
              checked={config.enabled}
              onCheckedChange={handleEnabledChange}
            />
          </div>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="phone-number">Número de WhatsApp</Label>
              <Input
                id="phone-number"
                placeholder="Ejemplo: +54911XXXXXXXX"
                value={config.phoneNumber}
                onChange={handlePhoneNumberChange}
              />
            </div>

            <div className="space-y-2">
              <Label>Método de conexión</Label>
              <RadioGroup
                value={config.connectionMethod}
                onValueChange={(value) => 
                  handleConnectionMethodChange(value as "official" | "evolution" | "businesscloud")
                }
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="official" id="official" />
                  <Label htmlFor="official">WhatsApp Business API (Oficial)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="evolution" id="evolution" />
                  <Label htmlFor="evolution">Evolution API (No oficial)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="businesscloud" id="businesscloud" />
                  <Label htmlFor="businesscloud">Business Cloud API</Label>
                </div>
              </RadioGroup>
            </div>

            {config.connectionMethod === "evolution" && (
              <div className="space-y-2">
                <Label htmlFor="evolution-url">URL de Evolution API</Label>
                <Input
                  id="evolution-url"
                  placeholder="Ejemplo: https://api.evolution.com"
                  value={config.evolutionApiUrl}
                  onChange={handleEvolutionApiUrlChange}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Ingrese su API key"
                value={config.apiKey}
                onChange={handleApiKeyChange}
              />
            </div>

            <Button onClick={handleSaveConfig} className="w-full">
              Guardar configuración
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Probar envío de mensajes</CardTitle>
          <CardDescription>
            Envíe un mensaje de prueba para verificar la configuración
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-phone">Número de WhatsApp</Label>
            <Input
              id="test-phone"
              placeholder="Ejemplo: +54911XXXXXXXX"
              value={testPhone}
              onChange={handleTestPhoneChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-message">Mensaje de prueba</Label>
            <Textarea
              id="test-message"
              placeholder="Escriba su mensaje de prueba aquí..."
              value={testMessage}
              onChange={handleTestMessageChange}
              rows={3}
            />
          </div>

          <Button 
            onClick={handleSendTestMessage} 
            className="w-full"
            disabled={sending}
          >
            {sending ? "Enviando..." : "Enviar mensaje de prueba"}
          </Button>
        </CardContent>
      </Card>

      {/* Logs Viewer */}
      <LogViewer
        logs={logs}
        onClearLogs={clearLogs}
        title="Logs de WhatsApp"
        serviceFilter="whatsapp"
      />
    </div>
  );
};

export default WhatsAppConfig;
