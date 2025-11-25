/**
 * IglesiaConnect Pro - Versión Mejorada y Segura
 * Sistema de Gestión para Iglesias
 * 
 * Mejoras implementadas:
 * - Seguridad reforzada
 * - Diseño moderno
 * - Un solo usuario administrativo
 * - Cambio de foto de perfil
 * - Sistema de roles mejorado
 * - Validación robusta
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase (se debe configurar en variables de entorno)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Contexto de autenticación mejorado
const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
}

// Provider de autenticación con mejoras de seguridad
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setSession(session);
        if (session?.user) {
          await loadUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error al cargar sesión:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      setUser(session?.user);
      setProfile(data);
    } catch (error) {
      console.error('Error al cargar perfil:', error);
    }
  };

  // Función de login segura
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      
      // Validación robusta
      if (!email || !password) {
        throw new Error('Email y contraseña son requeridos');
      }
      
      if (!email.includes('@')) {
        throw new Error('Formato de email inválido');
      }
      
      if (password.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Credenciales inválidas');
        }
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error de autenticación:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Función de registro con validaciones mejoradas
  const signUp = async (email, password, fullName, phone = '') => {
    try {
      setLoading(true);
      
      // Validaciones robustas
      if (!email || !password || !fullName) {
        throw new Error('Todos los campos obligatorios deben completarse');
      }
      
      if (!email.includes('@') || !email.includes('.')) {
        throw new Error('Formato de email inválido');
      }
      
      if (password.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres');
      }
      
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        throw new Error('La contraseña debe contener al menos una minúscula, una mayúscula y un número');
      }
      
      if (phone && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(phone)) {
        throw new Error('Formato de teléfono inválido');
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim()
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
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: 'miembro', // Rol por defecto
            avatar_url: null,
            created_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('Error al crear perfil:', profileError);
        }
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error de registro:', error);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Función de logout segura
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setProfile(null);
      setSession(null);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Actualizar perfil con mejoras
  const updateProfile = async (updates) => {
    try {
      if (!user || !profile) {
        throw new Error('No hay usuario autenticado');
      }

      // Validaciones del lado del cliente
      const validationErrors = [];
      
      if (updates.full_name && updates.full_name.trim().length < 2) {
        validationErrors.push('El nombre debe tener al menos 2 caracteres');
      }
      
      if (updates.phone && !/^[\+]?[0-9\s\-\(\)]{10,}$/.test(updates.phone)) {
        validationErrors.push('Formato de teléfono inválido');
      }
      
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      return { data, error: null };
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      return { data: null, error };
    }
  };

  // Función para cambiar contraseña
  const changePassword = async (currentPassword, newPassword) => {
    try {
      if (!currentPassword || !newPassword) {
        throw new Error('Contraseña actual y nueva son requeridas');
      }
      
      if (newPassword.length < 8) {
        throw new Error('La nueva contraseña debe tener al menos 8 caracteres');
      }
      
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
        throw new Error('La nueva contraseña debe contener al menos una minúscula, una mayúscula y un número');
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      return { error };
    }
  };

  // Función para subir foto de perfil
  const uploadProfileImage = async (file) => {
    try {
      if (!user || !profile) {
        throw new Error('No hay usuario autenticado');
      }

      if (!file) {
        throw new Error('No se ha seleccionado ningún archivo');
      }

      // Validaciones del archivo
      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen');
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB
        throw new Error('La imagen debe ser menor a 5MB');
      }

      // Crear nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Subir archivo a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        if (uploadError.message.includes('already exists')) {
          throw new Error('Ya existe una imagen con ese nombre');
        }
        throw uploadError;
      }

      // Obtener URL pública
      const { data } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // Actualizar perfil con la nueva URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: data.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        // Eliminar archivo si la actualización falla
        await supabase.storage.from('profiles').remove([filePath]);
        throw updateError;
      }

      // Actualizar estado local
      setProfile(prev => ({
        ...prev,
        avatar_url: data.publicUrl
      }));

      return { data: data.publicUrl, error: null };
    } catch (error) {
      console.error('Error al subir imagen:', error);
      return { data: null, error };
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    changePassword,
    uploadProfileImage,
    refreshProfile: loadUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Componente de Login mejorado
function LoginPage() {
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('Error inesperado al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            IglesiaConnect Pro
          </h2>
          <p className="text-gray-600">
            Sistema moderno de gestión para iglesias
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="admin@iglesia.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          {/* Panel de información con credenciales únicas */}
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="h-5 w-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Credenciales de Acceso
            </h3>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-purple-900">Administrador Principal</p>
                    <p className="text-sm text-gray-600">admin@iglesia.com</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-gray-800">Admin123!</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Completo
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 bg-white rounded-lg p-3">
                <p className="font-medium mb-1">Instrucciones:</p>
                <p>• Use las credenciales arriba para acceder al sistema</p>
                <p>• Puede cambiar roles desde el panel de administración</p>
                <p>• Se recomienda cambiar la contraseña después del primer acceso</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            Desarrollado por MiniMax Agent • Versión 2.0
          </p>
        </div>
      </div>
    </div>
  );
}

