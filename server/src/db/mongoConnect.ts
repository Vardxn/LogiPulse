import mongoose from 'mongoose';

export async function connectMongo(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('MongoDB Connection Error: MONGO_URI is not defined in environmental variables.');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB successfully connected.');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
}
