
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Trash2, Plus, Mail, Clock, Save } from "lucide-react";
import { ScheduledEmailService } from "@/services/ScheduledEmailService";

interface EmailSubscription {
  id?: string;
  email: string;
  scheduledTime: string;
  isActive: boolean;
  frequency: 'daily' | 'weekly';
  weekdays?: number[];
  createdAt?: string;
  lastSent?: string;
}

const EmailSubscriptionManager = () => {
  const [subscriptions, setSubscriptions] = useState<EmailSubscription[]>([]);
  const [newSubscription, setNewSubscription] = useState<Partial<EmailSubscription>>({
    email: "",
    scheduledTime: "08:00",
    isActive: true,
    frequency: "daily",
    weekdays: []
  });
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const weekdayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const result = await ScheduledEmailService.getSubscriptions();
      if (result.success && result.subscriptions) {
        setSubscriptions(result.subscriptions);
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudieron cargar las suscripciones",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error loading subscriptions:", error);
      toast({
        title: "Error",
        description: "Error cargando suscripciones",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const addSubscription = async () => {
    if (!newSubscription.email || !newSubscription.scheduledTime) {
      toast({
        title: "Error",
        description: "Completar email y horario",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await ScheduledEmailService.addSubscription({
        email: newSubscription.email!,
        scheduledTime: newSubscription.scheduledTime!,
        isActive: newSubscription.isActive || true,
        frequency: newSubscription.frequency || "daily",
        weekdays: newSubscription.weekdays || []
      });

      if (result.success) {
        toast({
          title: "Suscripción agregada",
          description: `Emails programados para ${newSubscription.email}`
        });
        setNewSubscription({
          email: "",
          scheduledTime: "08:00",
          isActive: true,
          frequency: "daily",
          weekdays: []
        });
        loadSubscriptions();
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo agregar la suscripción",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error adding subscription:", error);
      toast({
        title: "Error",
        description: "Error agregando suscripción",
        variant: "destructive"
      });
    }
  };

  const deleteSubscription = async (id: string) => {
    try {
      const result = await ScheduledEmailService.deleteSubscription(id);
      if (result.success) {
        toast({
          title: "Suscripción eliminada",
          description: "La suscripción fue eliminada correctamente"
        });
        loadSubscriptions();
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo eliminar la suscripción",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error deleting subscription:", error);
      toast({
        title: "Error",
        description: "Error eliminando suscripción",
        variant: "destructive"
      });
    }
  };

  const toggleSubscription = async (id: string, isActive: boolean) => {
    try {
      const result = await ScheduledEmailService.updateSubscription(id, { isActive });
      if (result.success) {
        toast({
          title: isActive ? "Suscripción activada" : "Suscripción pausada",
          description: `La suscripción fue ${isActive ? 'activada' : 'pausada'}`
        });
        loadSubscriptions();
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo actualizar la suscripción",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error updating subscription:", error);
      toast({
        title: "Error",
        description: "Error actualizando suscripción",
        variant: "destructive"
      });
    }
  };

  const sendImmediateEmail = async () => {
    setSending(true);
    try {
      const result = await ScheduledEmailService.sendNewsToSubscribers();
      if (result.success && result.results) {
        toast({
          title: "Emails enviados",
          description: `Se enviaron ${result.results.sent} emails de ${result.results.total} suscripciones. Noticias: ${result.results.totalNews}`
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudieron enviar los emails",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error sending immediate emails:", error);
      toast({
        title: "Error",
        description: "Error enviando emails",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const toggleWeekday = (day: number) => {
    const weekdays = newSubscription.weekdays || [];
    const updatedWeekdays = weekdays.includes(day)
      ? weekdays.filter(d => d !== day)
      : [...weekdays, day].sort();
    
    setNewSubscription({
      ...newSubscription,
      weekdays: updatedWeekdays
    });
  };

  return (
    <div className="space-y-6">
      {/* Agregar nueva suscripción */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nueva Suscripción de Email
          </CardTitle>
          <CardDescription>
            Agregar una nueva suscripción para recibir noticias por email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={newSubscription.email || ""}
                onChange={(e) => setNewSubscription({
                  ...newSubscription,
                  email: e.target.value
                })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="time">Horario</Label>
              <Input
                id="time"
                type="time"
                value={newSubscription.scheduledTime || "08:00"}
                onChange={(e) => setNewSubscription({
                  ...newSubscription,
                  scheduledTime: e.target.value
                })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frecuencia</Label>
              <Select
                value={newSubscription.frequency || "daily"}
                onValueChange={(value: 'daily' | 'weekly') => 
                  setNewSubscription({
                    ...newSubscription,
                    frequency: value,
                    weekdays: value === 'daily' ? [] : newSubscription.weekdays
                  })
                }
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

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={newSubscription.isActive || true}
                onCheckedChange={(checked) =>
                  setNewSubscription({
                    ...newSubscription,
                    isActive: checked
                  })
                }
              />
              <Label htmlFor="active">Activa</Label>
            </div>
          </div>

          {newSubscription.frequency === 'weekly' && (
            <div className="space-y-2">
              <Label>Días de la semana</Label>
              <div className="flex flex-wrap gap-2">
                {weekdayNames.map((day, index) => (
                  <Badge
                    key={index}
                    variant={newSubscription.weekdays?.includes(index) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleWeekday(index)}
                  >
                    {day}
                  </Badge>
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

      {/* Acciones rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Acciones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={sendImmediateEmail} 
            disabled={sending}
            className="w-full"
          >
            {sending ? "Enviando..." : "Enviar emails inmediatamente"}
          </Button>
        </CardContent>
      </Card>

      {/* Lista de suscripciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Suscripciones Programadas ({subscriptions.length})
          </CardTitle>
          <CardDescription>
            Gestiona todas las suscripciones de email programadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Cargando suscripciones...</div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No hay suscripciones de email configuradas
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{subscription.email}</span>
                      <Badge
                        variant={subscription.isActive ? "default" : "secondary"}
                      >
                        {subscription.isActive ? "Activa" : "Pausada"}
                      </Badge>
                      <Badge variant="outline">
                        {subscription.frequency === 'daily' ? 'Diario' : 'Semanal'}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span>Horario: {subscription.scheduledTime}</span>
                      {subscription.frequency === 'weekly' && subscription.weekdays && subscription.weekdays.length > 0 && (
                        <span className="ml-4">
                          Días: {subscription.weekdays.map(d => weekdayNames[d]).join(', ')}
                        </span>
                      )}
                      {subscription.lastSent && (
                        <span className="ml-4">
                          Último envío: {new Date(subscription.lastSent).toLocaleString('es-ES')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={subscription.isActive}
                      onCheckedChange={(checked) =>
                        toggleSubscription(subscription.id!, checked)
                      }
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

export default EmailSubscriptionManager;
