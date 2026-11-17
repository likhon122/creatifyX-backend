# Enterprise Deployment Guide: Azure App Service with Docker Hub & GitHub Actions 🚀

> **Target Platform**: Microsoft Azure App Service (Web App for Containers / Linux)  
> **Registry**: Docker Hub  
> **CI/CD Orchestration**: GitHub Actions  
> **Reverse Proxy**: Nginx (Hardened, Gzip, Rate Limiting, 100MB Body Size)  
> **Target Audience**: Azure for Students ($100 Free Credit & B1/F1 Tiers)

---

## 📑 Table of Contents
1. [Architecture Overview: PaaS vs. VM](#1-architecture-overview-paas-vs-vm)
2. [Step 1: Docker Hub Account & Personal Access Token (PAT)](#step-1-docker-hub-account--personal-access-token-pat)
3. [Step 2: Azure for Students - Provisioning Web App for Containers](#step-2-azure-for-students---provisioning-web-app-for-containers)
4. [Step 3: Azure Web App Configuration & Environment Variables](#step-3-azure-web-app-configuration--environment-variables)
5. [Step 4: Export Azure Publish Profile](#step-4-export-azure-publish-profile)
6. [Step 5: Configure GitHub Actions Secrets](#step-5-configure-github-actions-secrets)
7. [Step 6: Triggering the Automated CI/CD Pipeline](#step-6-triggering-the-automated-cicd-pipeline)
8. [Advanced Option: Multi-Container Deployment (Nginx + Backend)](#advanced-option-multi-container-deployment-nginx--backend)
9. [Senior DevOps Troubleshooting & Live Log Streaming](#senior-devops-troubleshooting--live-log-streaming)

---

## 1. Architecture Overview: PaaS vs. VM

As a senior engineer, we deliberately choose **Azure App Service (PaaS Web App for Containers)** over a raw **Virtual Machine (IaaS)**:

| Feature | Azure App Service (PaaS) | Azure Virtual Machine (IaaS) |
| :--- | :--- | :--- |
| **Maintenance** | Zero OS patching, zero kernel updates | Manual OS updates, firewall, security patching |
| **TLS/SSL Certificates** | **Free automatic managed SSL/TLS** certificates | Manual Let's Encrypt / Certbot renewal cron jobs |
| **Zero-Downtime Deployment** | Native rolling container swaps & slots | Manual blue-green or proxy restarts |
| **Health Probes** | Automated container liveness/readiness restart | Manual watchdog daemon / Monit |
| **Student Budget Impact** | Included in **Azure for Students B1 / F1** plans | Consumes CPU hours constantly; costly disk storage |

---

## Step 1: Docker Hub Account & Personal Access Token (PAT)

1. Log in to [Docker Hub](https://hub.docker.com/).
2. Create two public repositories:
   - `<your-dockerhub-username>/creatifyx-backend`
   - `<your-dockerhub-username>/creatifyx-nginx`
3. Click your profile avatar in the top right &rarr; **Account Settings** &rarr; **Security**.
4. Click **New Access Token**:
   - **Access Token Description**: `github-actions-creatifyx-ci-cd`
   - **Permissions**: `Read, Write, Delete`
5. Click **Generate** and copy the personal access token (`dckr_pat_...`). Save this securely for GitHub Secrets.

---

## Step 2: Azure for Students - Provisioning Web App for Containers

1. Navigate to the [Azure Portal](https://portal.azure.com/).
2. Search for **App Services** in the top search bar and click **Create** &rarr; **Web App**.
3. In the **Basics** tab:
   - **Subscription**: `Azure for Students`
   - **Resource Group**: Click *Create new* &rarr; name it `creatifyx-rg`
   - **Name**: Choose a globally unique name, e.g. `creatifyx-api` (Your URL will be `https://creatifyx-api.azurewebsites.net`)
   - **Publish**: Select **Docker Container**
   - **Operating System**: **Linux**
   - **Region**: Choose a region near your users (e.g. `East US`, `Southeast Asia`, or `North Europe`)
   - **Pricing Plan**:
     - Click **Explore Pricing Plans**.
     - Under **Dev / Test**, select **Basic B1** (Covered by your $100 student credit) or **Free F1**.
4. In the **Docker** tab:
   - **Options**: **Single Container**
   - **Image Source**: **Docker Hub**
   - **Access Type**: **Public**
   - **Image and tag**: `<your-dockerhub-username>/creatifyx-backend:latest`
5. Click **Review + create** &rarr; **Create**. Deployment will finish in ~1-2 minutes.

---

## Step 3: Azure Web App Configuration & Environment Variables

Azure App Service needs to know which internal port your container listens on and your production secrets:

1. In Azure Portal, open your newly created Web App (`creatifyx-api`).
2. Go to **Settings** &rarr; **Environment variables** (or **Configuration** &rarr; **Application settings** on older portal UI).
3. Add the following **Key-Value** pairs:

| Variable Name | Required Value / Description |
| :--- | :--- |
| `WEBSITES_PORT` | `5000` *(Tells Azure front-door load balancer to route external traffic to port 5000)* |
| `PORT` | `5000` |
| `NODE_ENV` | `production` |
| `ENV_MODE` | `production` |
| `MONGODB_URI` | `mongodb+srv://<user>:<password>@cluster.mongodb.net/creatifyx?retryWrites=true&w=majority` |
| `FRONTEND_URL` | `https://creatify-x-frontend.vercel.app` *(or your custom frontend domain)* |
| `JWT_SECRET_KEY` | `your_secure_production_jwt_secret_64_characters` |
| `BCRYPT_SALT_ROUNDS` | `10` |
| `ACCESS_TOKEN_EXPIRES_IN` | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` |
| `SUPER_ADMIN_EMAIL` | `superadmin@gmail.com` |
| `SUPER_ADMIN_PASSWORD` | `your_secure_superadmin_password` |
| `CLOUDINARY_CLOUD_NAME` | `your_cloudinary_cloud_name` |
| `CLOUDINARY_API_KEY` | `your_cloudinary_api_key` |
| `CLOUDINARY_API_SECRET` | `your_cloudinary_api_secret` |
| `WATERMARK_PUBLIC_ID` | `creatifyx_watermark` |
| `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
| `MAIL_EMAIL` | `your_email@gmail.com` |
| `MAIL_PASSWORD` | `your_google_app_password` |

> [!IMPORTANT]
> In **MongoDB Atlas**, navigate to **Network Access** &rarr; click **Add IP Address** &rarr; click **Allow Access from Anywhere (`0.0.0.0/0`)**. Azure App Service uses dynamic outbound IP pools; without this, MongoDB will block the connection.

4. Click **Apply** (Save).

### Enable Azure Health Checks
1. Go to **Monitoring** &rarr; **Health check**.
2. Toggle to **Enable**.
3. Path: `/health`.
4. Click **Save**. Azure will automatically poll your container every minute and keep it warm.

---

## Step 4: Export Azure Publish Profile

1. On your Web App overview page, click **Download publish profile** in the top action bar.
2. A `.PublishSettings` XML file will download to your computer.
3. Open this file in Notepad or VS Code and copy its entire text content.

---

## Step 5: Configure GitHub Actions Secrets

1. Open your GitHub repository: `https://github.com/likhon122/creatifyX-backend`
2. Navigate to **Settings** &rarr; **Secrets and variables** &rarr; **Actions**.
3. Under **Repository secrets**, click **New repository secret** and add the following 4 secrets:

| Secret Name | Value |
| :--- | :--- |
| `DOCKERHUB_USERNAME` | Your Docker Hub account username (e.g. `likhon122`) |
| `DOCKERHUB_TOKEN` | The Personal Access Token generated in Step 1 (`dckr_pat_...`) |
| `AZURE_WEBAPP_NAME` | The exact name of your Azure Web App (e.g. `creatifyx-api`) |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | The complete XML text copied from the downloaded `.PublishSettings` file |

---

## Step 6: Triggering the Automated CI/CD Pipeline

The CI/CD pipeline triggers automatically whenever you push code to `main`:

```bash
# Push your backend code
git add .
git commit -m "feat(infra): setup CI/CD pipeline with Docker Hub and Azure App Service"
git push origin main
```

### GitHub Actions Pipeline Stages:
1. **Quality Gate**: Installs dependencies with clean cache, validates TypeScript types, compiles `/dist`, and runs ESLint.
2. **Docker Hub Publish**: Builds the multi-stage, hardened Docker image and pushes both `latest` and `${git_sha}` tags to Docker Hub.
3. **Azure Deployment**: Authenticates with Azure using your publish profile, pulls the updated container image, and runs a live verification loop checking `https://<your-app>.azurewebsites.net/health`.

---

## Advanced Option: Multi-Container Deployment (Nginx + Backend)

If you prefer running Nginx as a reverse proxy in front of Node.js on Azure:

1. When creating the Web App in Azure (or under **Deployment Center**):
   - **Options**: Select **Docker Compose**.
   - Upload the provided [`docker-compose.azure.yml`](./docker-compose.azure.yml).
2. Set `WEBSITES_PORT=80` in **Environment variables**.
3. Traffic flows:
   `Azure HTTPS (443) -> Nginx (80) [Rate Limiting + Gzip + Buffer] -> Node.js Backend (5000)`

---

## Senior DevOps Troubleshooting & Live Log Streaming

### 1. View Real-time Streaming Logs in Azure
Run via Azure CLI in PowerShell / Terminal:
```bash
az webapp log tail --name creatifyx-api --resource-group creatifyx-rg
```
Or open **Monitoring** &rarr; **Log stream** in the Azure Portal to view real-time Node.js startup output.

### 2. Verify Container Health Manually
Test your live endpoint:
```bash
curl -I https://creatifyx-api.azurewebsites.net/health
```
Expected Response:
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "status": "UP",
  "service": "creatifyX-backend",
  "uptime": 124.5,
  "timestamp": "2026-11-17T11:20:00.000Z"
}
```

### 3. Local Docker Testing Before Deployment
To run the exact production stack locally using Docker Compose:
```bash
# Start backend and nginx
docker compose up --build -d

# Check running services
docker compose ps

# View logs
docker compose logs -f backend

# Stop services
docker compose down
```
Local endpoints:
- Node.js Direct: `http://localhost:5000/health`
- Nginx Reverse Proxy: `http://localhost:80/health` or `http://localhost/api/v1/plans`
