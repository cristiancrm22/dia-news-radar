
-- Crear índice único en user_whatsapp_configs para que funcione el ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_whatsapp_configs_user_id 
ON user_whatsapp_configs (user_id);

-- Verificar que no hay duplicados antes de crear la restricción
DELETE FROM user_whatsapp_configs 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id 
  FROM user_whatsapp_configs 
  ORDER BY user_id, created_at DESC
);
