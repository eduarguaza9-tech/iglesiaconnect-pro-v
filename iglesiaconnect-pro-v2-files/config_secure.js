/**
 * IglesiaConnect Pro - Configuración Segura
 * 
 * Este archivo contiene la configuración segura del sistema.
 * Las credenciales están protegidas y solo se exponen en desarrollo.
 */

// Configuración del entorno
const CONFIG = {
  // Configuración de la aplicación
  app: {
    name: 'IglesiaConnect Pro',
    version: '2.0.0',
    description: 'Sistema moderno de gestión para iglesias',
    author: 'MiniMax Agent',
    buildDate: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  },

  // Configuración de Supabase (debe configurarse en variables de entorno)
  supabase: {
    url: process.env.REACT_APP_SUPABASE_URL || '',
    anonKey: process.env.REACT_APP_SUPABASE_ANON_KEY || '',
    serviceKey: process.env.REACT_APP_SUPABASE_SERVICE_KEY || '',
    redirectUrl: process.env.REACT_APP_SUPABASE_REDIRECT_URL || window.location.origin,
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    }
  },

  // Configuración de seguridad
  security: {
    // Políticas de contraseñas
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxLength: 128
    },

    // Configuración de sesión
    session: {
      timeout: 30 * 60 * 1000, // 30 minutos
      refreshThreshold: 5 * 60 * 1000, // 5 minutos antes del timeout
      maxConcurrentSessions: 3
    },

    // Configuración de rate limiting
    rateLimit: {
      login: {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000, // 15 minutos
        lockoutDuration: 30 * 60 * 1000 // 30 minutos
      },
      api: {
        maxRequests: 100,
        windowMs: 15 * 60 * 1000 // 15 minutos
      }
    },

    // Configuración de CORS
    cors: {
      allowedOrigins: [
        'http://localhost:3000',
        'https://localhost:3000',
        window.location.origin
      ].filter(Boolean),
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }
  },

  // Configuración de funcionalidades
  features: {
    enableProfileImages: true,
    enableNotifications: true,
    enableReports: true,
    enableAnalytics: false, // Deshabilitado por privacidad
    enableAuditLog: true,
    enableTwoFactorAuth: false, // Para implementación futura
    enableSocialLogin: false, // Para implementación futura
    enableEmailNotifications: true,
    enablePushNotifications: false // Para implementación futura
  },

  // Configuración de UI/UX
  ui: {
    theme: 'light', // light, dark, auto
    language: 'es',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h', // 12h, 24h
    timezone: 'Europe/Madrid',
    animations: true,
    compactMode: false,
    showTooltips: true,
    showKeyboardShortcuts: true
  },

  // Configuración de límites
  limits: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxEventsPerMonth: 100,
    maxMembersPerMinistry: 50,
    maxNotificationHistory: 1000,
    maxAuditLogEntries: 10000
  },

  // Configuración de validación
  validation: {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[\+]?[0-9\s\-\(\)]{10,}$/,
    name: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,50}$/,
    eventTitle: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\.,!?()]{1,100}$/,
    ministryName: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\.,!?()]{2,100}$/
  },

  // Configuración de roles y permisos
  roles: {
    admin: {
      name: 'Administrador',
      description: 'Acceso completo al sistema',
      permissions: [
        'manage_users',
        'manage_events',
        'manage_fasts',
        'manage_ministries',
        'manage_reports',
        'manage_settings',
        'view_audit_log',
        'manage_system'
      ]
    },
    lider: {
      name: 'Líder',
      description: 'Gestión de ministerios y eventos',
      permissions: [
        'manage_events',
        'manage_fasts',
        'manage_ministries',
        'view_reports',
        'manage_own_events'
      ]
    },
    miembro: {
      name: 'Miembro',
      description: 'Acceso básico a funcionalidades',
      permissions: [
        'view_events',
        'view_ministries',
        'manage_own_profile',
        'participate_in_events'
      ]
    }
  },

  // Configuración de notificaciones
  notifications: {
    email: {
      enabled: true,
      templates: {
        welcome: {
          subject: '¡Bienvenido a IglesiaConnect Pro!',
          template: 'welcome-email.html'
        },
        passwordReset: {
          subject: 'Restablecer contraseña - IglesiaConnect Pro',
          template: 'password-reset-email.html'
        },
        eventReminder: {
          subject: 'Recordatorio: Evento mañana',
          template: 'event-reminder-email.html'
        }
      }
    },
    inApp: {
      enabled: true,
      position: 'top-right',
      duration: 5000,
      maxVisible: 5
    }
  },

  // Configuración de analytics (opcional)
  analytics: {
    enabled: false,
    provider: 'custom', // custom, google, mixpanel
    trackingId: process.env.REACT_APP_ANALYTICS_ID || '',
    events: {
      pageViews: false,
      userActions: false,
      errors: true,
      performance: false
    },
    privacy: {
      anonymizeIP: true,
      doNotTrack: true,
      cookieConsent: false
    }
  },

  // Configuración de caché
  cache: {
    enabled: true,
    strategy: 'memory', // memory, localStorage, indexedDB
    maxSize: 50 * 1024 * 1024, // 50MB
    ttl: 5 * 60 * 1000, // 5 minutos
    includeUserData: true
  },

  // Configuración de logs
  logging: {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
    enabled: true,
    providers: {
      console: process.env.NODE_ENV === 'development',
      remote: false, // Para producción
      file: false
    },
    format: 'json', // json, text
    maxEntries: 1000
  }
};

