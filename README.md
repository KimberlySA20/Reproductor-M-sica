# Music Streamer 🎵

Una plataforma moderna de streaming de música distribuida con arquitectura de microservicios.

## 🚀 Características Principales

- 🎵 **Streaming de música y video** de alta calidad
- 🔐 **Autenticación segura** con JWT
- 📱 **Interfaz moderna** con React + TypeScript
- 🎧 **Reproductor avanzado** con controles completos
- ⚡ **Arquitectura distribuida** con workers
- 🐳 **Docker ready** para despliegue fácil
- 🎨 **UI moderna** con Tailwind CSS + shadcn/ui

## 🏗️ Arquitectura

```
MUSIC-STREAMER/
├── client/          # Frontend React + Vite
├── server/          # Backend API principal
├── workers/         # Workers distribuidos
├── shared/          # Código compartido
└── docker-compose.yml
```

## 📋 Requisitos

- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB (local o Docker)
- Opcional: Docker & Docker Compose

## Instalación y Desarrollo

### Opción 1: Desarrollo Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/KimberlySA20/Reproductor-M-sica.git
   cd Reproductor-M-sica
   ```

2. **Instalar dependencias:**
   ```bash
   npm run install:all
   ```

3. **Configurar variables de entorno:**
   ```bash
   # Copiar archivos de ejemplo
   cp server/.env.example server/.env
   cp workers/.env.example workers/.env
   cp client/.env.example client/.env
   ```

4. **Iniciar servicios:**
   ```bash
   # Iniciar todos los servicios
   npm run dev
   
   # O iniciar individualmente
   npm run dev:server   # Backend (puerto 3001)
   npm run dev:client   # Frontend (puerto 3000)
   npm run dev:worker   # Workers (puerto 3002)
   ```

### Opción 2: Docker

1. **Con Docker Compose:**
   ```bash
   # Desarrollo
   npm run docker:dev
   
   # Producción
   npm run docker:prod
   ```

## 🌐 Acceso a la Aplicación

- **Frontend:** http://localhost:3000
- **API Server:** http://localhost:3001
- **Workers:** http://localhost:3002
- **MongoDB:** localhost:27017

## 📁 Estructura del Proyecto

### Client (React + TypeScript)
- `src/components/` - Componentes reutilizables
- `src/pages/` - Páginas principales
- `src/context/` - Estado global
- `src/services/` - Cliente API
- `src/hooks/` - Custom hooks

### Server (Node.js + Express)
- `src/controllers/` - Controladores API
- `src/models/` - Modelos MongoDB
- `src/routes/` - Rutas Express
- `src/middleware/` - Middleware
- `src/services/` - Lógica de negocio

### Workers (Distribuidos)
- `src/controllers/` - Controladores de streaming
- `src/services/` - Servicios de conversión
- `src/routes/` - Rutas de workers

### Shared
- `src/types/` - Tipos TypeScript compartidos
- `src/constants/` - Constantes
- `src/utils/` - Utilidades comunes

## 🎯 Tecnologías

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Node.js, Express, TypeScript, MongoDB
- **Streaming:** FFmpeg, Workers distribuidos
- **DevOps:** Docker, Docker Compose
- **Calidad:** ESLint, Prettier, Husky

## 🚀 Despliegue

### Producción con Docker
```bash
# Construir y levantar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

### Variables de Entorno
Ver los archivos `.env.example` en cada módulo para la configuración completa.


## 📝 Scripts Útiles

```bash
# Desarrollar
npm run dev              # Todos los servicios
npm run build            # Construir todos
npm run start            # Iniciar producción

# Calidad
npm run lint             # Lintear todo
npm run type-check       # Verificar tipos
npm run clean            # Limpiar builds

# Docker
npm run docker:dev       # Desarrollo con Docker
npm run docker:prod      # Producción con Docker
```

## 📄 Licencia

Este proyecto está bajo la licencia MIT.