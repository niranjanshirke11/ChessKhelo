# ☁️ ChessKhelo — AWS Cloud Deployment Guide (Beginner Friendly)

This guide is written for students and developers deploying their first application to **Amazon Web Services (AWS)**. It explains every cloud concept simply, warns you about costs, provides exact commands, and guides you through every step.

---

## 🏗 AWS Architecture for ChessKhelo

We choose the **simplest, most reliable, and cost-effective architecture**:

```
                             [ User Browser ]
                                     │
               ┌─────────────────────┴─────────────────────┐
               │                                           │
         (Static Files)                            (API & WebSockets)
               │                                           │
               ▼                                           ▼
      ┌─────────────────┐                        ┌───────────────────┐
      │  AWS CloudFront │                        │  AWS EC2 Instance │
      │   (Global CDN)  │                        │ (Ubuntu 22.04 LTS)│
      └────────┬────────┘                        │   Node.js + PM2   │
               │                                 │   Nginx Proxy     │
               ▼                                 └─────────┬─────────┘
      ┌─────────────────┐                                  │
      │  AWS S3 Bucket  │                                  ▼
      │ (React Frontend)│                        ┌───────────────────┐
      └─────────────────┘                        │ MongoDB Atlas (DB)│
                                                 │   (Free Tier M0)  │
                                                 └───────────────────┘
```

### Why this architecture?
1. **Frontend on S3 + CloudFront:** S3 stores static HTML/JS/CSS files with 99.99% availability. CloudFront delivers files with low latency via edge servers worldwide and provides free HTTPS.
2. **Backend on EC2:** Real-time WebSockets (Socket.IO) require a persistent TCP connection. An EC2 virtual machine maintains active socket connections cleanly and easily without serverless timeouts.
3. **Database on MongoDB Atlas:** A cloud-managed NoSQL database that automatically handles backups, connection pooling, and requires zero database administration on EC2.

---

## 💰 AWS Free Tier & Cost Safety Rules

> [!WARNING]
> **AWS Billing Safeguards**
> 1. AWS provides a **12-Month Free Tier** for new accounts.
> 2. **EC2:** 750 hours/month of `t2.micro` (or `t3.micro` depending on region) is 100% Free.
> 3. **S3:** 5 GB standard storage is Free.
> 4. **CloudFront:** 1 TB data transfer out per month is Free.
> 5. **Set up a Billing Alert immediately** in AWS Budgets to alert you if spending exceeds $1.00.

### Setting up a $1.00 Budget Alert:
1. Open the AWS Console → Search for **AWS Budgets**.
2. Click **Create budget** → Choose **Zero spend budget** (or **Monthly cost budget** with `$1.00`).
3. Enter your email address → Click **Create budget**.

---

## 📋 Step 1: AWS Account & IAM Security Setup

### 1. Root vs IAM User
- **Root Account:** The master email used to register AWS. Never use it for daily tasks.
- **IAM (Identity and Access Management):** Used to create a dedicated administrative user with restricted, secure permissions.

### 2. Create an IAM Admin User:
1. Search for **IAM** in the top search bar.
2. Click **Users** → **Create user**.
3. User name: `chesskhelo-admin`.
4. Check **Provide user access to the AWS Management Console**.
5. Select **I want to create an IAM-user** → Set a custom password.
6. Set permissions: Choose **Attach policies directly** → Select `AdministratorAccess`.
7. Click **Next** → **Create user**.
8. Sign out of Root and sign in using the new IAM user credentials.

---

## 🖥 Step 2: Deploying the Backend on AWS EC2

### 1. Launch an EC2 Instance:
1. Go to AWS Console → Search for **EC2** → Click **Launch instance**.
2. **Name:** `chesskhelo-backend-server`.
3. **OS Image:** Select **Ubuntu Server 22.04 LTS (HVM)** (Free tier eligible).
4. **Instance Type:** Select `t2.micro` (or `t3.micro`).
5. **Key Pair (Login credentials):**
   - Click **Create new key pair**.
   - Name: `chesskhelo-key`.
   - Type: `RSA`, Private key format: `.pem`.
   - Click **Create key pair** → Save `chesskhelo-key.pem` on your computer.
