
import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale/es";

const SystemClock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border">
      <Clock className="h-4 w-4" />
      <span className="font-mono">
        {format(currentTime, "dd/MM/yyyy HH:mm:ss", { locale: es })}
      </span>
    </div>
  );
};

export default SystemClock;