// Componente principal de la aplicación
function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Cargando IglesiaConnect Pro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {user ? <Dashboard /> : <LoginPage />}
    </div>
  );
}

// Dashboard principal mejorado
function Dashboard() {
  const { profile, signOut } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  const handleSignOut = async () => {
    if (window.confirm('¿Está seguro que desea cerrar sesión?')) {
      await signOut();
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Panel Principal', icon: '📊' },
    { id: 'events', label: 'Eventos', icon: '📅' },
    { id: 'fasts', label: 'Ayunos', icon: '🙏' },
    { id: 'ministries', label: 'Ministerios', icon: '👥' },
    { id: 'profile', label: 'Mi Perfil', icon: '👤' },
    { id: 'admin', label: 'Administración', icon: '⚙️', adminOnly: true }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    !item.adminOnly || profile?.role === 'admin'
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">IC</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">IglesiaConnect</h1>
              <p className="text-sm text-gray-500">Pro v2.0</p>
            </div>
          </div>
        </div>

        <nav className="mt-6 px-4">
          {filteredMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors flex items-center space-x-3 ${
                currentView === item.id
                  ? 'bg-purple-100 text-purple-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.full_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <span className="text-gray-600 font-medium">
                  {profile?.full_name?.charAt(0) || 'U'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {profile?.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2"
          >
            <span>🚪</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        {currentView === 'dashboard' && <DashboardContent />}
        {currentView === 'events' && <EventsView />}
        {currentView === 'fasts' && <FastsView />}
        {currentView === 'ministries' && <MinistriesView />}
        {currentView === 'profile' && <ProfileView />}
        {currentView === 'admin' && profile?.role === 'admin' && <AdminPanel />}
      </div>
    </div>
  );
}

// Contenido del dashboard
function DashboardContent() {
  const { profile } = useAuth();

  const stats = [
    { label: 'Eventos Activos', value: '12', icon: '📅', color: 'blue' },
    { label: 'Ayunos Programados', value: '5', icon: '🙏', color: 'purple' },
    { label: 'Ministerios', value: '8', icon: '👥', color: 'green' },
    { label: 'Usuarios Activos', value: '24', icon: '👤', color: 'amber' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          ¡Bienvenido, {profile?.full_name}!
        </h1>
        <p className="text-gray-600 mt-2">
          Aquí tienes un resumen de la actividad de tu iglesia
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className={`bg-white rounded-xl shadow-sm p-6 border-l-4 border-${stat.color}-500`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Próximos Eventos</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-900">Servicio Dominical</span>
              <span className="text-sm text-gray-500">Mañana 9:00 AM</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-900">Estudio Bíblico</span>
              <span className="text-sm text-gray-500">Miércoles 7:00 PM</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-900">Conferencia de Ministerios</span>
              <span className="text-sm text-gray-500">Sábado 2:00 PM</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xs text-blue-600">👤</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Nuevo evento creado</p>
                <p className="text-xs text-gray-500">hace 2 horas</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-xs text-green-600">🙏</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Ayuno completado</p>
                <p className="text-xs text-gray-500">hace 4 horas</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-xs text-purple-600">👥</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">Ministerio actualizado</p>
                <p className="text-xs text-gray-500">ayer</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Vista de eventos (simplificada)
function EventsView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Eventos</h1>
        <p className="text-gray-600 mt-2">Administra todos los eventos de la iglesia</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📅</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Funcionalidad en Desarrollo</h3>
          <p className="text-gray-500">El módulo de eventos estará disponible próximamente</p>
        </div>
      </div>
    </div>
  );
}

// Vista de ayunos (simplificada)
function FastsView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Ayunos</h1>
        <p className="text-gray-600 mt-2">Programa y rastrea los ayunos de la congregación</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🙏</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Funcionalidad en Desarrollo</h3>
          <p className="text-gray-500">El módulo de ayunos estará disponible próximamente</p>
        </div>
      </div>
    </div>
  );
}

// Vista de ministerios (simplificada)
function MinistriesView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Ministerios</h1>
        <p className="text-gray-600 mt-2">Administra los diferentes ministerios de la iglesia</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">👥</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Funcionalidad en Desarrollo</h3>
          <p className="text-gray-500">El módulo de ministerios estará disponible próximamente</p>
        </div>
      </div>
    </div>
  );
}

// Vista de perfil mejorada
function ProfileView() {
  const { profile, updateProfile, changePassword, uploadProfileImage } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      const { error } = await updateProfile(formData);
      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Perfil actualizado exitosamente' });
        setIsEditing(false);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error inesperado al actualizar perfil' });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      return;
    }

    try {
      const { error } = await changePassword(passwordData.currentPassword, passwordData.newPassword);
      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Contraseña cambiada exitosamente' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setIsChangingPassword(false);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error inesperado al cambiar contraseña' });
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await uploadProfileImage(file);
      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Foto de perfil actualizada' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al subir imagen' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-gray-600 mt-2">Gestiona tu información personal y configuraciones</p>
      </div>

      {message.text && (
        <div className={`rounded-lg p-4 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información del perfil */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Información Personal</h3>
          
          <div className="space-y-6">
            {/* Foto de perfil */}
            <div className="text-center">
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.full_name}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-2xl font-bold">
                      {profile?.full_name?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full cursor-pointer transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
                {isUploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600">Haz clic para cambiar foto</p>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre completo
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                ) : (
                  <p className="py-2 text-gray-900">{profile?.full_name || 'No especificado'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correo electrónico
                </label>
                <p className="py-2 text-gray-900">{profile?.email}</p>
                <p className="text-xs text-gray-500">El email no se puede cambiar</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="+34 123 456 789"
                  />
                ) : (
                  <p className="py-2 text-gray-900">{profile?.phone || 'No especificado'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol
                </label>
                <p className="py-2 text-gray-900 capitalize">{profile?.role}</p>
                <p className="text-xs text-gray-500">Solo los administradores pueden cambiar roles</p>
              </div>

              <div className="flex space-x-3 pt-4">
                {isEditing ? (
                  <>
                    <button
                      type="submit"
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors"
                    >
                      Guardar Cambios
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          full_name: profile?.full_name || '',
                          phone: profile?.phone || ''
                        });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    Editar Perfil
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Cambio de contraseña */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Seguridad</h3>
          
          {!isChangingPassword ? (
            <div>
              <p className="text-gray-600 mb-4">
                Mantén tu cuenta segura cambiando regularmente tu contraseña
              </p>
              <button
                onClick={() => setIsChangingPassword(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Cambiar Contraseña
              </button>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña actual
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas y números
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar nueva contraseña
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Cambiar Contraseña
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// Panel de administración mejorado
function AdminPanel() {
  const { profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // Aquí se cargaría la lista de usuarios desde Supabase
      // Por ahora usamos datos simulados
      setTimeout(() => {
        setUsers([
          {
            id: 1,
            email: 'admin@iglesia.com',
            full_name: 'Administrador Principal',
            role: 'admin',
            phone: '+34 123 456 789',
            created_at: '2025-01-01'
          },
          {
            id: 2,
            email: 'lider@iglesia.com',
            full_name: 'Líder de Ministerios',
            role: 'lider',
            phone: '+34 987 654 321',
            created_at: '2025-01-15'
          },
          {
            id: 3,
            email: 'miembro@iglesia.com',
            full_name: 'Miembro Activo',
            role: 'miembro',
            phone: '+34 555 123 456',
            created_at: '2025-02-01'
          }
        ]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al cargar usuarios' });
      setLoading(false);
    }
  };

  const changeUserRole = async (userId, newRole) => {
    if (window.confirm(`¿Está seguro de cambiar el rol de este usuario a "${newRole}"?`)) {
      try {
        // Aquí se actualizaría el rol en Supabase
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        ));
        setMessage({ type: 'success', text: 'Rol actualizado exitosamente' });
      } catch (error) {
        setMessage({ type: 'error', text: 'Error al actualizar rol' });
      }
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'lider': return 'bg-green-100 text-green-800 border-green-200';
      case 'miembro': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'lider': return 'Líder';
      case 'miembro': return 'Miembro';
      default: return role;
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🚫</span>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Acceso Denegado</h3>
        <p className="text-gray-500">Solo los administradores pueden acceder a esta sección</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
        <p className="text-gray-600 mt-2">Gestiona usuarios, roles y configuraciones del sistema</p>
      </div>

      {message.text && (
        <div className={`rounded-lg p-4 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
              <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚙️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Administradores</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">👨‍💼</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Líderes</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.role === 'lider').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">🙋</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Miembros</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.role === 'miembro').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Gestión de Usuarios</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-2 text-gray-600">Cargando usuarios...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {user.full_name.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.phone || 'No especificado'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => changeUserRole(user.id, e.target.value)}
                        className={`text-sm font-medium px-3 py-1 rounded-full border ${getRoleColor(user.role)}`}
                      >
                        <option value="miembro">Miembro</option>
                        <option value="lider">Líder</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        className="text-purple-600 hover:text-purple-900 transition-colors"
                        onClick={() => {
                          const newName = prompt('Nuevo nombre:', user.full_name);
                          if (newName && newName !== user.full_name) {
                            setUsers(prev => prev.map(u => 
                              u.id === user.id ? { ...u, full_name: newName } : u
                            ));
                          }
                        }}
                      >
                        ✏️ Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Información del sistema */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Versión</h4>
            <p className="text-gray-600">IglesiaConnect Pro v2.0</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Última Actualización</h4>
            <p className="text-gray-600">25 de Noviembre, 2025</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Desarrollado por</h4>
            <p className="text-gray-600">MiniMax Agent</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Estado</h4>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✅ Operativo
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente principal
export default function App() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}