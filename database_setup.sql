-- Script SQL para Sistema de Inventario de Laboratorio - VERSIÓN CORREGIDA
-- Base de datos: Supabase (PostgreSQL)
-- Ejecutar en el editor SQL de Supabase

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Crear enum para roles de usuario
CREATE TYPE user_role AS ENUM ('normal', 'becario', 'admin');

-- Crear enum para estados de préstamo
CREATE TYPE loan_status AS ENUM ('activo', 'devuelto_parcial', 'devuelto');

-- Tabla de perfiles de usuario (extiende auth.users de Supabase)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    matricula VARCHAR(50) UNIQUE,
    carrera VARCHAR(200),
    telefono VARCHAR(20),
    rfid VARCHAR(100) UNIQUE,
    role user_role DEFAULT 'normal' NOT NULL,
    face_vector VECTOR(128), -- Para reconocimiento facial futuro
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de equipos
CREATE TABLE equipos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    marca VARCHAR(100) NOT NULL,
    descripcion TEXT,
    ubicacion VARCHAR(200) NOT NULL,
    serie VARCHAR(100) UNIQUE NOT NULL,
    cantidad_total INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_total >= 0),
    cantidad_disponible INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_disponible >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    
    -- Constraint para asegurar que disponible <= total
    CONSTRAINT check_cantidad_disponible CHECK (cantidad_disponible <= cantidad_total)
);

-- Tabla de préstamos
CREATE TABLE prestamos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    equipo_id UUID REFERENCES equipos(id) ON DELETE CASCADE NOT NULL,
    cantidad_prestada INTEGER NOT NULL CHECK (cantidad_prestada > 0),
    cantidad_devuelta INTEGER DEFAULT 0 CHECK (cantidad_devuelta >= 0),
    cantidad_pendiente INTEGER GENERATED ALWAYS AS (cantidad_prestada - cantidad_devuelta) STORED,
    status loan_status DEFAULT 'activo' NOT NULL,
    fecha_prestamo TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_devolucion TIMESTAMP WITH TIME ZONE,
    notas TEXT,
    prestado_por UUID REFERENCES profiles(id) NOT NULL, -- Quien realizó el préstamo
    devuelto_por UUID REFERENCES profiles(id), -- Quien recibió la devolución
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para asegurar que devuelta <= prestada
    CONSTRAINT check_cantidad_devuelta CHECK (cantidad_devuelta <= cantidad_prestada)
);

-- Tabla de historial de movimientos de inventario
CREATE TABLE movimientos_inventario (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    equipo_id UUID REFERENCES equipos(id) ON DELETE CASCADE NOT NULL,
    tipo_movimiento VARCHAR(50) NOT NULL, -- 'prestamo', 'devolucion', 'ajuste_inventario'
    cantidad INTEGER NOT NULL,
    cantidad_anterior INTEGER NOT NULL,
    cantidad_nueva INTEGER NOT NULL,
    prestamo_id UUID REFERENCES prestamos(id),
    realizado_por UUID REFERENCES profiles(id) NOT NULL,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de notificaciones/emails enviados
CREATE TABLE notificaciones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL, -- 'recordatorio_prestamo', 'email_masivo'
    destinatario_id UUID REFERENCES profiles(id),
    asunto VARCHAR(500),
    contenido TEXT,
    enviado_por UUID REFERENCES profiles(id) NOT NULL,
    fecha_envio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    estado VARCHAR(50) DEFAULT 'enviado' -- 'enviado', 'fallido'
);

-- Crear índices optimizados (eliminando redundancias)
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_matricula ON profiles(matricula) WHERE matricula IS NOT NULL;
CREATE INDEX idx_profiles_rfid ON profiles(rfid) WHERE rfid IS NOT NULL;
CREATE INDEX idx_profiles_role_active ON profiles(role, is_active);

CREATE INDEX idx_equipos_serie ON equipos(serie);
CREATE INDEX idx_equipos_search ON equipos(nombre, modelo, marca) WHERE is_active = true;
CREATE INDEX idx_equipos_disponible ON equipos(cantidad_disponible) WHERE is_active = true AND cantidad_disponible > 0;

CREATE INDEX idx_prestamos_user_status ON prestamos(user_id, status);
CREATE INDEX idx_prestamos_equipo_status ON prestamos(equipo_id, status);
CREATE INDEX idx_prestamos_fecha ON prestamos(fecha_prestamo);
CREATE INDEX idx_prestamos_pendiente ON prestamos(cantidad_pendiente) WHERE cantidad_pendiente > 0;

