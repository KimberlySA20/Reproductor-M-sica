import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

import MediaFile from '../models/Media';
import User from '../models/User';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

const songs = [
  { title: 'Melodia de Piano', artist: 'Piano Dreams', freq: 440, dur: 30 },
  { title: 'Jazz Nocturno', artist: 'Smooth Jazz Quartet', freq: 330, dur: 25 },
  { title: 'Rock Energetico', artist: 'The Rockers', freq: 523, dur: 35 },
  { title: 'Pop de Verano', artist: 'Summer Vibes', freq: 392, dur: 28 },
  { title: 'Electronica Deep', artist: 'DJ Synth', freq: 262, dur: 40 },
  { title: 'Acustica Relax', artist: 'Folk Singer', freq: 587, dur: 20 },
  { title: 'Hip Hop Beats', artist: 'MC Flow', freq: 349, dur: 32 },
];

async function seed() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/music-streamer';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Check if public songs already exist
  const existing = await MediaFile.countDocuments({ isPublic: true });
  if (existing >= songs.length) {
    console.log(`Already have ${existing} public songs. Skipping seed.`);
    await mongoose.disconnect();
    return;
  }

  // Find or create a system user for public songs
  let systemUser = await User.findOne({ email: 'system@musicstreamer.com' });
  if (!systemUser) {
    systemUser = new User({
      email: 'system@musicstreamer.com',
      password: 'System123456!',
      username: 'Music Streamer',
    });
    await systemUser.save();
    console.log('Created system user');
  }

  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  // Remove old public songs
  await MediaFile.deleteMany({ isPublic: true });

  for (const song of songs) {
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`;
    const filePath = path.join(UPLOAD_DIR, filename);

    console.log(`Generating: ${song.title}...`);
    execSync(
      `ffmpeg -y -f lavfi -i "sine=frequency=${song.freq}:duration=${song.dur}" -b:a 192k "${filePath}"`,
      { stdio: 'pipe' }
    );

    const stat = fs.statSync(filePath);

    const media = new MediaFile({
      title: song.title,
      artist: song.artist,
      filename,
      originalName: `${song.title}.mp3`,
      mimetype: 'audio/mpeg',
      size: stat.size,
      duration: song.dur,
      filePath,
      mediaType: 'audio',
      uploadedBy: systemUser._id,
      isPublic: true,
    });

    await media.save();
    console.log(`  Saved: ${song.title} (${(stat.size / 1024).toFixed(0)} KB) [PUBLIC]`);
  }

  console.log(`\nDone! ${songs.length} public songs available for all users.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
