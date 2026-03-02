-- Tabla para almacenar tokens FCM de cada usuario por dispositivo
CREATE TABLE IF NOT EXISTS fcm_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    device_name TEXT DEFAULT 'Unknown',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Política: usuarios solo ven sus propios tokens
CREATE POLICY "Users can view own tokens" ON fcm_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON fcm_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON fcm_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON fcm_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON fcm_tokens(token);

-- Función para actualizar last_used
CREATE OR REPLACE FUNCTION update_fcm_token_last_used()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_used = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_fcm_token_last_used ON fcm_tokens;
CREATE TRIGGER update_fcm_token_last_used
    BEFORE UPDATE ON fcm_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_fcm_token_last_used();