6. **Network Settings (Security Group):**
   - Check **Allow SSH traffic from** → `My IP` (or `Anywhere 0.0.0.0/0` if your IP changes).
   - Check **Allow HTTP traffic from the internet (Port 80)**.
   - Check **Allow HTTPS traffic from the internet (Port 443)**.
7. Click **Launch Instance**.

---

### 2. Connect to Your EC2 Instance:

Open PowerShell (or Terminal) on your local computer where you saved `chesskhelo-key.pem`:

```bash
# Set secure permissions (Linux/Mac)
chmod 400 chesskhelo-key.pem

# Connect via SSH (replace with your EC2 Public IP from AWS console)
ssh -i "chesskhelo-key.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>
```

---

### 3. Install Node.js, Git, PM2 & Nginx on EC2:

Run the following commands inside your EC2 terminal:

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx

# Verify installations
node -v    # Should show v20.x
npm -v     # Should show v10.x

# Install PM2 (Process Manager to keep backend running 24/7)
sudo npm install -g pm2
```

---

### 4. Clone and Configure ChessKhelo on EC2:

```bash
# Clone your project repository (or upload your code)
git clone https://github.com/<your-username>/ChessKhelo.git
cd ChessKhelo/backend

# Install backend dependencies
npm install

# Create production .env file
nano .env
```

Paste your production environment variables into `.env`:
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/chesskhelo?retryWrites=true&w=majority
JWT_SECRET=your_production_secret_key_generated_randomly_32_chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_production_refresh_secret_key_32_chars
JWT_REFRESH_EXPIRES_IN=30d
FRONTEND_URL=https://<your-cloudfront-domain-or-s3-url>
```
Press `Ctrl + O`, then `Enter` to save, and `Ctrl + X` to exit `nano`.

---

### 5. Build and Start Backend with PM2:

```bash
# Compile TypeScript to production JavaScript (dist/ folder)
npm run build

# Start backend using PM2
pm2 start dist/index.js --name "chesskhelo-api"

# Ensure PM2 restarts automatically if the EC2 server reboots
pm2 startup
pm2 save
```

Verify the backend is running:
```bash
pm2 status
curl http://localhost:5000/health
# Output: {"status":"ok","time":"...","env":"production"}
```

---

### 6. Configure Nginx Reverse Proxy on EC2:

Nginx will receive traffic on Port 80 (HTTP) and route `/api` and `/socket.io` to Node.js on Port 5000.

Edit Nginx default site configuration:
```bash
sudo nano /etc/nginx/sites-available/default
```

Replace the file contents with:
```nginx
server {
    listen 80 default_server;
    listen [::]80 default_server;

    server_name _;

    # REST API routing
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Health check routing
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        proxy_set_header Host $host;
    }

    # WebSocket (Socket.IO) routing
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Test and reload Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

Now, opening `http://<YOUR_EC2_PUBLIC_IP>/health` in any browser will return `{"status":"ok"}`.

---

## 🌐 Step 3: Deploying the Frontend on AWS S3 & CloudFront

### 1. Build the Production Frontend Locally:

On your local development computer:
```bash
cd frontend

# Set the production backend URL in frontend/.env
# Replace with your EC2 public IP or domain
echo "VITE_API_URL=http://<YOUR_EC2_PUBLIC_IP>/api" > .env
echo "VITE_SOCKET_URL=http://<YOUR_EC2_PUBLIC_IP>" >> .env

# Build optimized production bundle
npm run build
```
This creates a `frontend/dist` directory containing static HTML, JS, and CSS files.

---