CREATE INDEX idx_movimientos_equipo_fecha ON movimientos_inventario(equipo_id, created_at);
CREATE INDEX idx_movimientos_tipo ON movimientos_inventario(tipo_movimiento);

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipos_updated_at BEFORE UPDATE ON equipos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prestamos_updated_at BEFORE UPDATE ON prestamos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- FUNCIÓN CORREGIDA: Registrar movimientos de inventario (sin bucles infinitos)
CREATE OR REPLACE FUNCTION registrar_movimiento_inventario()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo registrar si cambió la cantidad disponible y hay un usuario responsable
    IF OLD.cantidad_disponible != NEW.cantidad_disponible AND NEW.created_by IS NOT NULL THEN
        INSERT INTO movimientos_inventario (
            equipo_id,
            tipo_movimiento,
            cantidad,
            cantidad_anterior,
            cantidad_nueva,
            realizado_por,
            notas
        ) VALUES (
            NEW.id,
            'ajuste_inventario',
            NEW.cantidad_disponible - OLD.cantidad_disponible,
            OLD.cantidad_disponible,
            NEW.cantidad_disponible,
            COALESCE(NEW.created_by, OLD.created_by),
            'Ajuste automático de inventario'
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para registrar movimientos automáticamente
CREATE TRIGGER trigger_movimiento_inventario AFTER UPDATE ON equipos
    FOR EACH ROW EXECUTE FUNCTION registrar_movimiento_inventario();

-- FUNCIÓN CORREGIDA: Actualizar estado de préstamo (evitando bucles infinitos)
CREATE OR REPLACE FUNCTION actualizar_estado_prestamo()
RETURNS TRIGGER AS $$
DECLARE
    nuevo_status loan_status;
BEGIN
    -- Calcular el nuevo estado basado en cantidad pendiente
    IF NEW.cantidad_pendiente = 0 THEN
        nuevo_status := 'devuelto';
    ELSIF NEW.cantidad_devuelta > 0 AND NEW.cantidad_pendiente > 0 THEN
        nuevo_status := 'devuelto_parcial';
    ELSE
        nuevo_status := 'activo';
    END IF;
    
    -- Solo actualizar si el estado realmente cambió (evita bucle infinito)
    IF OLD.status != nuevo_status THEN
        NEW.status := nuevo_status;
        
        -- Solo actualizar fecha_devolucion si se completó la devolución
        IF nuevo_status = 'devuelto' AND OLD.fecha_devolucion IS NULL THEN
            NEW.fecha_devolucion := NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar estado de préstamo automáticamente
CREATE TRIGGER trigger_estado_prestamo BEFORE UPDATE ON prestamos
    FOR EACH ROW EXECUTE FUNCTION actualizar_estado_prestamo();

-- NUEVA FUNCIÓN: Actualizar inventario al crear préstamo
CREATE OR REPLACE FUNCTION actualizar_inventario_prestamo()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Reducir cantidad disponible al crear préstamo
        UPDATE equipos 
        SET cantidad_disponible = cantidad_disponible - NEW.cantidad_prestada
        WHERE id = NEW.equipo_id;
        
        -- Registrar movimiento
        INSERT INTO movimientos_inventario (
            equipo_id, tipo_movimiento, cantidad, cantidad_anterior, cantidad_nueva,
            prestamo_id, realizado_por, notas
        )
        SELECT 
            NEW.equipo_id, 'prestamo', -NEW.cantidad_prestada, 
            cantidad_disponible + NEW.cantidad_prestada, cantidad_disponible,
            NEW.id, NEW.prestado_por, 'Préstamo realizado'
        FROM equipos WHERE id = NEW.equipo_id;
        
    ELSIF TG_OP = 'UPDATE' AND OLD.cantidad_devuelta != NEW.cantidad_devuelta THEN
        -- Aumentar cantidad disponible al devolver
        DECLARE
            cantidad_devuelta_nueva INTEGER := NEW.cantidad_devuelta - OLD.cantidad_devuelta;
        BEGIN
            UPDATE equipos 
            SET cantidad_disponible = cantidad_disponible + cantidad_devuelta_nueva
            WHERE id = NEW.equipo_id;
            
            -- Registrar movimiento de devolución
            INSERT INTO movimientos_inventario (
                equipo_id, tipo_movimiento, cantidad, cantidad_anterior, cantidad_nueva,
                prestamo_id, realizado_por, notas
            )
            SELECT 
                NEW.equipo_id, 'devolucion', cantidad_devuelta_nueva,
                cantidad_disponible - cantidad_devuelta_nueva, cantidad_disponible,
                NEW.id, NEW.devuelto_por, 'Devolución parcial/completa'
            FROM equipos WHERE id = NEW.equipo_id;
        END;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Triggers para sincronizar inventario con préstamos
CREATE TRIGGER trigger_inventario_prestamo_insert AFTER INSERT ON prestamos
    FOR EACH ROW EXECUTE FUNCTION actualizar_inventario_prestamo();

CREATE TRIGGER trigger_inventario_prestamo_update AFTER UPDATE ON prestamos
    FOR EACH ROW EXECUTE FUNCTION actualizar_inventario_prestamo();

-- Políticas de seguridad RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestamos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS CORREGIDAS: Eliminando redundancias y conflictos

-- Políticas para profiles (simplificadas y sin conflictos)
CREATE POLICY "profile_select_policy" ON profiles
    FOR SELECT USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('becario', 'admin')
        )
    );

