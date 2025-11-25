/**
 * IglesiaConnect Pro - Cliente de Supabase
 * 
 * Cliente configurado de forma segura para la base de datos
 */

import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config_secure.js';

// Configuración del cliente de Supabase
const supabaseConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Flujo más seguro
    storage: {
      getItem: (key) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.warn('No se pudo guardar en localStorage:', error);
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn('No se pudo eliminar de localStorage:', error);
        }
      }
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'iglesia-connect-pro/2.0.0'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  db: {
    schema: 'public'
  },
  storage: {
    bucket: 'profiles'
  }
};

// Crear cliente de Supabase
const supabaseUrl = CONFIG.supabase.url;
const supabaseAnonKey = CONFIG.supabase.anonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Las credenciales de Supabase no están configuradas. Asegúrese de configurar REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY en sus variables de entorno.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseConfig);

// Configuración de la base de datos
export const db = {
  // Tablas principales
  tables: {
    profiles: 'profiles',
    events: 'events',
    fasts: 'fasts',
    ministries: 'ministries',
    notifications: 'notifications',
    audit_log: 'audit_log'
  },

  // Funciones Edge
  functions: {
    admin_manage_users: 'admin-manage-users',
    generate_report: 'generate-report',
    send_notification: 'send-notification'
  },

  // Políticas RLS (Row Level Security)
  policies: {
    profiles: {
      select: 'auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = \'admin\')',
      update: 'auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = \'admin\')',
      insert: 'auth.role() = \'authenticated\'',
      delete: 'EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = \'admin\')'
    },
    events: {
      select: 'auth.uid() IS NOT NULL',
      insert: 'auth.uid() IS NOT NULL',
      update: 'auth.uid() = created_by OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN (\'admin\', \'lider\'))',
      delete: 'auth.uid() = created_by OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = \'admin\')'
    },
    fasts: {
      select: 'auth.uid() IS NOT NULL',
      insert: 'auth.uid() IS NOT NULL',
      update: 'auth.uid() = created_by OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN (\'admin\', \'lider\'))',
      delete: 'auth.uid() = created_by OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = \'admin\')'
    },
    ministries: {
      select: 'auth.uid() IS NOT NULL',
      insert: 'EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN (\'admin\', \'lider\'))',
      update: 'EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN (\'admin\', \'lider\'))',
      delete: 'EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = \'admin\')'
    },
    audit_log: {
      select: 'EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = \'admin\')',
      insert: 'auth.uid() IS NOT NULL',
      update: 'false',
      delete: 'EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = \'admin\')'
    }
  }
};

// Utilidades para consultas
export class DatabaseService {
  constructor() {
    this.supabase = supabase;
  }

  // Función genérica para ejecutar consultas con manejo de errores
  async executeQuery(queryBuilder) {
    try {
      const result = await queryBuilder;
      
      if (result.error) {
        console.error('Error en consulta:', result.error);
        throw result.error;
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error ejecutando consulta:', error);
      return { data: null, error };
    }
  }

  // Función para insertar con validación
  async insert(table, data) {
    // Agregar timestamps automáticos
    const dataWithTimestamps = {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return this.executeQuery(
      this.supabase.from(table).insert(dataWithTimestamps).select().single()
    );
  }

  // Función para actualizar con validación
  async update(table, updates, filters) {
    // Agregar timestamp de actualización
    const dataWithTimestamp = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    let query = this.supabase.from(table).update(dataWithTimestamp);

    // Aplicar filtros
    Object.keys(filters).forEach(key => {
      query = query.eq(key, filters[key]);
    });

    return this.executeQuery(query.select().single());
  }

  // Función para eliminar con validación
  async delete(table, filters) {
    let query = this.supabase.from(table).delete();

    // Aplicar filtros
    Object.keys(filters).forEach(key => {
      query = query.eq(key, filters[key]);
    });

    return this.executeQuery(query);
  }

  // Función para seleccionar con filtros
  async select(table, options = {}) {
    let query = this.supabase.from(table).select(options.select || '*');

    // Aplicar filtros
    if (options.filters) {
      Object.keys(options.filters).forEach(key => {
        const value = options.filters[key];
        if (typeof value === 'object' && value.operator) {
          query = query[value.operator](key, value.value);
        } else {
          query = query.eq(key, value);
        }
      });
    }

    // Ordenamiento
    if (options.order) {
      query = query.order(options.order.column, { 
        ascending: options.order.ascending !== false 
      });
    }

    // Límite
    if (options.limit) {
      query = query.limit(options.limit);
    }

    return this.executeQuery(query);
  }
}

// Instancia del servicio de base de datos
export const dbService = new DatabaseService();

// Función para inicializar la base de datos
export async function initializeDatabase() {
  try {
    // Verificar conexión
    const { error } = await this.supabase.from('profiles').select('count', { count: 'exact', head: true });
    
    if (error) {
      throw error;
    }

    console.log('✅ Conexión a base de datos establecida');
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con la base de datos:', error);
    return false;
  }
}

// Función para obtener configuración de almacenamiento
export function getStorageConfig() {
  return {
    bucket: 'profiles',
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    fileSizeLimit: CONFIG.limits.maxFileSize,
    transformations: {
      thumbnail: {
        width: 150,
        height: 150,
        quality: 80
      }
    }
  };
}

// Función para configurar real-time
export function setupRealtime() {
  const channel = supabase.channel('iglesia-connect-pro');

  // Suscribirse a cambios en tablas principales
  const tables = ['profiles', 'events', 'fasts', 'ministries'];
  
  tables.forEach(table => {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table
      },
      (payload) => {
        console.log(`Cambio en ${table}:`, payload);
      }
    );
  });

  return channel.subscribe();
}

// Función para configurar storage policies
export function getStoragePolicies() {
  return {
    avatar_upload: 'auth.uid() = profiles.id',
    avatar_view: 'true', // Las avatares son públicos
    avatar_delete: 'auth.uid() = profiles.id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = \'admin\')'
  };
}

// Función para ejecutar Edge Functions
export async function invokeEdgeFunction(functionName, payload) {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload
    });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error(`Error ejecutando ${functionName}:`, error);
    return { data: null, error };
  }
}

// Exportar utilidades
export default supabase;
export { 
  DatabaseService,
  initializeDatabase,
  getStorageConfig,
  setupRealtime,
  getStoragePolicies,
  invokeEdgeFunction
};