### 2. Create and Configure AWS S3 Bucket:
1. Go to AWS Console → Search for **S3** → Click **Create bucket**.
2. **Bucket Name:** `chesskhelo-frontend-<random-number>` (must be globally unique).
3. **AWS Region:** Choose the region closest to you (e.g. `ap-south-1` for Mumbai, `us-east-1` for Virginia).
4. Uncheck **Block all public access** (acknowledge the warning).
5. Click **Create bucket**.

#### Enable Static Website Hosting:
1. Click your bucket name → Go to **Properties** tab.
2. Scroll to the bottom → Click **Edit** under **Static website hosting**.
3. Select **Enable**.
4. **Index document:** `index.html`.
5. **Error document:** `index.html` (Required for React Router SPA navigation).
6. Click **Save changes**.

#### Set Bucket Policy (Allow Public Read):
1. Go to **Permissions** tab → Click **Edit** under **Bucket policy**.
2. Paste this JSON (replace `your-bucket-name` with your actual bucket name):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-bucket-name/*"
       }
     ]
   }
   ```
3. Click **Save changes**.

---

### 3. Upload Frontend Files to S3:
1. Inside your bucket, go to the **Objects** tab.
2. Click **Upload** → **Add files** & **Add folder**.
3. Upload all contents from inside your local `frontend/dist/` folder (including `index.html`, `assets/`, etc.).
4. Click **Upload**.

Your frontend is now live at the S3 Website Endpoint!

---

### 4. Create CloudFront Distribution (HTTPS & CDN):
1. Go to AWS Console → Search for **CloudFront** → Click **Create distribution**.
2. **Origin domain:** Select your S3 bucket website endpoint.
3. **Viewer protocol policy:** Select **Redirect HTTP to HTTPS**.
4. **Allowed HTTP methods:** Select `GET, HEAD, OPTIONS`.
5. Under **Custom error response** (in CloudFront after creation):
   - HTTP error code: `403` & `404`
   - Response page path: `/index.html`
   - HTTP response code: `200` (Ensures browser refreshes work with client routing).
6. Click **Create distribution**.
7. Copy the **Distribution domain name** (e.g. `d1234abcd.cloudfront.net`).

---

## 🔒 Step 4: Configure HTTPS & Domain (Optional)

1. **Free SSL Certificate:** Use **AWS Certificate Manager (ACM)** in `us-east-1` to request a free public certificate for your custom domain.
2. **DNS Routing:** Use **AWS Route 53** to route your domain name (e.g., `chesskhelo.com`) to your CloudFront distribution (Frontend) and an Elastic IP attached to your EC2 instance (Backend).

---

## 📊 Step 5: Monitoring with AWS CloudWatch

1. Open AWS Console → Search for **CloudWatch**.
2. Go to **Metrics** → **EC2** → **Per-Instance Metrics**.
3. View **CPUUtilization**, **NetworkIn**, **NetworkOut**, and **StatusCheckFailed**.
4. **Create Alarm:** Set an alarm to email you if CPU utilization exceeds 80% for 5 minutes.

---

## ✅ Production Verification Checklist

| Test Item | Verification Method | Expected Result |
|---|---|---|
| **Health Check** | Open `http://<EC2_IP>/health` in browser | `{"status":"ok"}` response |
| **Frontend Load** | Open CloudFront / S3 URL | ChessKhelo landing page renders cleanly |
| **Sign Up & Login** | Register a new user account | JWT received; redirected to `/app/play` |
| **Demo Mode** | Click "♟ Try Demo Account" | Instant login with demo user profile |
| **Multiplayer Match** | Open two different browser windows | Matchmaking pairs players; board loads |
| **Move Sync** | Make move e2-e4 in Tab 1 | Tab 2 instantly updates move and clock |
| **Bot Game** | Play vs AI (Level 4) | Stockfish moves within 0.5s with sounds |
| **Leaderboard** | Navigate to `/app/leaderboard` | Ranked players list displayed with ratings |
| **Server Resilience**| Run `pm2 restart chesskhelo-api` on EC2 | Application resumes with zero data loss |
