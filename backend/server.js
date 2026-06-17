import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import mysql from 'mysql2/promise'
import crypto from 'crypto'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { IngressClient, IngressInput, AccessToken } from 'livekit-server-sdk'
import 'dotenv/config'

const JWT_SECRET = process.env.JWT_SECRET

function generateToken(username) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(
        JSON.stringify(
            {
                username,
                exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
            }
        )
    ).toString('base64url')
    const signature = crypto.createHmac('sha256', JWT_SECRET)
        .update(`${header}, ${payload}`)
        .digest('base64url')

    return `${header}.${payload}.${signature}`
}

function verifyToken(token) {
    const [header, payload, signature] = token.split('.')
    const signCheck = crypto.createHmac('sha256', JWT_SECRET)
        .update(`${header}, ${payload}`)
        .digest('base64url')
    if (signature !== signCheck) return null;
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
        return null
    }
    return decodedPayload
}

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

const ingressClient = new IngressClient(
    process.env.LIVEKIT_URL,
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET
)

const app = express()
const server = createServer(app)
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
})

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('<h2>thinkpadclit</h2>')
})

app.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username])
        if (rows.length > 0) {
            return res.status(401).json({
                success: false,
                message: "Username already exists."
            })
        }

        const password_hash = await bcrypt.hash(password, 10)

        await pool.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, password_hash])
        res.json({
            success: true,
        })
    } catch (err) {
        console.error("Signup error:", err)
        res.status(500).json({ success: false })
    }
})

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username])

        if (rows.length > 0) {
            const user = rows[0]
            const isMatch = await bcrypt.compare(password, user.password_hash)
            if (isMatch) {
                const token = generateToken(username)
                return res.json({
                    success: true,
                    token,
                    user: {
                        username
                    }
                })
            }
        }

        res.status(401).json({
            success: false,
            message: "Invalid username or password."
        })
    } catch (err) {
        console.error("Login error:", err)
        res.status(500).json({ success: false })
    }
})

app.post('/rooms', async (req, res) => {
    try {
        const { roomName, adminName, privacy = "PUB" } = req.body

        // Check if the user already has a stream
        const [existing] = await pool.execute(
            'SELECT * FROM streams WHERE streamer_name = ?',
            [adminName]
        )
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "You can only have one stream at a time."
            })
        }

        // Create LiveKit Ingress stream credentials
        const ingress = await ingressClient.createIngress(IngressInput.RTMP_INPUT, {
            name: roomName,
            roomName: roomName,
            participantIdentity: `${adminName}_stream`,
            participantName: `${adminName} (Streamer)`
        })

        // Insert into streams table with status 'streaming'
        await pool.execute(
            'INSERT INTO streams (stream_name, streamer_name, status, privacy) values (?, ?, "streaming", ?)', 
            [roomName, adminName, privacy]
        )
        io.emit("room-created")

        return res.json({
            success: true,
            admin: adminName,
            serverUrl: ingress.url || "rtmp://localhost:1935/live",
            streamKey: ingress.streamKey
        })
    } catch (err) {
        console.error("creation error:", err)
        res.status(500).json({ success: false })
    }
})

app.get('/rooms', async (req, res) => {
    try {
        const [streams] = await pool.execute(
            'SELECT id, stream_name, streamer_name, status FROM streams'
        )
        return res.json({
            success: true,
            rooms: streams
        })
    } catch (err) {
        console.error("Error fetching streams:", err)
        res.status(500).json({ success: false })
    }
})

app.get('/rooms/:roomName/ingress', async (req, res) => {
    try {
        const { roomName } = req.params
        const userName = req.query.userName

        // 1. Verify requester is the admin of the stream
        const [rows] = await pool.execute('SELECT streamer_name FROM streams WHERE stream_name = ?', [roomName])
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Stream not found." })
        }
        const stream = rows[0]
        if (stream.streamer_name !== userName) {
            return res.status(403).json({ success: false, message: "Unauthorized." })
        }

        // 2. Fetch existing ingress details
        const ingresses = await ingressClient.listIngress({ roomName })
        if (ingresses.length === 0) {
            return res.status(404).json({ success: false, message: "No stream credentials found." })
        }

        res.json({
            success: true,
            serverUrl: ingresses[0].url || "rtmp://localhost:1935/live",
            streamKey: ingresses[0].streamKey
        })
    } catch (err) {
        console.error("Error retrieving ingress:", err)
        res.status(500).json({ success: false })
    }
})

