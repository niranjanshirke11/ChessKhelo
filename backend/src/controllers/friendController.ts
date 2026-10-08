import { Response } from 'express';
import { FriendRequest } from '../models/FriendRequest';
import { User } from '../models/User';
import { AuthRequest } from '../types';

// Send a friend request
export const sendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!.userId;
    const { username } = req.body as { username: string };

    const target = await User.findOne({ username });
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target._id.toString() === me) return res.status(400).json({ message: 'Cannot friend yourself' });

    const existing = await FriendRequest.findOne({
      $or: [{ from: me, to: target._id }, { from: target._id, to: me }]
    });
    if (existing) {
      if (existing.status === 'accepted') return res.status(400).json({ message: 'Already friends' });
      if (existing.status === 'pending')  return res.status(400).json({ message: 'Request already sent' });
      existing.status = 'pending';
      await existing.save();
      return res.json({ message: 'Friend request sent' });
    }

    await FriendRequest.create({ from: me, to: target._id });
    res.json({ message: 'Friend request sent' });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// Accept or decline a request
export const respondRequest = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!.userId;
    const { requestId, action } = req.body as { requestId: string; action: 'accept' | 'decline' };

    const fr = await FriendRequest.findById(requestId);
    if (!fr || fr.to.toString() !== me) return res.status(404).json({ message: 'Request not found' });

    fr.status = action === 'accept' ? 'accepted' : 'declined';
    await fr.save();
    res.json({ message: action === 'accept' ? 'Friend added!' : 'Request declined' });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// List friends (accepted)
export const getFriends = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!.userId;
    const requests = await FriendRequest.find({
      $or: [{ from: me }, { to: me }],
      status: 'accepted',
    })
      .populate('from', 'username rating rankTier avatar isOnline lastSeen')
      .populate('to',   'username rating rankTier avatar isOnline lastSeen');

    const friends = requests.map((r: any) =>
      r.from._id.toString() === me ? r.to : r.from
    );
    res.json({ friends });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// Incoming pending requests
export const getIncoming = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!.userId;
    const requests = await FriendRequest.find({ to: me, status: 'pending' })
      .populate('from', 'username rating rankTier avatar isOnline');
    res.json({ requests });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// Remove friend
export const removeFriend = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!.userId;
    const { friendId } = req.params as { friendId: string };
    await FriendRequest.deleteOne({
      $or: [{ from: me, to: friendId }, { from: friendId, to: me }],
      status: 'accepted',
    });
    res.json({ message: 'Friend removed' });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};

// Search users to add
export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const me = req.user!.userId;
    const { q } = req.query as { q: string };
    if (!q || q.length < 2) return res.json({ users: [] });
    const users = await User.find({
      username: { $regex: q, $options: 'i' },
      _id: { $ne: me },
    }).select('username rating rankTier avatar isOnline').limit(10);
    res.json({ users });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
};
