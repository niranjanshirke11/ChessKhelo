import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser, RankTier } from '../types';

const userSchema = new Schema<IUser>({
  username:     { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20, match: /^[a-zA-Z0-9_]+$/ },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  avatar:       { type: String, default: '♟' },
  country:      { type: String, default: '🌍' },
  rating:       { type: Number, default: 1200, min: 100, max: 3200 },
  ratingHistory: [{ rating: Number, date: { type: Date, default: Date.now } }],
  rankTier:     { type: String, enum: ['Bronze','Silver','Gold','Platinum','Diamond'], default: 'Bronze' },
  plan:         { type: String, enum: ['free','premium','elite'], default: 'free' },
  planExpiresAt: Date,
  stats: {
    gamesPlayed: { type: Number, default: 0 }, wins:       { type: Number, default: 0 },
    losses:      { type: Number, default: 0 }, draws:      { type: Number, default: 0 },
    winStreak:   { type: Number, default: 0 }, bestStreak: { type: Number, default: 0 },
    accuracy:    { type: Number, default: 0 },
  },
  badges:   [String],
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
}, { timestamps: true });

userSchema.index({ rating: -1 }); userSchema.index({ username: 1 }); userSchema.index({ email: 1 });

userSchema.pre('save', async function(next) {
  if (this.isModified('passwordHash')) this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  this.rankTier = this.getRankTier();
  next();
});

userSchema.methods.comparePassword = function(p: string) { return bcrypt.compare(p, this.passwordHash); };
userSchema.methods.getRankTier = function(): RankTier {
  const r = this.rating;
  if (r >= 2200) return 'Diamond'; if (r >= 1800) return 'Platinum';
  if (r >= 1400) return 'Gold';    if (r >= 1000) return 'Silver'; return 'Bronze';
};

export const User = model<IUser>('User', userSchema);