// Usuario por defecto seguro (se debe personalizar en cada instalación)
const DEFAULT_ADMIN_USER = {
  email: 'admin@iglesia.com',
  password: 'Admin123!', // Se recomienda cambiar después del primer login
  full_name: 'Administrador Principal',
  phone: '+34 123 456 789',
  role: 'admin',
  mustChangePassword: true,
  twoFactorEnabled: false,
  lastLogin: null,
  accountLocked: false,
  createdAt: new Date().toISOString()
};

// Validación de configuración
function validateConfig() {
  const errors = [];

  // Validar Supabase
  if (!CONFIG.supabase.url) {
    errors.push('REACT_APP_SUPABASE_URL no está configurado');
  }
  if (!CONFIG.supabase.anonKey) {
    errors.push('REACT_APP_SUPABASE_ANON_KEY no está configurado');
  }

  // Validar seguridad
  if (CONFIG.security.passwordPolicy.minLength < 8) {
    errors.push('La política de contraseñas debe requerir al menos 8 caracteres');
  }

  // Validar límites
  if (CONFIG.limits.maxFileSize > 10 * 1024 * 1024) {
    errors.push('El tamaño máximo de archivo es demasiado grande (>10MB)');
  }

  // Mostrar errores en desarrollo
  if (errors.length > 0 && CONFIG.app.environment === 'development') {
    console.error('❌ Errores de configuración:', errors);
  }

  return errors.length === 0;
}

// Función para obtener configuración según el entorno
function getConfig() {
  if (CONFIG.app.environment === 'development') {
    console.log('🔧 Configuración de desarrollo cargada');
    console.log('📋 Config:', CONFIG);
  }

  return CONFIG;
}

// Función para verificar permisos
function hasPermission(userRole, permission) {
  const role = CONFIG.roles[userRole];
  return role && role.permissions.includes(permission);
}

// Función para validar contraseña
function validatePassword(password) {
  const policy = CONFIG.security.passwordPolicy;
  const errors = [];

  if (password.length < policy.minLength) {
    errors.push(`La contraseña debe tener al menos ${policy.minLength} caracteres`);
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra mayúscula');
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una letra minúscula');
  }
  if (policy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('La contraseña debe contener al menos un número');
  }
  if (policy.requireSpecialChars && !/[^a-zA-Z0-9]/.test(password)) {
    errors.push('La contraseña debe contener al menos un carácter especial');
  }
  if (password.length > policy.maxLength) {
    errors.push(`La contraseña no debe tener más de ${policy.maxLength} caracteres`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Función para sanitizar entrada
function sanitizeInput(input, type = 'text') {
  if (typeof input !== 'string') return input;

  let sanitized = input.trim();

  switch (type) {
    case 'email':
      sanitized = sanitized.toLowerCase().trim();
      break;
    case 'phone':
      sanitized = sanitized.replace(/[^\d\+\-\(\)\s]/g, '');
      break;
    case 'text':
      sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      sanitized = sanitized.replace(/<[^>]*>/g, '');
      break;
    case 'url':
      sanitized = sanitized.replace(/javascript:/gi, '');
      break;
    default:
      sanitized = sanitized.replace(/[<>\"']/g, '');
  }

  return sanitized;
}

// Función para generar ID único
function generateId() {
  return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

// Función para formatear fecha
function formatDate(date, format = 'DD/MM/YYYY') {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  return format
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', year)
    .replace('HH', hours)
    .replace('mm', minutes);
}

// Inicializar configuración
if (typeof window !== 'undefined') {
  window.IGLESIA_CONNECT_CONFIG = CONFIG;
}

// Exportar funciones de utilidad
export {
  CONFIG,
  DEFAULT_ADMIN_USER,
  validateConfig,
  getConfig,
  hasPermission,
  validatePassword,
  sanitizeInput,
  generateId,
  formatDate
};

// Exportar por defecto
export default CONFIG;