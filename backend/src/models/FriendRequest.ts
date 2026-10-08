import { Schema, model, Document, Types } from 'mongoose';

export interface IFriendRequest extends Document {
  from: Types.ObjectId;
  to: Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
}

const friendRequestSchema = new Schema<IFriendRequest>({
  from:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  to:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending','accepted','declined'], default: 'pending' },
}, { timestamps: true });

friendRequestSchema.index({ from: 1, to: 1 }, { unique: true });

export const FriendRequest = model<IFriendRequest>('FriendRequest', friendRequestSchema);
