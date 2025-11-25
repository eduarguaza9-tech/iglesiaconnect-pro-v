# 🚀 Guía de Despliegue en GitHub Pages

## 📋 Preparación del Repositorio

### 1. Crear Repositorio en GitHub
1. Ve a [GitHub.com](https://github.com) e inicia sesión
2. Haz clic en **"+"** → **"New repository"**
3. Nombre del repositorio: `iglesiaconnect-pro-v2`
4. Descripción: "Sistema de Gestión Eclesiástica - Versión Mejorada"
5. Configuración:
   - ✅ Public
   - ✅ Add a README file
   - ✅ Add .gitignore (None)
6. Haz clic en **"Create repository"**

### 2. Subir Archivos
1. En tu repositorio nuevo, haz clic en **"uploading an existing file"**
2. Arrastra y suelta estos archivos del workspace:
   - `index.html`
   - `app_improved.js`
   - `styles_improved.css`
   - `config_secure.js`
   - `services.js`
   - `supabase-client.js`
3. Escribe un mensaje: "Despliegue inicial IglesiaConnect Pro v2.0"
4. Haz clic en **"Commit changes"**

### 3. Configurar GitHub Pages
1. Ve a la pestaña **"Settings"** del repositorio
2. En el menú izquierdo, busca **"Pages"**
3. En **"Source"** selecciona: **"Deploy from a branch"**
4. En **"Branch"** selecciona: **"main"**
5. En **"Folder"** selecciona: **"/ (root)"**
6. Haz clic en **"Save"**

### 4. Obtener tu URL
- GitHub generará una URL como: `https://tu-usuario.github.io/iglesiaconnect-pro-v2`
- El despliegue puede tardar 1-2 minutos
- Verifica en la pestaña **"Pages"** que aparezca: "Your site is live at..."

## ✅ Verificación Post-Despliegue

### Características a Probar:
- [ ] Página carga correctamente
- [ ] Interfaz muestra "IglesiaConnect Pro v2.0"
- [ ] Formulario de login funciona
- [ ] Diseño responsive en móviles
- [ ] No hay errores en la consola del navegador

### URL Final:
Tu aplicación estará disponible en:
`https://TU-USUARIO.github.io/iglesiaconnect-pro-v2`

## 🛠️ Resolución de Problemas

### Si la página muestra 404:
1. Verifica que `index.html` esté en la raíz del repositorio
2. Confirma que GitHub Pages esté activado en Settings
3. Espera 2-3 minutos para el despliegue
4. Verifica que el repositorio sea público

### Para actualizar archivos:
1. Ve a la pestaña **"Code"** → **"Add file"** → **"Upload files"**
2. Sube el archivo actualizado
3. El sitio se actualizará automáticamente

## 📞 Soporte
Si tienes problemas, verifica:
- Repositorio público
- Archivos en la raíz (no en subcarpetas)
- `index.html` presente
- GitHub Pages activado en Settings

---
**IglesiaConnect Pro v2.0** - Sistema de Gestión Eclesiástica Mejorado
Desarrollado por MiniMax Agent - 2025-11-25