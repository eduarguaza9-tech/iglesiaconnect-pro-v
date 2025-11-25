/**
 * IglesiaConnect Pro - Servicios
 * 
 * Servicios centralizados para la gestión de la aplicación
 */

import { supabase } from './supabase-client';
import { 
  validatePassword, 
  sanitizeInput, 
  generateId, 
  hasPermission,
  CONFIG 
} from './config_secure';

// Servicio de autenticación mejorado
export class AuthService {
  constructor() {
    this.supabase = supabase;
    this.session = null;
    this.user = null;
    this.profile = null;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  // Login seguro
  async signIn(email, password) {
    try {
      // Validación previa
      if (!email || !password) {
        throw new Error('Email y contraseña son requeridos');
      }

      // Sanitizar entrada
      const sanitizedEmail = sanitizeInput(email, 'email');
      
      // Rate limiting check (implementación básica)
      if (this.retryCount >= CONFIG.security.rateLimit.login.maxAttempts) {
        throw new Error('Demasiados intentos. Intente más tarde.');
      }

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: password
      });

      if (error) {
        this.retryCount++;
        
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Credenciales inválidas');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Debe confirmar su email antes de iniciar sesión');
        }
        throw new Error(error.message);
      }

      // Reset retry count on success
      this.retryCount = 0;

      if (data?.user) {
        await this.loadUserProfile(data.user.id);
        await this.updateLastLogin(data.user.id);
      }

      return { success: true, data, error: null };
    } catch (error) {
      console.error('Error en signIn:', error);
      return { success: false, data: null, error };
    }
  }

  // Registro seguro
  async signUp(email, password, fullName, phone = '') {
    try {
      // Validaciones
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      // Sanitizar entrada
      const sanitizedEmail = sanitizeInput(email, 'email');
      const sanitizedName = sanitizeInput(fullName, 'text');
      const sanitizedPhone = sanitizeInput(phone, 'phone');

      // Verificar si el email ya existe
      const { data: existingUser } = await this.supabase
        .from('profiles')
        .select('email')
        .eq('email', sanitizedEmail)
        .single();

      if (existingUser) {
        throw new Error('Este email ya está registrado');
      }

      const { data, error } = await this.supabase.auth.signUp({
        email: sanitizedEmail,
        password: password,
        options: {
          data: {
            full_name: sanitizedName,
            phone: sanitizedPhone
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          throw new Error('Este email ya está registrado');
        }
        throw error;
      }

      // Crear perfil de usuario
      if (data?.user) {
        const { error: profileError } = await this.supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: sanitizedEmail,
            full_name: sanitizedName,
            phone: sanitizedPhone,
            role: 'miembro', // Rol por defecto
            avatar_url: null,
            must_change_password: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('Error al crear perfil:', profileError);
          // Intentar eliminar el usuario de auth si falla la creación del perfil
          await this.supabase.auth.admin.deleteUser(data.user.id);
          throw new Error('Error al crear el perfil de usuario');
        }
      }

      return { success: true, data, error: null };
    } catch (error) {
      console.error('Error en signUp:', error);
      return { success: false, data: null, error };
    }
  }

  // Logout
  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;

      this.session = null;
      this.user = null;
      this.profile = null;
      
      // Limpiar storage
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();

      return { success: true, error: null };
    } catch (error) {
      console.error('Error en signOut:', error);
      return { success: false, error };
    }
  }

  // Cargar perfil de usuario
  async loadUserProfile(userId) {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      this.user = { ...this.user, ...data };
      this.profile = data;
      
      return { success: true, data, error: null };
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      return { success: false, data: null, error };
    }
  }

  // Actualizar último login
  async updateLastLogin(userId) {
    try {
      const { error } = await this.supabase
        .from('profiles')
        .update({
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error al actualizar último login:', error);
    }
  }

  // Cambiar contraseña
  async changePassword(currentPassword, newPassword) {
    try {
      // Validar nueva contraseña
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Actualizar flag de cambio de contraseña
      if (this.profile) {
        await this.supabase
          .from('profiles')
          .update({
            must_change_password: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', this.profile.id);
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      return { success: false, error };
    }
  }

  // Subir foto de perfil
  async uploadProfileImage(file) {
    try {
      if (!this.profile) {
        throw new Error('No hay usuario autenticado');
      }

      // Validaciones
      if (!file) {
        throw new Error('No se ha seleccionado ningún archivo');
      }

      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen');
      }

      if (file.size > CONFIG.limits.maxFileSize) {
        throw new Error(`La imagen debe ser menor a ${CONFIG.limits.maxFileSize / (1024 * 1024)}MB`);
      }

      // Crear nombre único
      const fileExt = file.name.split('.').pop();
      const fileName = `${this.profile.id}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Subir a Supabase Storage
      const { error: uploadError } = await this.supabase.storage
        .from('profiles')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data } = this.supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // Actualizar perfil
      const { error: updateError } = await this.supabase
        .from('profiles')
        .update({
          avatar_url: data.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.profile.id);

      if (updateError) {
        // Limpiar archivo en caso de error
        await this.supabase.storage.from('profiles').remove([filePath]);
        throw updateError;
      }

      // Actualizar estado local
      this.profile.avatar_url = data.publicUrl;

      return { success: true, data: data.publicUrl, error: null };
    } catch (error) {
      console.error('Error al subir imagen:', error);
      return { success: false, data: null, error };
    }
  }

  // Verificar si tiene permiso
  hasPermission(permission) {
    return this.profile ? hasPermission(this.profile.role, permission) : false;
  }
}

// Servicio de gestión de usuarios
export class UserService {
  constructor() {
    this.supabase = supabase;
  }

  // Listar usuarios con filtros
  async getUsers(filters = {}) {
    try {
      let query = this.supabase
        .from('profiles')
        .select('id, email, full_name, role, phone, avatar_url, created_at, last_login, account_locked')
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters.role && filters.role !== 'all') {
        query = query.eq('role', filters.role);
      }

      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data, error: null };
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      return { success: false, data: null, error };
    }
  }

  // Cambiar rol de usuario
  async changeUserRole(userId, newRole) {
    try {
      // Validar que el rol existe
      if (!CONFIG.roles[newRole]) {
        throw new Error('Rol inválido');
      }

      const { error } = await this.supabase
        .from('profiles')
        .update({
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Log de auditoría
      await this.logAuditAction('change_role', {
        target_user_id: userId,
        old_role: 'unknown', // Se podría obtener el rol anterior
        new_role: newRole
      });

      return { success: true, error: null };
    } catch (error) {
      console.error('Error al cambiar rol:', error);
      return { success: false, error };
    }
  }

  // Actualizar perfil de usuario
  async updateUserProfile(userId, updates) {
    try {
      // Sanitizar datos
      const sanitizedUpdates = {
        full_name: sanitizeInput(updates.full_name, 'text'),
        phone: sanitizeInput(updates.phone, 'phone'),
        updated_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('profiles')
        .update(sanitizedUpdates)
        .eq('id', userId);

      if (error) throw error;

      // Log de auditoría
      await this.logAuditAction('update_profile', {
        target_user_id: userId,
        changes: sanitizedUpdates
      });

      return { success: true, error: null };
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      return { success: false, error };
    }
  }

  // Crear usuario (solo admin)
  async createUser(userData) {
    try {
      // Validaciones
      const passwordValidation = validatePassword(userData.password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      // Sanitizar datos
      const sanitizedData = {
        email: sanitizeInput(userData.email, 'email'),
        password: userData.password,
        full_name: sanitizeInput(userData.full_name, 'text'),
        phone: sanitizeInput(userData.phone, 'phone'),
        role: userData.role || 'miembro'
      };

      const { data, error } = await this.supabase.auth.admin.createUser({
        email: sanitizedData.email,
        password: sanitizedData.password,
        email_confirm: true,
        user_metadata: {
          full_name: sanitizedData.full_name,
          phone: sanitizedData.phone
        }
      });

      if (error) throw error;

      // Crear perfil
      if (data?.user) {
        const { error: profileError } = await this.supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: sanitizedData.email,
            full_name: sanitizedData.full_name,
            phone: sanitizedData.phone,
            role: sanitizedData.role,
            must_change_password: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          // Eliminar usuario si falla la creación del perfil
          await this.supabase.auth.admin.deleteUser(data.user.id);
          throw profileError;
        }
      }

      // Log de auditoría
      await this.logAuditAction('create_user', {
        target_user_id: data?.user?.id,
        email: sanitizedData.email,
        role: sanitizedData.role
      });

      return { success: true, data, error: null };
    } catch (error) {
      console.error('Error al crear usuario:', error);
      return { success: false, data: null, error };
    }
  }

  // Eliminar usuario
  async deleteUser(userId) {
    try {
      // Verificar que no sea el último admin
      const { data: adminCount } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .neq('id', userId);

      if (adminCount.length === 0) {
        throw new Error('No se puede eliminar el último administrador');
      }

      // Eliminar usuario de Supabase Auth
      const { error: authError } = await this.supabase.auth.admin.deleteUser(userId);
      if (authError) throw authError;

      // Log de auditoría
      await this.logAuditAction('delete_user', {
        target_user_id: userId
      });

      return { success: true, error: null };
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      return { success: false, error };
    }
  }

  // Obtener estadísticas de usuarios
  async getUserStats() {
    try {
      const { count: total } = await this.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { data: byRole } = await this.supabase
        .from('profiles')
        .select('role')
        .order('role');

      const roleCounts = byRole?.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {}) || {};

      const { data: recentUsers } = await this.supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      return {
        success: true,
        data: {
          total: total || 0,
          byRole: {
            admin: roleCounts.admin || 0,
            lider: roleCounts.lider || 0,
            miembro: roleCounts.miembro || 0
          },
          recentUsers: recentUsers || []
        },
        error: null
      };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return { success: false, data: null, error };
    }
  }

  // Log de auditoría
  async logAuditAction(action, details = {}) {
    try {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      await this.supabase
        .from('audit_log')
        .insert({
          id: generateId(),
          action: action,
          user_id: user.id,
          target_user_id: details.target_user_id || null,
          details: details,
          ip_address: null, // Se podría obtener del request
          user_agent: navigator.userAgent,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error al registrar auditoría:', error);
    }
  }
}

// Servicio de eventos
export class EventService {
  constructor() {
    this.supabase = supabase;
  }

  // Crear evento
  async createEvent(eventData) {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .insert({
          id: generateId(),
          title: sanitizeInput(eventData.title, 'text'),
          description: sanitizeInput(eventData.description, 'text'),
          start_datetime: eventData.start_datetime,
          end_datetime: eventData.end_datetime,
          location: sanitizeInput(eventData.location, 'text'),
          max_attendees: eventData.max_attendees,
          created_by: eventData.created_by,
          ministry_id: eventData.ministry_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data, error: null };
    } catch (error) {
      console.error('Error al crear evento:', error);
      return { success: false, data: null, error };
    }
  }

  // Listar eventos
  async getEvents(filters = {}) {
    try {
      let query = this.supabase
        .from('events')
        .select(`
          id, title, description, start_datetime, end_datetime,
          location, max_attendees, created_by, ministry_id,
          profiles!events_created_by_fkey (full_name),
          ministries!events_ministry_id_fkey (name)
        `)
        .order('start_datetime', { ascending: true });

      // Aplicar filtros
      if (filters.ministry_id) {
        query = query.eq('ministry_id', filters.ministry_id);
      }

      if (filters.date_from) {
        query = query.gte('start_datetime', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('start_datetime', filters.date_to);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data, error: null };
    } catch (error) {
      console.error('Error al obtener eventos:', error);
      return { success: false, data: null, error };
    }
  }
}

// Instancias de servicios
export const authService = new AuthService();
export const userService = new UserService();
export const eventService = new EventService();

// Función para inicializar servicios
export function initializeServices() {
  // Configurar listeners de autenticación
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      await authService.loadUserProfile(session.user.id);
    } else if (event === 'SIGNED_OUT') {
      authService.session = null;
      authService.user = null;
      authService.profile = null;
    }
  });

  // Configurar interceptores de red (si es necesario)
  if (CONFIG.app.environment === 'development') {
    console.log('🚀 Servicios inicializados correctamente');
  }
}

// Exportar servicios por defecto
export default {
  authService,
  userService,
  eventService,
  initializeServices
};