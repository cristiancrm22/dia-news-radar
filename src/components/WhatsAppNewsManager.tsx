
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { WhatsAppService } from "@/services/WhatsAppService";
import { useLogs } from "@/hooks/useLogs";
import LogViewer from "@/components/LogViewer";
import { Clock, Send, MessageSquare } from "lucide-react";

const WhatsAppNewsManager = () => {
  const { logs, addLog, clearLogs } = useLogs();
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([]);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [scheduledEnabled, setScheduledEnabled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("08:00");
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [sending, setSending] = useState(false);

  const addPhoneNumber = () => {
    if (newPhoneNumber.trim() && !phoneNumbers.includes(newPhoneNumber.trim())) {
      setPhoneNumbers([...phoneNumbers, newPhoneNumber.trim()]);
      setNewPhoneNumber("");
      toast({
        title: "Número agregado",
        description: `${newPhoneNumber} ha sido agregado a la lista`
      });
    }
  };

  const removePhoneNumber = (phone: string) => {
    setPhoneNumbers(phoneNumbers.filter(p => p !== phone));
    toast({
      title: "Número eliminado",
      description: `${phone} ha sido eliminado de la lista`
    });
  };

  const sendNewsNow = async () => {
    if (phoneNumbers.length === 0) {
      toast({
        title: "Error",
        description: "Agregue al menos un número de teléfono",
        variant: "destructive"
      });
      return;
    }

    setSending(true);
    try {
      addLog('info', 'whatsapp-news', 'Enviando noticias manualmente...');
      
      const result = await WhatsAppService.sendScheduledNews(
        phoneNumbers,
        (type, message, details) => addLog(type, 'whatsapp-news', message, details)
      );
      
      if (result.success) {
        toast({
          title: "Noticias enviadas",
          description: `Se enviaron las noticias a ${phoneNumbers.length} números`
        });
        addLog('success', 'whatsapp-news', `Noticias enviadas a ${phoneNumbers.length} números`);
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudieron enviar las noticias",
          variant: "destructive"
        });
        addLog('error', 'whatsapp-news', `Error enviando noticias: ${result.error}`);
      }
    } catch (error: any) {
      console.error("Error sending news:", error);
      addLog('error', 'whatsapp-news', `Error inesperado: ${error.message}`, error);
      toast({
        title: "Error",
        description: "Error al enviar las noticias",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const testNewsRequest = async () => {
    if (!testPhoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Ingrese un número de teléfono para la prueba",
        variant: "destructive"
      });
      return;
    }

    setSending(true);
    try {
      addLog('info', 'whatsapp-news', `Enviando noticias de prueba a ${testPhoneNumber}`);
      
      const result = await WhatsAppService.requestTodayNews(
        testPhoneNumber,
        (type, message, details) => addLog(type, 'whatsapp-news', message, details)
      );
      
      if (result.success) {
        toast({
          title: "Noticias enviadas",
          description: `Se enviaron las noticias del día a ${testPhoneNumber}`
        });
        addLog('success', 'whatsapp-news', `Noticias enviadas correctamente a ${testPhoneNumber}`);
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudieron enviar las noticias",
          variant: "destructive"
        });
        addLog('error', 'whatsapp-news', `Error enviando noticias: ${result.error}`);
      }
    } catch (error: any) {
      console.error("Error sending test news:", error);
      addLog('error', 'whatsapp-news', `Error inesperado: ${error.message}`, error);
      toast({
        title: "Error",
        description: "Error al enviar las noticias de prueba",
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
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Gestión de Noticias por WhatsApp
          </CardTitle>
          <CardDescription>
            Configure el envío automático de noticias y gestione solicitudes por WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Lista de números de WhatsApp */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Números de WhatsApp suscritos</h3>
            
            <div className="flex gap-2">
              <Input
                placeholder="Ingrese número de WhatsApp (ej: +54911XXXXXXXX)"
                value={newPhoneNumber}
                onChange={(e) => setNewPhoneNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addPhoneNumber()}
              />
              <Button onClick={addPhoneNumber}>Agregar</Button>
            </div>
            
            {phoneNumbers.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Números suscritos ({phoneNumbers.length})</h4>
                <div className="space-y-2">
                  {phoneNumbers.map((phone, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>{phone}</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => removePhoneNumber(phone)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Envío programado */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Envío Programado
                </h3>
                <p className="text-sm text-muted-foreground">
                  Enviar noticias automáticamente todos los días
                </p>
              </div>
              <Switch
                checked={scheduledEnabled}
                onCheckedChange={setScheduledEnabled}
              />
            </div>
            
            {scheduledEnabled && (
              <div className="space-y-2">
                <Label htmlFor="scheduled-time">Hora de envío</Label>
                <Input
                  id="scheduled-time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground">
                  Las noticias se enviarán automáticamente a las {scheduledTime} todos los días
                </p>
              </div>
            )}
          </div>

          {/* Envío manual */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Send className="h-5 w-5" />
              Envío Manual
            </h3>
            
            <Button 
              onClick={sendNewsNow} 
              disabled={sending || phoneNumbers.length === 0}
              className="w-full"
            >
              {sending ? "Enviando..." : `Enviar noticias ahora (${phoneNumbers.length} números)`}
            </Button>
          </div>

          {/* Prueba de solicitud por WhatsApp */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Prueba de solicitud por WhatsApp</h3>
            <p className="text-sm text-muted-foreground">
              Simula cuando alguien envía "noticias" por WhatsApp
            </p>
            
            <div className="flex gap-2">
              <Input
                placeholder="Número para prueba (ej: +54911XXXXXXXX)"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
              />
              <Button 
                onClick={testNewsRequest} 
                disabled={sending}
                variant="outline"
              >
                {sending ? "Enviando..." : "Enviar noticias"}
              </Button>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Cómo funciona la solicitud automática:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Los usuarios pueden enviar "noticias" por WhatsApp</li>
                <li>• El sistema detecta automáticamente la solicitud</li>
                <li>• Responde con las noticias del día formateadas</li>
                <li>• También funciona con: "noticia", "news", "resumen", "últimas noticias"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Viewer */}
      <LogViewer
        logs={logs}
        onClearLogs={clearLogs}
        title="Logs de Noticias WhatsApp"
        serviceFilter="whatsapp-news"
      />
    </div>
  );
};

export default WhatsAppNewsManager;
