# LiveStream Hub

Welcome to **LiveStream Hub** — a self-hosted, ultra-low-latency, real-time livestreaming platform. Built on modern web standards, it bridges the gap between traditional RTMP broadcasting (via tools like OBS Studio) and modern, interactive WebRTC-based viewing.

Whether you want to stream public gameplay, share a live presentation, or host a private viewing party with expiring invitation links, LiveStream Hub has you covered.

---

## Features

### RTMP Ingest & WebRTC Playback
*   **OBS Friendly:** Instantly provisions RTMP ingress details (Server URL + Stream Key) for streamers.
*   **Sub-Second Latency:** Viewers watch via WebRTC, delivering real-time playback far superior to standard HLS/DASH protocols.
*   **Modular Players:** Uses `@livekit/components-react` to deliver video controls, connection states, and auto-reconnections.

### Interactive Live Chat & Presence
*   **Real-Time Chat:** Low-latency chat rooms powered by Socket.io.
*   **Viewer Presence:** View a live list of other users currently in the channel.
*   **System Announcements:** Real-time feedback for join/leave events (e.g., *"Alice has joined the chat"*).

### Access Control & Smart Invites
*   **Visibility Toggle:** Choose between Public (`PUB`) and Private (`PRIV`) rooms.
*   **Expiring Invites:** Generate custom invitation tokens with:
    *   Maximum usage counts (e.g., single-use vs. multi-use).
    *   Expiration timers (e.g., expires in 1 hour, 1 day, etc.).
*   **Seamless Login Redirects:** Unauthenticated invitees are guided to log in/sign up first, and then automatically redirected back to join the stream.

### Robust User Security
*   **Account Creation:** Standard signup/login flow with password hashing via `bcrypt`.
*   **Lightweight Sessions:** Custom stateless JWT authentication implemented using HMAC-SHA256.

---

## Architecture

```
                 +-------------------+
                 |    Streamer       |
                 |  (OBS/StreamLabs) |
                 +---------+---------+
                           | RTMP (Port 1935)
                           v
                 +-------------------+
                 |  LiveKit Ingress  |
                 +---------+---------+
                           |
                           v Local ws (Port 7880)
                 +-------------------+
                 |  LiveKit Server   | <-----> Redis (Port 6379)
                 +---------+---------+
                           |
                           | WebRTC
                           v
   +-----------------------+-----------------------+
   |                                               |
   v                                               v
+------------+                                  +------------+
|  Viewer A  | <======== Socket.io (Chat) ======>|   Backend  | <---> MySQL
+------------+                                  +------------+
```

*   **Frontend:** React (Vite) styled with clean Vanilla CSS. Uses `@livekit/components-react` and `socket.io-client`.
*   **Backend:** Express API and Socket.io server written in Node.js (ES Modules).
*   **Infrastructure:** Redis, LiveKit Server, and LiveKit Ingress running in Docker.

---

## Step-by-Step Installation & Setup

