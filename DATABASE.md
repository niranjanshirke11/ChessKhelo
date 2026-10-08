# 🗄 ChessKhelo — Database Documentation

**Database Type:** MongoDB Atlas (Cloud-hosted NoSQL Document Database)  
**Object Data Modeling (ODM):** Mongoose (`v8.2.2`)  
**Purpose:** Stores user profiles, authentication credentials, competitive Elo ratings, match histories, and friendship records.

---

## 1. Database Architecture Overview

ChessKhelo uses **MongoDB** because chess applications naturally benefit from flexible document schemas:
- A completed chess match contains variable-length move histories and PGN records that fit neatly in a single document without requiring complex multi-table SQL joins.
- User profile documents store player statistics, win streaks, and historical rating snapshots in embedded arrays.

```
┌────────────────────────────────┐         ┌────────────────────────────────┐
│        User Document           │         │         Game Document          │
├────────────────────────────────┤         ├────────────────────────────────┤
│ _id: ObjectId                  │◄───┐    │ _id: ObjectId                  │
│ username: String (Unique)      │    └───┼│ white: ObjectId (Ref User)     │
│ email: String (Unique)         │        ├│ black: ObjectId (Ref User)     │
│ passwordHash: String (Bcrypt)  │        ││ timeControl: { initial, inc }  │
│ rating: Number (Default: 1200) │        ││ moves: [ Embedded Array ]      │
│ rankTier: String (Enum)        │        ││ fen: String                    │
│ stats: { wins, losses, draws } │        ││ result: '1-0'|'0-1'|'1/2-1/2'  │
│ isOnline: Boolean              │        ││ termination: String            │
└────────────────────────────────┘        ││ ratingChange: { white, black } │
                                          └────────────────────────────────┘
                 ▲
                 │ (References)
┌────────────────┴───────────────┐
│     FriendRequest Document     │
├────────────────────────────────┤
│ _id: ObjectId                  │
│ from: ObjectId (Ref User)      │
│ to: ObjectId (Ref User)        │
│ status: 'pending'|'accepted'   │
└────────────────────────────────┘
```

---

## 2. Collections & Schema Details

### 1. `users` Collection (`backend/src/models/User.ts`)

Represents a registered chess player on ChessKhelo.

| Field Name | Type | Constraints / Default | Purpose & Why It Exists |
|---|---|---|---|
| `_id` | `ObjectId` | Auto-generated Primary Key | Unique document identifier in MongoDB |
| `username` | `String` | Required, Unique, Trim, Min 3, Max 20 | Player handle displayed on leaderboard and game board |
| `email` | `String` | Required, Unique, Lowercase, Trim | Used for secure login and account recovery |
| `passwordHash`| `String` | Required, `select: false` | 12-round bcrypt salted hash. Hidden from standard queries for security |
| `avatar` | `String` | Default: `'♟'` | Emoji icon or profile picture URL |
| `country` | `String` | Default: `'🌍'` | Country flag emoji displayed next to player name |
| `rating` | `Number` | Default: `1200`, Min: `100`, Max: `3200` | Elo rating indicating player skill level |
| `ratingHistory`| `Array` | `[{ rating: Number, date: Date }]` | Time-series data points used to draw the SVG rating graph in player profiles |
| `rankTier` | `String` | Enum: `Bronze`, `Silver`, `Gold`, `Platinum`, `Diamond` | Competitive tier automatically updated based on Elo |
| `plan` | `String` | Enum: `free`, `premium`, `elite` (Default: `free`) | Account plan tier for feature demonstration |
| `stats.gamesPlayed` | `Number` | Default: `0` | Total number of completed games |
| `stats.wins` | `Number` | Default: `0` | Total matches won |
| `stats.losses` | `Number` | Default: `0` | Total matches lost |
| `stats.draws` | `Number` | Default: `0` | Total matches drawn |
| `stats.winStreak` | `Number` | Default: `0` | Consecutive wins currently active |
| `stats.bestStreak`| `Number` | Default: `0` | Historical highest win streak |
| `isOnline` | `Boolean` | Default: `false` | Real-time status for online counter & friend list |
| `lastSeen` | `Date` | Default: `Date.now` | Timestamp of last user interaction |
| `createdAt` / `updatedAt` | `Date` | Managed by Mongoose timestamps | Audit timestamps for account creation and updates |