//generate viewertoken
app.post('/rooms/:roomName/token', async (req, res) => {
    try {
        const { roomName } = req.params
        const { username } = req.body

        if (!roomName || !username) {
            return res.status(400).json({ success: false, message: "Missing parameter." })
        }

        const at = new AccessToken(
            process.env.LIVEKIT_API_KEY,
            process.env.LIVEKIT_API_SECRET,
            { identity: username }
        )

        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: false,
            canSubscribe: true
        })

        const token = await at.toJwt()
        res.json({ success: true, token, serverUrl: process.env.LIVEKIT_URL })
    } catch (err) {
        console.error("Error generating token:", err)
        res.status(500).json({ success: false })
    }
})

app.delete('/rooms/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { userName } = req.body

        const [rows] = await pool.execute('SELECT stream_name, streamer_name FROM streams WHERE id = ?', [id])
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Stream not found." })
        }
        const stream = rows[0]
        if (stream.streamer_name !== userName) {
            return res.status(403).json({ success: false, message: "Only the streamer can delete this stream." })
        }

        // Clean up Ingress objects from LiveKit
        try {
            const ingresses = await ingressClient.listIngress({ roomName: stream.stream_name })
            for (const ing of ingresses) {
                await ingressClient.deleteIngress(ing.ingressId)
            }
        } catch (ingressErr) {
            console.error("Failed to delete Ingress on LiveKit Server:", ingressErr)
        }

        await pool.execute('DELETE FROM streams WHERE id = ?', [id])

        io.emit("room-deleted")

        res.json({ success: true })
    } catch (err) {
        console.error("Delete error:", err)
        res.status(500).json({ success: false })
    }
})

app.post('/rooms/:id/invites', async (req, res) => {
    try {
        const streamId = req.params.id;
        const { username, expiresIn, maxUses } = req.body;
        const [rows] = await pool.execute(
            `SELECT 1 FROM streams s 
            LEFT JOIN stream_members sm ON s.id = sm.stream_id 
            WHERE s.id = ? AND (s.streamer_name = ? OR sm.username = ?)`,
            [streamId, username, username]
        )
        if (!rows || rows.length === 0) {
            const [[priv]] = await pool.execute(
                `SELECT privacy FROM streams WHERE id = ?`, [streamId]
            )
            if (priv.privacy === 'PRIV') {
                return res.status(403).json({ success: false, message: "not allowed to generate" });
            }
        }

        const token = crypto.randomBytes(16).toString('hex')
        let expiresAt = null
        if (expiresIn) {
            expiresAt = new Date(Date.now() + expiresIn * 1000);
        }
        await pool.execute(`INSERT INTO stream_invites (stream_id, token, created_by, max_uses, expires_at) VALUES (?,?,?,?,?)`,
            [streamId, token, username, maxUses, expiresAt])

        res.json({
            success: true,
            token: token
        });

    } catch (err) {
        console.error("Error generating invite:", err)
        res.status(500).json({ success: false })
    }
})

