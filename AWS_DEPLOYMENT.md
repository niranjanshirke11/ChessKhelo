# ☁️ ChessKhelo — Simplified AWS Cloud Deployment Guide

This guide is written for students and developers deploying their first application to **Amazon Web Services (AWS)**. It explains every cloud concept simply, warns you about costs, provides exact commands, and guides you through every step.

This guide reflects the **simplified architecture**:
- **No Database** (All data is in-memory).
- **No WebSockets** (Multiplayer removed, Play vs AI only).

---

## 🏗 AWS Architecture for ChessKhelo

We chose the **simplest, most reliable, and cost-effective architecture**:

```text
                             [ User Browser ]
                                     │
               ┌─────────────────────┴─────────────────────┐
               │                                           │
         (Static Files)                              (REST API)
               │                                           │
               ▼                                           ▼
      ┌─────────────────┐                        ┌───────────────────┐
      │  AWS CloudFront │                        │  AWS EC2 Instance │
      │   (Global CDN)  │                        │ (Ubuntu 22.04 LTS)│
      └────────┬────────┘                        │   Node.js + PM2   │
               │                                 │   Nginx Proxy     │
               ▼                                 └───────────────────┘
      ┌─────────────────┐
      │  AWS S3 Bucket  │
      │ (React Frontend)│
      └─────────────────┘
```

### Why this architecture?
1. **Frontend on S3 + CloudFront:** S3 stores static HTML/JS/CSS files with 99.99% availability. CloudFront delivers files with low latency via edge servers worldwide and provides free HTTPS.
2. **Backend on EC2:** An EC2 virtual machine is a perfect environment to run a basic Node.js Express server. Since there is no database, the backend handles all application logic and state in-memory.

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
# Connect to the server using the Public IPv4 address from your EC2 dashboard
ssh -i "chesskhelo-key.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>
```

---

### 3. Setup Server Dependencies (Run on EC2):

Once connected to the server, run these commands to install Node.js and PM2:

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally (Process Manager to keep the backend running)
sudo npm install -g pm2
```

---

### 4. Upload & Start the Backend (Run on EC2):

1. **Clone the code** onto the server (or upload it via `scp` / Git). For example, if using Git:
```bash
git clone <YOUR_GITHUB_REPO_URL> chesskhelo
cd chesskhelo/backend
```

2. **Install dependencies and build:**
```bash
npm install
npm run build
```

3. **Start the server with PM2:**
```bash
# Set port environment variable (default 5000 is fine)
pm2 start dist/index.js --name "chesskhelo-api" --env PORT=5000

# Save PM2 process list so it restarts on server reboot
pm2 save
pm2 startup
```

---

### 5. Setup Nginx Reverse Proxy (Run on EC2):

Nginx will safely route traffic from Port 80 (HTTP) to your Node.js app running on Port 5000.

```bash
# Install Nginx
sudo apt install -y nginx

# Open the Nginx default configuration file
sudo nano /etc/nginx/sites-available/default
```

Delete everything in the file and replace it with:

```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

Restart Nginx:
```bash
sudo systemctl restart nginx
```

✅ **Your backend is now live!** If you go to `http://<YOUR_EC2_PUBLIC_IP>/health` in your browser, you should see `{ "status": "ok" }`.

---

## 🌐 Step 3: Deploying the Frontend on AWS S3 & CloudFront

Before deploying, update `frontend/.env` locally:
```env
# Change this to your EC2 public IP
VITE_API_URL=http://<YOUR_EC2_PUBLIC_IP>
```

Then, build the frontend on your computer:
```bash
cd frontend
npm run build
```
This generates a `dist` folder containing your static website.

### 1. Create an S3 Bucket:
1. Search for **S3** in the AWS Console.
2. Click **Create bucket**.
3. **Bucket Name:** `chesskhelo-frontend-<yourname>` (must be globally unique).
4. **Block Public Access:** UNCHECK "Block all public access" (acknowledge the warning).
5. Click **Create bucket**.

### 2. Enable Static Website Hosting:
1. Open your new bucket → Go to the **Properties** tab.
2. Scroll down to **Static website hosting** → Click **Edit**.
3. Select **Enable**.
4. **Index document:** `index.html`.
5. **Error document:** `index.html` (Important for React Router).
6. Click **Save changes**.

### 3. Add Bucket Policy (Permissions):
1. Go to the **Permissions** tab.
2. Scroll to **Bucket policy** → Click **Edit**.
3. Paste the following JSON (replace `<YOUR_BUCKET_NAME>` with your actual bucket name):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::<YOUR_BUCKET_NAME>/*"
        }
    ]
}
```
4. Click **Save changes**.

### 4. Upload Frontend Files:
1. Go to the **Objects** tab → Click **Upload**.
2. Drag and drop all files and folders **from inside your local `frontend/dist` folder**.
3. Click **Upload**.

### 5. Setup CloudFront (Optional but Recommended for HTTPS):
If you use the S3 URL, it will be `http://...`. Browsers might block requests to your API. CloudFront gives you a free SSL certificate.

1. Search for **CloudFront** in the AWS Console → Click **Create Distribution**.
2. **Origin Domain:** Select your S3 Bucket from the dropdown.
3. **Viewer Protocol Policy:** Choose **Redirect HTTP to HTTPS**.
4. Scroll down and click **Create Distribution**.
5. Wait for it to deploy. Copy the **Distribution domain name** (e.g., `d12345.cloudfront.net`).
6. Visit that URL in your browser.

🎉 **Deployment Complete! Your simplified ChessKhelo app is live.**
