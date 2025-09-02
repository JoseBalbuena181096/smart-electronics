# Sistema de Inventario de Laboratorio - Especificación Técnica

## Reglas de Negocio de Alto Nivel

### Flujo Principal del Sistema

#### 1. Gestión de Usuarios y Autenticación
- **Registro/Login**: Los usuarios se autentican con Supabase usando email y contraseña
- **Profiles**: Cada usuario tiene nombre, apellido, email, matricula, carrera, telefono, rfid opcional
- **Roles**: Existen 3 tipos de usuario con permisos específicos:
  - **normal**: Solo puede VER sus prestamos y disponibilidad de equipos
  - **becario**: Puede gestionar prestamos (prestar/devolver) y gestionar equipos
  - **admin**: Tiene todos los permisos + gestión de usuarios y envío de emails masivos

#### 2. Lógica de Inventario de Equipos
- **Equipos Únicos**: Cada equipo tiene nombre, modelo, marca, descripcion, ubicacion y **serie única**
- **Control de Stock**: Los equipos manejan `cantidad_total` y `cantidad_disponible`
- **Ejemplo**: Arduino Uno modelo "SMART10001" tiene 10 unidades totales
- **Serie por Lote**: Cada lote/tipo de equipo tiene una serie base (ej: SMART10001 para Arduinos, SMART10002 para LEDs)

#### 3. Flujo de Prestamos - Reglas Críticas

##### A. Proceso de Prestamo (Solo admin/becario)
1. **Buscar Usuario**: admin/becario busca usuario por nombre o matricula en tiempo real
2. **Seleccionar Usuario**: Se abre vista con prestamos activos del usuario seleccionado
3. **Buscar Equipo**: En la misma vista, buscador para encontrar equipo por serie, modelo o nombre
4. **Agregar Equipo**: Al seleccionar equipo, se añade a la lista de prestamos del usuario
5. **Ajustar Cantidades**: Usar botones +/- para definir cantidad a prestar
6. **Validación de Stock**: El sistema valida que hay suficiente `cantidad_disponible`
7. **Confirmar Prestamo**: Se descuenta del inventario y se asigna al usuario

##### B. Lógica de Stock y Disponibilidad
- **Stock Real**: Si Arduino Uno tiene 10 unidades totales y se prestan 5, quedan 5 disponibles
- **Múltiples Usuarios**: Otro usuario puede pedir 4 Arduinos de los 5 disponibles
- **Prestamos Acumulativos**: Un usuario puede tener múltiples prestamos del mismo equipo
- **Control Estricto**: No se puede prestar más cantidad de la disponible

##### C. Proceso de Devolucion (Solo admin/becario)
1. **Seleccionar Usuario**: Mismo flujo de búsqueda de usuario
2. **Ver Prestamos Activos**: Lista de equipos prestados con cantidades
3. **Devolucion Parcial**: El usuario puede devolver solo parte de lo prestado
   - Ejemplo: De 5 Arduinos prestados, devuelve solo 1
   - Resultado: Le quedan 4 Arduinos activos, inventario se actualiza +1
4. **Devolucion Completa**: Si devuelve todo, el prestamo se marca como "devuelto"
5. **Actualizacion Automatica**: `cantidad_disponible` se incrementa automáticamente

#### 4. Sistema de Búsquedas en Tiempo Real

##### A. Búsqueda de Usuarios
- **Campos de Búsqueda**: Nombre, apellido, matricula simultáneamente
- **Tiempo Real**: Resultados aparecen mientras se escribe (debounce 300ms)
- **Coincidencias Parciales**: Buscar "juan" encuentra "Juan Pérez", "Juanita", etc.

##### B. Búsqueda de Equipos
- **Campos Múltiples**: Serie, nombre, modelo buscados simultáneamente
- **Disponibilidad**: Mostrar stock disponible en resultados
- **Filtros**: Opción de mostrar solo equipos con stock disponible

