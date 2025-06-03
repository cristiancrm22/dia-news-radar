import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { DatabaseService } from "@/services/DatabaseService";
import NewsService from "@/services/NewsService";
import { EmailService } from "@/services/EmailService";
import { EmailConfig as EmailConfigType } from "@/types/news";
import { X, Mail, Server, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLogs } from "@/hooks/useLogs";
import LogViewer from "@/components/LogViewer";

const EmailConfig = () => {
  const { user } = useAuth();
  const { logs, addLog, clearLogs } = useLogs();
  const [config, setConfig] = useState<EmailConfigType>({
    enabled: false,
    email: "",
    frequency: "daily",
    time: "08:00",
    keywords: [],
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUsername: "",
    smtpPassword: "",
    useTLS: true
  });
  
  const [newKeyword, setNewKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        const savedConfig = await DatabaseService.getUserEmailConfig();
        setConfig(savedConfig);
      } catch (error) {
        console.error("Error loading email config:", error);
        toast({
          title: "Error",
          description: "Error al cargar la configuración de email",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadConfig();
  }, [user]);

  const handleConfigChange = (updatedConfig: Partial<EmailConfigType>) => {
    setConfig(prev => ({ ...prev, ...updatedConfig }));
    setHasChanges(true);
  };

  const saveConfiguration = async () => {
    if (!user || isSaving) return;
    
    try {
      setIsSaving(true);
      await DatabaseService.updateUserEmailConfig(config);
      setHasChanges(false);
      
      toast({
        title: "Configuración guardada",
        description: "Se guardó la configuración de correos electrónicos correctamente"
      });
    } catch (error) {
      console.error("Error saving email config:", error);
      toast({
        title: "Error",
        description: "Error al guardar la configuración",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
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

  const handleTestEmail = async () => {
    if (!config.email) {
      toast({
        title: "Email requerido",
        description: "Por favor ingrese un correo electrónico antes de enviar el correo de prueba",
        variant: "destructive"
      });
      return;
    }

    setIsTestingEmail(true);
    try {
      addLog('info', 'email', 'Iniciando prueba de configuración de email');
      
      // First save the configuration
      await DatabaseService.updateUserEmailConfig(config);
      addLog('info', 'email', 'Configuración guardada antes de la prueba');
      
      // Then test the email
      const result = await EmailService.testEmailConfiguration(config);
      
      if (result.success) {
        toast({
          title: "Correo de prueba enviado",
          description: `Se envió correctamente el correo de prueba a ${config.email}`
        });
        addLog('success', 'email', `Correo de prueba enviado exitosamente a ${config.email}`);
      } else {
        toast({
          title: "Error al enviar correo",
          description: result.error || "Error desconocido",
          variant: "destructive"
        });
        addLog('error', 'email', `Error al enviar correo de prueba: ${result.error}`);
      }
    } catch (error: any) {
      console.error("Error testing email:", error);
      addLog('error', 'email', `Error inesperado al probar email: ${error.message}`, error);
      toast({
        title: "Error",
        description: "Error al procesar la solicitud. Verifique la configuración.",
        variant: "destructive"
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Debes iniciar sesión para configurar el email.</p>
      </div>
    );
  }

  if (isLoading && !config.email) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Configuración de Correos
          </CardTitle>
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
      </Card>

      {/* Configuración SMTP */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Configuración del Servidor SMTP
          </CardTitle>
          <CardDescription>
            Configure los datos del servidor de correo para el envío de emails
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">Servidor SMTP</Label>
              <Input
                id="smtp-host"
                placeholder="smtp.gmail.com"
                value={config.smtpHost || ""}
                onChange={(e) => handleConfigChange({ smtpHost: e.target.value })}
                disabled={!config.enabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp-port">Puerto</Label>
              <Input
                id="smtp-port"
                type="number"
                placeholder="587"
                value={config.smtpPort || ""}
                onChange={(e) => handleConfigChange({ smtpPort: parseInt(e.target.value) || 587 })}
                disabled={!config.enabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp-username">Usuario SMTP</Label>
            <Input
              id="smtp-username"
              type="email"
              placeholder="tu-email@gmail.com"
              value={config.smtpUsername || ""}
              onChange={(e) => handleConfigChange({ smtpUsername: e.target.value })}
              disabled={!config.enabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp-password">Contraseña / App Password</Label>
            <Input
              id="smtp-password"
              type="password"
              placeholder="Contraseña de aplicación"
              value={config.smtpPassword || ""}
              onChange={(e) => handleConfigChange({ smtpPassword: e.target.value })}
              disabled={!config.enabled}
            />
            <p className="text-xs text-muted-foreground">
              Para Gmail, usa una contraseña de aplicación específica
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="use-tls" className="flex flex-col space-y-1">
              <span>Usar TLS/SSL</span>
              <span className="font-normal text-xs text-muted-foreground">
                Conexión segura (recomendado)
              </span>
            </Label>
            <Switch
              id="use-tls"
              checked={config.useTLS !== false}
              onCheckedChange={(useTLS) => handleConfigChange({ useTLS })}
              disabled={!config.enabled}
            />
          </div>

          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
            <h4 className="font-medium mb-2">Configuración para usar Resend (recomendado):</h4>
            <ul className="space-y-1 text-xs">
              <li>• No necesita configurar SMTP manualmente</li>
              <li>• Los correos se envían a través de nuestro servicio</li>
              <li>• Solo necesita activar la opción y configurar su email</li>
              <li>• Mayor confiabilidad en la entrega</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => {
              const resetConfig = {
                enabled: false,
                email: "",
                frequency: "daily" as const,
                time: "08:00",
                keywords: [],
                smtpHost: "smtp.gmail.com",
                smtpPort: 587,
                smtpUsername: "",
                smtpPassword: "",
                useTLS: true
              };
              setConfig(resetConfig);
              setHasChanges(true);
              toast({
                title: "Configuración reiniciada",
                description: "Se restableció la configuración por defecto. Haga clic en 'Guardar' para aplicar los cambios."
              });
            }}
          >
            Restablecer
          </Button>

          <div className="flex gap-2">
            <Button 
              onClick={saveConfiguration}
              disabled={!hasChanges || isSaving}
              variant="default"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
            
            <Button 
              onClick={handleTestEmail}
              disabled={!config.email || isTestingEmail}
              variant="outline"
            >
              {isTestingEmail ? "Enviando..." : "Enviar correo de prueba"}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Logs Viewer */}
      <LogViewer
        logs={logs}
        onClearLogs={clearLogs}
        title="Logs de Email"
        serviceFilter="email"
      />
    </div>
  );
};

export default EmailConfig;