app.get('/invites/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const [rows] = await pool.execute(`SELECT si.stream_id, si.max_uses, si.uses, si.expires_at, s.stream_name
            FROM stream_invites si JOIN streams s ON si.stream_id = s.id WHERE si.token = ?`, [token])
        if (!rows || rows.length === 0) {
            return res.status(403).json({ success: false, message: "invalid token" });
        }
        const invite = rows[0]

        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
            return res.status(410).json({
                success: false,
                valid: false,
                message: "This invite link has expired."
            });
        }

        if (invite.max_uses !== null && invite.uses >= invite.max_uses) {
            return res.status(410).json({
                success: false,
                valid: false,
                message: "This invite link has reached its maximum usage limit."
            });
        }

        res.json({
            success: true,
            valid: true,
            roomName: invite.stream_name,
            roomId: invite.stream_id
        });

    } catch (err) {
        console.error("Error validating invite", err)
        res.status(500).json({ success: false, message: "Internal Server error" })
    }
})



app.post('/invites/:token/join', async (req, res) => {
    try {
        const { token } = req.params;
        const { username } = req.body;
        const [invites] = await pool.execute(
            `SELECT 
            si.stream_id, 
            si.max_uses, 
            si.uses, 
            si.expires_at, 
            s.stream_name, 
            s.streamer_name,
            sm.username AS is_member
        FROM stream_invites si
        JOIN streams s ON si.stream_id = s.id
        LEFT JOIN stream_members sm ON s.id = sm.stream_id AND sm.username = ?
        WHERE si.token = ?`
            ,
            [username, token]
        );
        if (invites.length === 0) {
            return res.status(404).json({ success: false, message: "Invalid invite link." });
        }
        const invite = invites[0];
        const streamId = invite.stream_id;
        const streamName = invite.stream_name;

        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
            return res.status(410).json({ success: false, message: "This invite has expired." });
        }
        if (invite.max_uses !== null && invite.uses >= invite.max_uses) {
            return res.status(410).json({ success: false, message: "This invite link has run out of uses." });
        }

        if (invite.streamer_name === username || invite.is_member !== null) {
            return res.json({
                success: true,
                message: "You already have access to this stream.",
                roomName: streamName
            })
        }
        await pool.execute(
            'INSERT INTO stream_members (stream_id, username) VALUES (?, ?)',
            [streamId, username]
        )
        await pool.execute(
            'UPDATE stream_invites SET uses = uses + 1 WHERE token = ?',
            [token]
        )

        res.json({
            success: true,
            roomName: streamName
        });

    } catch (err) {
        console.error("Error joining stream via invite:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
})

app.post('/verify-login', (req, res) => {
    const { token } = req.body
    if (!token) {
        return res.status(400).json({ success: false, message: 'token is required' })
    }
    const decoded = verifyToken(token)
    if (!decoded) {
        return res.status(401).json({ success: false, message: "Invalid or expired token." })
    }
    return res.status(200).json({
        success: true,
        username: decoded.username
    })
})

const activeRoomUsers = new Map() 
const socketUserMap = new Map()    // socketId : { room, username }

io.on("connection", (socket) => {
    console.log("user connected", socket.id)

    socket.on("join-room", ({ room, username }) => {
        socket.join(room)
        socketUserMap.set(socket.id, { room, username })

        if (!activeRoomUsers.has(room)) {
            activeRoomUsers.set(room, new Set())
        }
        if (username) {
            activeRoomUsers.get(room).add(username)
        }

        io.to(room).emit("room-users", Array.from(activeRoomUsers.get(room)))

        socket.to(room).emit("receive-message", {
            room,
            username: "reserved",
            message: `${username} has joined the chat`,
            isSystem: true
        })

        console.log(`${username} has joined ${room}`)
    })

    const handleUserLeaving = (socketId) => {
        const userInfo = socketUserMap.get(socketId)
        if (userInfo) {
            const { room, username } = userInfo
            if (activeRoomUsers.has(room)) {
                activeRoomUsers.get(room).delete(username)
                io.to(room).emit("room-users", Array.from(activeRoomUsers.get(room)))
                io.to(room).emit("receive-message", {
                    room,
                    username: "System",
                    message: `${username} has left the chat`,
                    isSystem: true
                })
                if (activeRoomUsers.get(room).size === 0) {
                    activeRoomUsers.delete(room)
                }
            }
            socketUserMap.delete(socketId)
            console.log(`${username} has left ${room}`)
        }
    }

    socket.on("leave-room", ({ room, username }) => {
        socket.leave(room)
        handleUserLeaving(socket.id)
    })

    socket.on("send-message", ({ room, username, message }) => {
        socket.to(room).emit("receive-message", ({ room, username, message }))
    })

    socket.on("disconnect", (reason) => {
        handleUserLeaving(socket.id)
        console.log("user disconnected", socket.id, reason)
    })
})

const PORT = process.env.PORT
server.listen(PORT, () => {
    console.log(`server started at http://localhost:${PORT}`)
})
