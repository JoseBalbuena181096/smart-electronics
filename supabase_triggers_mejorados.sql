-- Script SQL para ejecutar directamente en Supabase SQL Editor
-- Este script implementa validaciones mejoradas para prevenir inconsistencias de datos

-- 1. Función mejorada para actualizar inventario con validaciones adicionales
CREATE OR REPLACE FUNCTION actualizar_inventario_prestamo_mejorado()
RETURNS TRIGGER AS $$
DECLARE
    equipo_record RECORD;
    cantidad_devuelta_nueva INTEGER;
    nueva_cantidad_disponible INTEGER;
BEGIN
    -- Obtener información actual del equipo
    SELECT * INTO equipo_record FROM equipos WHERE id = COALESCE(NEW.equipo_id, OLD.equipo_id);
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Equipo con ID % no encontrado', COALESCE(NEW.equipo_id, OLD.equipo_id);
    END IF;
    
    IF TG_OP = 'INSERT' THEN
        -- Validar que hay suficiente cantidad disponible
        IF equipo_record.cantidad_disponible < NEW.cantidad_prestada THEN
            RAISE EXCEPTION 'No hay suficiente cantidad disponible. Disponible: %, Solicitado: %', 
                equipo_record.cantidad_disponible, NEW.cantidad_prestada;
        END IF;
        
        -- Calcular nueva cantidad disponible
        nueva_cantidad_disponible := equipo_record.cantidad_disponible - NEW.cantidad_prestada;
        
        -- Validar que no exceda los límites
        IF nueva_cantidad_disponible < 0 THEN
            RAISE EXCEPTION 'La cantidad disponible no puede ser negativa. Resultado: %', nueva_cantidad_disponible;
        END IF;
        
        -- Actualizar cantidad disponible
        UPDATE equipos 
        SET cantidad_disponible = nueva_cantidad_disponible
        WHERE id = NEW.equipo_id;
        
        -- Registrar movimiento de préstamo
        INSERT INTO movimientos_inventario (
            equipo_id, tipo_movimiento, cantidad, cantidad_anterior, cantidad_nueva,
            prestamo_id, realizado_por, notas
        ) VALUES (
            NEW.equipo_id, 'prestamo', -NEW.cantidad_prestada, 
            equipo_record.cantidad_disponible, nueva_cantidad_disponible,
            NEW.id, NEW.prestado_por, 'Préstamo realizado'
        );
        
    ELSIF TG_OP = 'UPDATE' AND OLD.cantidad_devuelta != NEW.cantidad_devuelta THEN
        cantidad_devuelta_nueva := NEW.cantidad_devuelta - OLD.cantidad_devuelta;
        
        -- Validar que la cantidad devuelta no exceda la prestada
        IF NEW.cantidad_devuelta > NEW.cantidad_prestada THEN
            RAISE EXCEPTION 'La cantidad devuelta (%) no puede exceder la cantidad prestada (%)', 
                NEW.cantidad_devuelta, NEW.cantidad_prestada;
        END IF;
        
        -- Validar que la cantidad devuelta nueva sea positiva
        IF cantidad_devuelta_nueva <= 0 THEN
            RAISE EXCEPTION 'La cantidad a devolver debe ser positiva. Valor: %', cantidad_devuelta_nueva;
        END IF;
        
        -- Calcular nueva cantidad disponible
        nueva_cantidad_disponible := equipo_record.cantidad_disponible + cantidad_devuelta_nueva;
        
        -- Validar que no exceda la cantidad total
        IF nueva_cantidad_disponible > equipo_record.cantidad_total THEN
            RAISE EXCEPTION 'La cantidad disponible (%) no puede exceder la cantidad total (%). Equipo: %', 
                nueva_cantidad_disponible, equipo_record.cantidad_total, equipo_record.nombre;
        END IF;
        
        -- Actualizar cantidad disponible
        UPDATE equipos 
        SET cantidad_disponible = nueva_cantidad_disponible
        WHERE id = NEW.equipo_id;
        
        -- Registrar movimiento de devolución
        INSERT INTO movimientos_inventario (
            equipo_id, tipo_movimiento, cantidad, cantidad_anterior, cantidad_nueva,
            prestamo_id, realizado_por, notas
        ) VALUES (
            NEW.equipo_id, 'devolucion', cantidad_devuelta_nueva,
            equipo_record.cantidad_disponible, nueva_cantidad_disponible,
            NEW.id, NEW.devuelto_por, 'Devolución parcial/completa'
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE 'plpgsql';

-- 2. Función para validar actualizaciones directas en equipos
CREATE OR REPLACE FUNCTION validar_actualizacion_equipos()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar que cantidad_disponible no sea negativa
    IF NEW.cantidad_disponible < 0 THEN
        RAISE EXCEPTION 'La cantidad disponible no puede ser negativa: %', NEW.cantidad_disponible;
    END IF;
    
    -- Validar que cantidad_disponible no exceda cantidad_total
    IF NEW.cantidad_disponible > NEW.cantidad_total THEN
        RAISE EXCEPTION 'La cantidad disponible (%) no puede exceder la cantidad total (%)', 
            NEW.cantidad_disponible, NEW.cantidad_total;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 3. Función para validar integridad de datos
CREATE OR REPLACE FUNCTION validar_integridad_equipos()
RETURNS TABLE(
    equipo_id INTEGER,
    nombre VARCHAR,
    cantidad_total INTEGER,
    cantidad_disponible INTEGER,
    cantidad_prestada_calculada INTEGER,
    inconsistencia BOOLEAN,
    mensaje TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.nombre,
        e.cantidad_total,
        e.cantidad_disponible,
        COALESCE(SUM(p.cantidad_prestada - p.cantidad_devuelta), 0)::INTEGER as cantidad_prestada_calc,
        (e.cantidad_disponible + COALESCE(SUM(p.cantidad_prestada - p.cantidad_devuelta), 0) != e.cantidad_total) as inconsistencia,
        CASE 
            WHEN e.cantidad_disponible + COALESCE(SUM(p.cantidad_prestada - p.cantidad_devuelta), 0) != e.cantidad_total THEN
                'Inconsistencia: Disponible (' || e.cantidad_disponible || ') + Prestada (' || 
                COALESCE(SUM(p.cantidad_prestada - p.cantidad_devuelta), 0) || ') ≠ Total (' || e.cantidad_total || ')'
            ELSE 'OK'
        END as mensaje
    FROM equipos e
    LEFT JOIN prestamos p ON e.id = p.equipo_id AND p.estado IN ('activo', 'vencido')
    GROUP BY e.id, e.nombre, e.cantidad_total, e.cantidad_disponible
    ORDER BY inconsistencia DESC, e.nombre;
END;
$$ LANGUAGE 'plpgsql';

-- 4. Función para corregir inconsistencias automáticamente
CREATE OR REPLACE FUNCTION corregir_inconsistencias_equipos()
RETURNS TABLE(
    equipo_id INTEGER,
    nombre VARCHAR,
    cantidad_anterior INTEGER,
    cantidad_nueva INTEGER,
    corregido BOOLEAN
) AS $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT * FROM validar_integridad_equipos() WHERE inconsistencia = true
    LOOP
        -- Calcular la cantidad disponible correcta
        UPDATE equipos 
        SET cantidad_disponible = rec.cantidad_total - rec.cantidad_prestada_calculada
        WHERE id = rec.equipo_id;
        
        -- Registrar la corrección
        INSERT INTO movimientos_inventario (
            equipo_id, tipo_movimiento, cantidad, cantidad_anterior, cantidad_nueva,
            realizado_por, notas
        ) VALUES (
            rec.equipo_id, 'correccion', 
            (rec.cantidad_total - rec.cantidad_prestada_calculada) - rec.cantidad_disponible,
            rec.cantidad_disponible, rec.cantidad_total - rec.cantidad_prestada_calculada,
            'system', 'Corrección automática de inconsistencia'
        );
        
        RETURN QUERY SELECT 
            rec.equipo_id,
            rec.nombre,
            rec.cantidad_disponible,
            rec.cantidad_total - rec.cantidad_prestada_calculada,
            true;
    END LOOP;
END;
$$ LANGUAGE 'plpgsql';

-- 5. Reemplazar triggers existentes con versiones mejoradas
DROP TRIGGER IF EXISTS trigger_inventario_prestamo_insert ON prestamos;
DROP TRIGGER IF EXISTS trigger_inventario_prestamo_update ON prestamos;
DROP TRIGGER IF EXISTS trigger_validar_equipos_update ON equipos;

-- Crear nuevos triggers mejorados
CREATE TRIGGER trigger_inventario_prestamo_insert_mejorado 
    AFTER INSERT ON prestamos
    FOR EACH ROW EXECUTE FUNCTION actualizar_inventario_prestamo_mejorado();

CREATE TRIGGER trigger_inventario_prestamo_update_mejorado 
    AFTER UPDATE ON prestamos
    FOR EACH ROW EXECUTE FUNCTION actualizar_inventario_prestamo_mejorado();

CREATE TRIGGER trigger_validar_equipos_update 
    BEFORE UPDATE ON equipos
    FOR EACH ROW EXECUTE FUNCTION validar_actualizacion_equipos();

-- 6. Verificar y corregir datos existentes (opcional)
-- Descomenta las siguientes líneas si quieres ejecutar la verificación automáticamente:

-- SELECT 'Verificando integridad de datos...' as status;
-- SELECT * FROM validar_integridad_equipos();

-- SELECT 'Corrigiendo inconsistencias encontradas...' as status;
-- SELECT * FROM corregir_inconsistencias_equipos();

-- SELECT 'Verificación final...' as status;
-- SELECT * FROM validar_integridad_equipos() WHERE inconsistencia = true;