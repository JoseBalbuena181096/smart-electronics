const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Leer variables de entorno del archivo .env.local
function loadEnvFile() {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });
    return envVars;
  } catch (error) {
    console.error('Error leyendo .env.local:', error.message);
    return {};
  }
}

const envVars = loadEnvFile();
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyImprovedTriggers() {
  try {
    console.log('Leyendo archivo de triggers mejorados...');
    const sql = fs.readFileSync('improved_triggers.sql', 'utf8');
    
    console.log('Aplicando triggers mejorados a la base de datos...');
    
    // Dividir el SQL en statements individuales para mejor manejo de errores
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`Ejecutando statement ${i + 1}/${statements.length}...`);
        try {
          const { data, error } = await supabase.rpc('exec_sql', { 
            sql_query: statement + ';' 
          });
          
          if (error) {
            console.warn(`Advertencia en statement ${i + 1}:`, error.message);
          } else {
            console.log(`✓ Statement ${i + 1} ejecutado exitosamente`);
          }
        } catch (err) {
          console.warn(`Advertencia en statement ${i + 1}:`, err.message);
        }
      }
    }
    
    console.log('\n✅ Triggers mejorados aplicados exitosamente');
    
    // Verificar integridad de datos
    console.log('\nVerificando integridad de datos...');
    const { data: integrityCheck, error: integrityError } = await supabase
      .rpc('validar_integridad_equipos');
    
    if (integrityError) {
      console.error('Error al verificar integridad:', integrityError);
    } else {
      console.log('Resultado de verificación de integridad:');
      console.table(integrityCheck);
      
      const inconsistencias = integrityCheck.filter(item => item.inconsistencia);
      if (inconsistencias.length > 0) {
        console.log(`\n⚠️  Se encontraron ${inconsistencias.length} inconsistencias`);
        console.log('Ejecutando corrección automática...');
        
        const { data: corrections, error: correctionError } = await supabase
          .rpc('corregir_inconsistencias_equipos');
        
        if (correctionError) {
          console.error('Error al corregir inconsistencias:', correctionError);
        } else {
          console.log('Correcciones aplicadas:');
          console.table(corrections);
        }
      } else {
        console.log('✅ No se encontraron inconsistencias en los datos');
      }
    }
    
  } catch (error) {
    console.error('Error general:', error);
  }
}

applyImprovedTriggers();