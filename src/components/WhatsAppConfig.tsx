import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { WhatsAppConfig as WhatsAppConfigType } from "@/types/news";
import NewsService from "@/services/NewsService";
import { WhatsAppService } from "@/services/WhatsAppService";
import { useLogs } from "@/hooks/useLogs";
import LogViewer from "@/components/LogViewer";
import WhatsAppNewsManager from "@/components/WhatsAppNewsManager";

const WhatsAppConfig = () => {
  const { logs, addLog, clearLogs } = useLogs();
  const [config, setConfig] = useState<WhatsAppConfigType>({
    phoneNumber: "",
    apiKey: "",
    connectionMethod: "official",
    evolutionApiUrl: ""
  });
  
  const [testMessage, setTestMessage] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [instanceName, setInstanceName] = useState("SenadoN8N");
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const savedConfig = await NewsService.getWhatsAppConfig();
        console.log("Loaded WhatsApp config:", savedConfig);
        setConfig(savedConfig);
      } catch (error) {
        console.error("Error loading WhatsApp config:", error);
        addLog('error', 'whatsapp', `Error al cargar configuración: ${error.message}`);
      }
    };
    
    loadConfig();
  }, []);

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfig = { ...config, phoneNumber: e.target.value };
    setConfig(newConfig);
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfig = { ...config, apiKey: e.target.value };
    setConfig(newConfig);
  };

  const handleConnectionMethodChange = (value: "official" | "evolution" | "businesscloud") => {
    const newConfig = { ...config, connectionMethod: value };
    setConfig(newConfig);
    console.log("Connection method changed to:", value);
  };

  const handleEvolutionApiUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfig = { ...config, evolutionApiUrl: e.target.value };
    setConfig(newConfig);
    console.log("Evolution API URL changed to:", e.target.value);
  };

  const handleSaveConfig = async () => {
    if (saving) return;
    
    setSaving(true);
    console.log("Saving WhatsApp config:", config);
    
    try {
      await NewsService.updateWhatsAppConfig(config);
      addLog('success', 'whatsapp', 'Configuración guardada exitosamente');
      toast({
        title: "Configuración guardada",
        description: "La configuración de WhatsApp se ha guardado correctamente"
      });
    } catch (error) {
      console.error("Error saving config:", error);
      addLog('error', 'whatsapp', `Error al guardar configuración: ${error.message}`);
      toast({
        title: "Error",
        description: `Error al guardar la configuración: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
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

    const phoneToUse = testPhone.trim() || config.phoneNumber;

    if (!phoneToUse.trim()) {
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
      
      const result = await WhatsAppService.sendMessage(
        config,
        phoneToUse,
        testMessage,
        (type, message, details) => addLog(type, 'whatsapp', message, details)
      );
      
      if (result.success) {
        toast({
          title: "Mensaje enviado",
          description: `Mensaje enviado a ${phoneToUse}`
        });
        addLog('success', 'whatsapp', `Mensaje enviado exitosamente a ${phoneToUse}`);
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
      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="config">Configuración</TabsTrigger>
          <TabsTrigger value="news">Gestión de Noticias</TabsTrigger>
        </TabsList>
        
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de WhatsApp</CardTitle>
              <CardDescription>
                Configure la integración con WhatsApp para recibir y enviar notificaciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
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
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="evolution-url">URL de Evolution API</Label>
                      <Input
                        id="evolution-url"
                        placeholder="Ejemplo: https://api.evolution.com"
                        value={config.evolutionApiUrl || ""}
                        onChange={handleEvolutionApiUrlChange}
                      />
                      <p className="text-xs text-muted-foreground">
                        URL completa del servidor Evolution API
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="instance-name">Nombre de la instancia</Label>
                      <Input
                        id="instance-name"
                        placeholder="Ejemplo: SenadoN8N"
                        value={instanceName}
                        onChange={(e) => setInstanceName(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Nombre de la instancia configurada en Evolution Manager
                      </p>
                    </div>
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

                <Button 
                  onClick={handleSaveConfig} 
                  className="w-full"
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "Guardar configuración"}
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
                <Label htmlFor="test-phone">Número de WhatsApp para prueba</Label>
                <Input
                  id="test-phone"
                  placeholder="Ejemplo: +54911XXXXXXXX"
                  value={testPhone}
                  onChange={handleTestPhoneChange}
                />
                <p className="text-xs text-muted-foreground">
                  Número completo con código de país
                </p>
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

          <LogViewer
            logs={logs}
            onClearLogs={clearLogs}
            title="Logs de WhatsApp"
            serviceFilter="whatsapp"
          />
        </TabsContent>
        
        <TabsContent value="news">
          <WhatsAppNewsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppConfig;