CREATE POLICY "profile_update_policy" ON profiles
    FOR UPDATE USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para equipos
CREATE POLICY "equipos_select_policy" ON equipos
    FOR SELECT USING (is_active = true);

CREATE POLICY "equipos_manage_policy" ON equipos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('becario', 'admin')
        )
    );

-- Políticas para préstamos
CREATE POLICY "prestamos_select_policy" ON prestamos
    FOR SELECT USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('becario', 'admin')
        )
    );

CREATE POLICY "prestamos_manage_policy" ON prestamos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('becario', 'admin')
        )
    );

-- Políticas para movimientos de inventario
CREATE POLICY "movimientos_select_policy" ON movimientos_inventario
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('becario', 'admin')
        )
    );

-- Políticas para notificaciones
CREATE POLICY "notificaciones_select_policy" ON notificaciones
    FOR SELECT USING (
        destinatario_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "notificaciones_manage_policy" ON notificaciones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, nombre, apellido, email, matricula)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
        COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'matricula', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- FUNCIÓN DE VALIDACIÓN: Verificar consistencia de inventario
CREATE OR REPLACE FUNCTION validar_consistencia_inventario()
RETURNS TABLE(
    equipo_id UUID,
    nombre_equipo VARCHAR,
    cantidad_total INTEGER,
    cantidad_disponible INTEGER,
    cantidad_prestada_calculada INTEGER,
    inconsistencia BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.nombre,
        e.cantidad_total,
        e.cantidad_disponible,
        COALESCE(SUM(p.cantidad_pendiente), 0)::INTEGER as prestada_calc,
        (e.cantidad_disponible + COALESCE(SUM(p.cantidad_pendiente), 0) != e.cantidad_total) as inconsistencia
    FROM equipos e
    LEFT JOIN prestamos p ON e.id = p.equipo_id AND p.status IN ('activo', 'devuelto_parcial')
    WHERE e.is_active = true
    GROUP BY e.id, e.nombre, e.cantidad_total, e.cantidad_disponible;
END;
$$ LANGUAGE plpgsql;

-- Comentarios finales
COMMENT ON TABLE profiles IS 'Perfiles de usuario con roles y datos personales';
COMMENT ON TABLE equipos IS 'Inventario de equipos del laboratorio';
COMMENT ON TABLE prestamos IS 'Registro de préstamos de equipos';
COMMENT ON TABLE movimientos_inventario IS 'Historial de movimientos de inventario';
COMMENT ON TABLE notificaciones IS 'Registro de notificaciones enviadas';

COMMENT ON COLUMN profiles.face_vector IS 'Vector de características faciales para reconocimiento (futuro)';
COMMENT ON COLUMN equipos.cantidad_disponible IS 'Cantidad disponible para préstamo (total - prestado)';
COMMENT ON COLUMN prestamos.cantidad_pendiente IS 'Cantidad aún no devuelta (calculada automáticamente)';

-- CORRECCIONES APLICADAS:
-- 1. Eliminado bucle infinito en trigger de estado de préstamos
-- 2. Corregida función de movimientos de inventario con manejo de NULL
-- 3. Agregadas funciones para sincronizar inventario automáticamente
-- 4. Simplificadas políticas RLS eliminando redundancias y conflictos
-- 5. Optimizados índices eliminando duplicados
-- 6. Agregada función de validación de consistencia
-- 7. Mejorado manejo de errores y casos edge

-- Fin del script corregido
-- Ejecutar este script completo en el editor SQL de Supabase
-- Asegúrate de tener los permisos necesarios para crear extensiones y funciones