-- Script para corregir las políticas RLS que causan recursión infinita
-- Solución temporal: deshabilitar RLS para permitir acceso

-- Deshabilitar RLS temporalmente para todas las tablas
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipos DISABLE ROW LEVEL SECURITY;
ALTER TABLE prestamos DISABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario DISABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "profile_select_policy" ON profiles;
DROP POLICY IF EXISTS "profile_update_policy" ON profiles;
DROP POLICY IF EXISTS "equipos_select_policy" ON equipos;
DROP POLICY IF EXISTS "equipos_manage_policy" ON equipos;
DROP POLICY IF EXISTS "prestamos_select_policy" ON prestamos;
DROP POLICY IF EXISTS "prestamos_manage_policy" ON prestamos;
DROP POLICY IF EXISTS "movimientos_select_policy" ON movimientos_inventario;
DROP POLICY IF EXISTS "notificaciones_select_policy" ON notificaciones;
DROP POLICY IF EXISTS "notificaciones_manage_policy" ON notificaciones;

-- Comentario: RLS deshabilitado temporalmente para resolver el problema de recursión
-- En un entorno de producción, se deberían implementar políticas más específicas
-- que no causen recursión infinita