#### User Model Indexes:
- `{ rating: -1 }`: Optimizes global leaderboard queries sorted by rating.
- `{ username: 1 }`: Ensures unique usernames and fast profile lookups.
- `{ email: 1 }`: Ensures unique emails and fast authentication lookups.

---

### 2. `games` Collection (`backend/src/models/Game.ts`)

Represents a chess match played between two players or against the AI bot.

| Field Name | Type | Constraints / Default | Purpose & Why It Exists |
|---|---|---|---|
| `_id` | `ObjectId` | Auto-generated Primary Key | Internal database identifier |
| `gameId` | `String` | Unique, 8-char uppercase UUID | Short, shareable game room identifier (e.g. `A7B2C9D1`) |
| `white` | `ObjectId` or `String` | Required | Reference to `User._id` playing White, or `'ai'` |
| `black` | `ObjectId` or `String` | Required | Reference to `User._id` playing Black, or `'ai'` |
| `timeControl.initial` | `Number` | Required (in seconds) | Clock start time (e.g., `600` for 10 min Rapid, `180` for 3 min Blitz) |
| `timeControl.increment` | `Number` | Default: `0` (in seconds) | Fischer clock bonus added to clock after each move (e.g. `+10`) |
| `moves` | `Array of Objects` | `[{ from, to, san, fen, timestamp, timeLeft }]` | Rich move objects for detailed match analysis |
| `moveList` | `Array of Strings` | e.g. `['e2,e4', 'e7,e5']` | Compact move notations used for spectator replay |
| `fen` | `String` | Default: Starting position FEN | Current Forsyth-Edwards Notation describing board state |
| `pgn` | `String` | Default: `''` | Portable Game Notation string for match export |
| `result` | `String` | Enum: `'1-0'`, `'0-1'`, `'1/2-1/2'`, `'*'` | Match outcome (`*` = in progress, `1-0` = White won, etc.) |
| `termination` | `String` | Enum: `checkmate`, `resignation`, `timeout`, `draw_agreement`, `stalemate`, `in_progress` | Specific rule that concluded the game |
| `ratingChange.white` | `Number` | Default: `0` | Points gained/lost by White player |
| `ratingChange.black` | `Number` | Default: `0` | Points gained/lost by Black player |
| `isRanked` | `Boolean` | Default: `true` | True for multiplayer ranked games; false for practice/AI |
| `spectators` | `Number` | Default: `0` | Active spectator count during live match |
| `startedAt` / `endedAt` | `Date` | Match duration timestamps | Used to compute game duration in match history |

#### Game Model Indexes:
- `{ gameId: 1 }`: Fast lookup when joining or spectating a room.
- `{ white: 1, createdAt: -1 }`: Fast retrieval of user's match history.
- `{ black: 1, createdAt: -1 }`: Fast retrieval of user's match history.

---

### 3. `friendrequests` Collection (`backend/src/models/FriendRequest.ts`)

Represents social connections and pending invitations between players.

| Field Name | Type | Constraints / Default | Purpose & Why It Exists |
|---|---|---|---|
| `_id` | `ObjectId` | Auto-generated Primary Key | Identifier for request document |
| `from` | `ObjectId` | Required, Ref: `'User'` | User who initiated the friend request |
| `to` | `ObjectId` | Required, Ref: `'User'` | User who received the friend request |
| `status` | `String` | Enum: `pending`, `accepted`, `declined` | Status of the friendship request |
| `createdAt` | `Date` | Default: `Date.now` | When the request was sent |

#### Unique Index:
- `{ from: 1, to: 1 }` (Unique): Prevents duplicate friend requests between the same two users.

---

## 3. How to Connect to the Database

1. Create a free account at [MongoDB Atlas](https://cloud.mongodb.com).
2. Create an **M0 Free Cluster**.
3. Under **Database Access**, create a user (e.g., `chessuser` with a secure password).
4. Under **Network Access**, add `0.0.0.0/0` (allow from anywhere) for development.
5. Click **Connect** → **Drivers** → copy the connection string:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/chesskhelo?retryWrites=true&w=majority
   ```
6. Paste the string into `backend/.env`.
