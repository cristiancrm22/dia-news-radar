
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { ScheduledWhatsAppService, WhatsAppSubscription } from "@/services/ScheduledWhatsAppService";
import { Clock, Plus, Trash2, UserPlus, Send } from "lucide-react";

const WhatsAppSubscriptionManager = () => {
  const [subscriptions, setSubscriptions] = useState<WhatsAppSubscription[]>([]);
  const [newSubscription, setNewSubscription] = useState({
    phoneNumber: "",
    scheduledTime: "08:00",
    frequency: "daily" as "daily" | "weekly",
    weekdays: [] as number[],
    isActive: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const weekdayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    setIsLoading(true);
    try {
      const result = await ScheduledWhatsAppService.getSubscriptions();
      if (result.success && result.subscriptions) {
        setSubscriptions(result.subscriptions);
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al cargar suscripciones",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error loading subscriptions:", error);
      toast({
        title: "Error",
        description: "Error al cargar las suscripciones",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addSubscription = async () => {
    if (!newSubscription.phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Ingrese un número de teléfono",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await ScheduledWhatsAppService.addSubscription(newSubscription);
      if (result.success) {
        toast({
          title: "Suscripción agregada",
          description: `Se agregó la suscripción para ${newSubscription.phoneNumber}`
        });
        setNewSubscription({
          phoneNumber: "",
          scheduledTime: "08:00",
          frequency: "daily",
          weekdays: [],
          isActive: true
        });
        loadSubscriptions();
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al agregar suscripción",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error adding subscription:", error);
      toast({
        title: "Error",
        description: "Error al agregar la suscripción",
        variant: "destructive"
      });
    }
  };

  const toggleSubscriptionStatus = async (id: string, isActive: boolean) => {
    try {
      const result = await ScheduledWhatsAppService.updateSubscription(id, { isActive });
      if (result.success) {
        toast({
          title: "Estado actualizado",
          description: `Suscripción ${isActive ? 'activada' : 'desactivada'}`
        });
        loadSubscriptions();
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al actualizar estado",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error updating subscription:", error);
      toast({
        title: "Error",
        description: "Error al actualizar la suscripción",
        variant: "destructive"
      });
    }
  };

  const deleteSubscription = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta suscripción?")) return;

    try {
      const result = await ScheduledWhatsAppService.deleteSubscription(id);
      if (result.success) {
        toast({
          title: "Suscripción eliminada",
          description: "La suscripción se eliminó correctamente"
        });
        loadSubscriptions();
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al eliminar suscripción",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error deleting subscription:", error);
      toast({
        title: "Error",
        description: "Error al eliminar la suscripción",
        variant: "destructive"
      });
    }
  };

  const sendImmediateNews = async () => {
    setIsSending(true);
    try {
      const result = await ScheduledWhatsAppService.sendNewsToSubscribers();
      if (result.success) {
        const results = result.results as any;
        toast({
          title: "Envío completado",
          description: `Enviado a ${results?.sent || 0} de ${results?.total || 0} suscriptores. Errores: ${results?.errors?.length || 0}`
        });
        loadSubscriptions(); // Recargar para actualizar las fechas de último envío
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al enviar noticias",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error sending immediate news:", error);
      toast({
        title: "Error",
        description: "Error al enviar las noticias",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const toggleWeekday = (day: number) => {
    const weekdays = newSubscription.weekdays.includes(day)
      ? newSubscription.weekdays.filter(d => d !== day)
      : [...newSubscription.weekdays, day];
    setNewSubscription(prev => ({ ...prev, weekdays }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Agregar Nueva Suscripción
          </CardTitle>
          <CardDescription>
            Configure el envío automático de noticias por WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Número de WhatsApp</Label>
              <Input
                id="phone"
                placeholder="+54911XXXXXXXX"
                value={newSubscription.phoneNumber}
                onChange={(e) => setNewSubscription(prev => ({ ...prev, phoneNumber: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="time">Hora de envío</Label>
              <Input
                id="time"
                type="time"
                value={newSubscription.scheduledTime}
                onChange={(e) => setNewSubscription(prev => ({ ...prev, scheduledTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Frecuencia</Label>
            <Select
              value={newSubscription.frequency}
              onValueChange={(value: "daily" | "weekly") => setNewSubscription(prev => ({ ...prev, frequency: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diario</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {newSubscription.frequency === "weekly" && (
            <div className="space-y-2">
              <Label>Días de la semana</Label>
              <div className="flex gap-2 flex-wrap">
                {weekdayNames.map((day, index) => (
                  <Button
                    key={index}
                    variant={newSubscription.weekdays.includes(index) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleWeekday(index)}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Button onClick={addSubscription} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Suscripción
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Suscripciones Activas ({subscriptions.length})
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={sendImmediateNews} 
                disabled={isSending || subscriptions.length === 0} 
                variant="default"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSending ? "Enviando..." : "Enviar Ahora"}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Gestione las suscripciones de envío automático. 
            El botón "Enviar Ahora" envía con las noticias actuales disponibles.
            El envío programado automático ejecuta búsqueda de noticias nuevas en los horarios configurados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && subscriptions.length === 0 ? (
            <div className="text-center py-4">Cargando suscripciones...</div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No hay suscripciones configuradas
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((subscription) => (
                <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{subscription.phoneNumber}</span>
                      <Badge variant={subscription.isActive ? "default" : "secondary"}>
                        {subscription.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                      <Badge variant="outline">
                        {subscription.frequency === "daily" ? "Diario" : "Semanal"}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>Hora: {subscription.scheduledTime}</div>
                      {subscription.frequency === "weekly" && subscription.weekdays && (
                        <div>
                          Días: {subscription.weekdays.map(d => weekdayNames[d]).join(", ")}
                        </div>
                      )}
                      {subscription.lastSent && (
                        <div>
                          Último envío: {new Date(subscription.lastSent).toLocaleString('es-ES')}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={subscription.isActive}
                      onCheckedChange={(checked) => toggleSubscriptionStatus(subscription.id!, checked)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteSubscription(subscription.id!)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppSubscriptionManager;
