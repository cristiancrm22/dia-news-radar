
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { WhatsAppService } from "@/services/WhatsAppService";
import { useLogs } from "@/hooks/useLogs";
import LogViewer from "@/components/LogViewer";
import WhatsAppSubscriptionManager from "@/components/WhatsAppSubscriptionManager";
import WhatsAppAutomatedLogs from "@/components/WhatsAppAutomatedLogs";
import EmailSubscriptionManager from "@/components/EmailSubscriptionManager";
import EmailAutomatedLogs from "@/components/EmailAutomatedLogs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Send, MessageSquare, Users, FileText, Mail } from "lucide-react";
import RadarLogsViewer from "@/components/RadarLogsViewer";

const WhatsAppNewsManager = () => {
  const { logs, addLog, clearLogs } = useLogs();
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [sending, setSending] = useState(false);

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
            Gestión de Noticias Automáticas
          </CardTitle>
          <CardDescription>
            Configure el envío automático de noticias por WhatsApp y Email
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="test" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="test">Prueba Manual</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="whatsapp-logs">Logs WhatsApp</TabsTrigger>
          <TabsTrigger value="email-logs">Logs Email</TabsTrigger>
          <TabsTrigger value="radar-logs">Logs Radar.py</TabsTrigger>
        </TabsList>
        
        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Prueba de Envío Manual
              </CardTitle>
              <CardDescription>
                Envíe noticias del día a un número específico para probar la funcionalidad
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-phone">Número para prueba</Label>
                <Input
                  id="test-phone"
                  placeholder="Número para prueba (ej: +54911XXXXXXXX)"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                />
              </div>
              
              <Button 
                onClick={testNewsRequest} 
                disabled={sending || !testPhoneNumber.trim()}
                className="w-full"
              >
                {sending ? "Enviando..." : "Enviar noticias del día"}
              </Button>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Cómo funciona:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Se obtienen las noticias más recientes del sistema</li>
                  <li>• Se formatean para WhatsApp con emojis y estructura clara</li>
                  <li>• Se envían automáticamente al número especificado</li>
                  <li>• Si no hay noticias, se envía un mensaje informativo</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="whatsapp" className="space-y-6">
          <WhatsAppSubscriptionManager />
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <EmailSubscriptionManager />
        </TabsContent>

        <TabsContent value="whatsapp-logs" className="space-y-6">
          <WhatsAppAutomatedLogs />
        </TabsContent>

        <TabsContent value="email-logs" className="space-y-6">
          <EmailAutomatedLogs />
        </TabsContent>

        <TabsContent value="radar-logs" className="space-y-6">
          <RadarLogsViewer />
        </TabsContent>
      </Tabs>

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
