import mongoose from 'mongoose';

// Clase para manejar la conexión a la base de datos
export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('Database already connected');
      return;
    }

    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/music-streamer';
      
      const options = {
        maxPoolSize: 10, // Máximo de conexiones en el pool
        serverSelectionTimeoutMS: 5000, // Tiempo de espera para seleccionar servidor
        socketTimeoutMS: 45000, // Tiempo de espera para sockets
      };

      await mongoose.connect(mongoUri, options);
      
      this.isConnected = true;
      console.log('✅ Connected to MongoDB successfully');

      // Manejar eventos de conexión
      this.setupEventHandlers();
    } catch (error) {
      console.error('❌ Error connecting to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('✅ Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  private setupEventHandlers(): void {
    const connection = mongoose.connection;

    connection.on('connected', () => {
      console.log('📡 Mongoose connected to MongoDB');
    });

    connection.on('error', (error) => {
      console.error('❌ Mongoose connection error:', error);
      this.isConnected = false;
    });

    connection.on('disconnected', () => {
      console.log('📴 Mongoose disconnected');
      this.isConnected = false;
    });

    // Terminar proceso cuando la conexión se cierra
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  // Método para verificar la conexión
  public async ping(): Promise<boolean> {
    try {
      await mongoose.connection.db.admin().ping();
      return true;
    } catch (error) {
      console.error('Database ping failed:', error);
      return false;
    }
  }

  // Método para obtener estadísticas de la conexión
  public async getStats(): Promise<any> {
    try {
      const stats = await mongoose.connection.db.stats();
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        indexSize: stats.indexSize,
        storageSize: stats.storageSize,
        objects: stats.objects,
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return null;
    }
  }
}

// Exportar la instancia singleton
export const database = DatabaseConnection.getInstance();

// Función para conectar a la base de datos (compatibilidad con código existente)
export const connectDatabase = async (): Promise<void> => {
  await database.connect();
};

// Función para desconectar
export const disconnectDatabase = async (): Promise<void> => {
  await database.disconnect();
};