#### 5. Gestión de Equipos (Admin/Becario)

##### A. Registro de Nuevos Equipos
- **Formulario Completo**: Nombre, modelo, marca, descripcion, ubicacion, serie, cantidad inicial
- **Series Únicas**: El sistema valida que no exista la serie registrada
- **Stock Inicial**: La `cantidad_total` y `cantidad_disponible` inician iguales

##### B. Actualizacion de Equipos
- **Búsqueda Previa**: Encontrar equipo por serie/nombre/modelo
- **Edicion Completa**: Modificar todos los datos del equipo
- **Ajuste de Inventario**: Aumentar/disminuir cantidades totales
- **Validación**: No permitir reducir stock por debajo de lo prestado

#### 6. Permisos y Restricciones por Rol

##### normal
- ✅ Ver SUS prestamos activos únicamente
- ✅ Consultar disponibilidad de equipos (solo lectura)
- ✅ Ver historial de SUS prestamos
- ❌ NO puede prestar ni devolver equipos
- ❌ NO puede gestionar otros usuarios
- ❌ NO puede registrar/editar equipos

##### becario
- ✅ Todas las funciones de normal
- ✅ Gestionar prestamos: prestar y recibir devoluciones
- ✅ Buscar y seleccionar cualquier usuario del sistema
- ✅ Registrar nuevos equipos en el inventario
- ✅ Editar información de equipos existentes
- ✅ Ajustar cantidades de inventario
- ❌ NO puede gestionar usuarios (crear/editar profiles)
- ❌ NO puede enviar emails masivos

##### admin
- ✅ Todas las funciones de becario
- ✅ Gestionar usuarios: crear, editar roles, activar/desactivar
- ✅ **EXCLUSIVO**: Convertir usuarios normal a becario y viceversa
- ✅ **EXCLUSIVO**: Otorgar y revocar permisos de becario
- ✅ Enviar emails masivos de recordatorios a usuarios con prestamos
- ✅ Ver reportes completos del sistema
- ✅ Acceso a todos los módulos sin restricción

#### 7. Sistema de notificaciones y Recordatorios

##### A. Emails de Recordatorio
- **Destinatarios**: Todos los usuarios con prestamos activos
- **Contenido**: Lista de equipos prestados, cantidades, fechas de prestamo
- **Frecuencia**: Disparado manualmente por admin
- **Template**: Email profesional con resumen detallado por usuario

##### B. Estados de Prestamos
- **activo**: Prestamo vigente con cantidad > 0
- **devuelto_parcial**: Cuando se ha devuelto parte pero no todo
- **devuelto**: Prestamo completamente cerrado (cantidad = 0)

#### 8. Preparación para Reconocimiento Facial 
- **Campo Vector**: `face_vector VECTOR(128)` preparado para embeddings
- **Implementación Futura**: Python + face_recognition library
- **Búsqueda por Similitud**: Usar similitud de coseno para identificación
- **Estado Actual**: Campo existe pero permanece NULL hasta implementación

#### 9. Flujos de Pantalla Principales

##### Dashboard Principal
- **normal**: Ver mis prestamos + disponibilidad de equipos
- **becario/admin**: Resumen general + acceso a todas las funciones
- **Navegación**: Menú lateral con opciones según rol

##### Gestión de Prestamos
1. Buscar usuario → Seleccionar → Ver sus prestamos activos
2. En la misma pantalla: Buscar equipo → Seleccionar → Ajustar cantidad → Confirmar
3. Para devolver: Seleccionar prestamo activo → Ajustar cantidad devuelta → Confirmar

##### Gestión de Equipos
1. Buscar equipo existente → Seleccionar → Editar información/stock
2. O crear nuevo equipo → Llenar formulario → Confirmar registro

## Stack Tecnológico
- **Frontend**: Next.js 14+ (App Router)
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Preparación futura**: Face Recognition con Python (vectores para similitud de coseno)