### 1. Prerequisites
Ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (v18 or higher)
*   [Docker](https://www.docker.com/) & Docker Compose
*   [MySQL Server](https://www.mysql.com/)

---

### 2. Configure LiveKit Infrastructure
We run LiveKit Server and LiveKit Ingress locally inside Docker container networks.

1.  Copy the example configuration files at the root of the project:
    ```bash
    cp livekit.yaml.example livekit.yaml
    cp ingress.yaml.example ingress.yaml
    cp .env.example .env
    ```
2.  Generate LiveKit credentials. You can use your own strings, or generate them using a secure tool (like `openssl rand -hex 32`):
    *   Open `livekit.yaml` and set a secure pairing under `keys`:
        ```yaml
        keys:
          your_api_key_here: your_api_secret_here
        ```
    *   Open `ingress.yaml` and set the exact same API credentials:
        ```yaml
        ws_url: "ws://livekit:7880"
        api_key: your_api_key_here
        api_secret: your_api_secret_here
        ```
3.  Set your machine's **local/private IP address** in the root `.env` file (this allows LiveKit to bind correctly):
    ```env
    NODE_IP=192.168.1.XX
    ```
4.  Start the containers:
    ```bash
    docker compose up -d
    ```
    This launches Redis, LiveKit Server, and the LiveKit RTMP Ingress container.

---

### 3. Database Setup
1.  Log into your MySQL shell or graphical client (e.g., MySQL Workbench, DBeaver).
2.  Execute the script located at `backend/dbScript.sql` to create the `livestreaming_db` database and its corresponding tables (`users`, `streams`, `stream_members`, and `stream_invites`).
    ```bash
    mysql -u root -p < backend/dbScript.sql
    ```
    *   **For Windows PowerShell users:** The `<` operator is not supported. Use this instead:
        ```powershell
        Get-Content backend/dbScript.sql | mysql -u root -p
        ```
    *   **If the `mysql` command is not recognized:** You can run it via its absolute installation path (adjusting the version if necessary):
        ```powershell
        Get-Content backend/dbScript.sql | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
        ```
        Or simply open [backend/dbScript.sql](file:///d:/livestreaming-app/backend/dbScript.sql) in your database GUI client (e.g., Workbench or DBeaver) and run the script.


---

### 4. Backend Configuration
1.  Navigate into the `backend` directory:
    ```bash
    cd backend
    ```
2.  Copy the environment template:
    ```bash
    cp .env.example .env
    ```
3.  Fill in the credentials in `backend/.env`:
    *   `DB_PASSWORD`: Your MySQL root user's password.
    *   `JWT_SECRET`: A secure key used for signing session tokens.
    *   `LIVEKIT_URL`: Set to `ws://localhost:7880` (or `ws://<your-node-ip>:7880`).
    *   `LIVEKIT_API_KEY` & `LIVEKIT_API_SECRET`: Must match the keys you defined in step 2.
4.  Install dependencies:
    ```bash
    npm install
    ```
5.  Start the Express API and websocket server:
    ```bash
    npm start
    ```
    *(If no start script exists, you can run `node server.js`)*

---

### 5. Frontend Configuration
1.  Navigate into the `frontend` directory:
    ```bash
    cd ../frontend
    ```
2.  Copy the environment template:
    ```bash
    cp .env.example .env.local
    ```
3.  Open `frontend/.env.local` and specify your backend API port (typically `http://localhost:3000`):
    ```env
    VITE_BACKEND_URL=http://localhost:3000
    ```
4.  Install dependencies:
    ```bash
    npm install
    ```
5.  Launch the React app:
    ```bash
    npm run dev
    ```

---

## How to Stream (OBS Configuration Guide)

Once your system is up and running, here's how to capture and stream video:

1.  **Register and Log In:** Open `http://localhost:5173` (or your Vite dev server port) and sign up for an account.
2.  **Create a Channel:** Click the **`+`** icon next to the **Channels** sidebar header. Enter a channel name and set your preferred privacy mode.
3.  **Retrieve Stream Credentials:** If you are the owner of the channel, you will see a chat panel on the right side. In it, you will find your customized streaming configurations:
    *   **RTMP Server URL:** `rtmp://localhost:1935/live`
    *   **Stream Key:** `your-unique-ingress-stream-key`
4.  **Configure OBS Studio:**
    *   Open OBS Studio.
    *   Go to **Settings** > **Stream**.
    *   Set **Service** to **Custom...**
    *   Enter the **Server URL** and **Stream Key** retrieved from your channel UI.
    *   Go to **Settings** > **Output** and set:
        *   *Rate Control:* `CBR`
        *   *Keyframe Interval:* `2 s` (Crucial for WebRTC performance)
5.  **Go Live:** Click **Start Streaming** in OBS. In seconds, viewers will see your ultra-low-latency feed populate on the website player!

---

## License

This project is licensed under the [ISC License](LICENSE). Feel free to customize and expand it as needed.
