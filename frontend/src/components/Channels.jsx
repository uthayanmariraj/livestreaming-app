import { useState, useEffect, useContext, useRef } from 'react'
import { UserContext, SocketContext } from '../UserContext'
import { useNavigate } from 'react-router-dom'
import InviteModal from './invites/InviteModal.jsx'

// Import modular stream subcomponents
import StreamPlayer from './stream/StreamPlayer'
import OBSCredentials from './stream/OBSCredentials'
import StreamChat from './stream/StreamChat'

export default function Channels({ roomName, roomId, adminName }) {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
    const username = useContext(UserContext)
    const socket = useContext(SocketContext)
    const navigate = useNavigate()
    const messagesEndRef = useRef(null)

    const [livekitToken, setLivekitToken] = useState('')
    const [livekitUrl, setLivekitUrl] = useState('')
    const [streamCredentials, setStreamCredentials] = useState(null)
    const [message, setMessage] = useState('')
    const [messages, setMessages] = useState([])
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [isLive, setIsLive] = useState(false)

    // Scroll chat to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Get WebRTC connection token for LiveKit Room
    useEffect(() => {
        async function getViewerToken() {
            try {
                const res = await fetch(`${BACKEND_URL}/rooms/${roomName}/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username })
                })
                const data = await res.json()
                if (data.success) {
                    setLivekitToken(data.token)
                    setLivekitUrl(data.serverUrl || '')
                }
            } catch (err) {
                console.error("Error fetching WebRTC token:", err)
            }
        }
        if (roomName && username) {
            getViewerToken()
        }
    }, [roomName, username, BACKEND_URL])

    // Fetch OBS Stream key (Only if current user is the admin/streamer)
    useEffect(() => {
        async function getStreamCredentials() {
            try {
                const res = await fetch(`${BACKEND_URL}/rooms/${roomName}/ingress?userName=${username}`)
                const data = await res.json()
                if (data.success) {
                    setStreamCredentials({
                        serverUrl: data.serverUrl,
                        streamKey: data.streamKey
                    })
                }
            } catch (err) {
                console.error("Error fetching stream key:", err)
            }
        }
        if (username === adminName) {
            getStreamCredentials()
        } else {
            setStreamCredentials(null) // Reset if switching rooms
        }
    }, [roomName, username, adminName, BACKEND_URL])

    // Socket.io room connection
    useEffect(() => {
        const joinRoom = () => {
            socket.emit("join-room", { room: roomName, username })
        }

        joinRoom()
        socket.on("connect", joinRoom)

        const handleReceive = (data) => {
            setMessages((prev) => [...prev, data])
        }

        socket.on("receive-message", handleReceive)

        return () => {
            socket.emit("leave-room", { room: roomName, username })
            socket.off("connect", joinRoom)
            socket.off("receive-message", handleReceive)
        }
    }, [roomName, socket, username])

    function handleSend(e) {
        e.preventDefault()
        if (!message.trim()) return
        socket.emit("send-message", { room: roomName, username, message: message.trim() })
        setMessages((prev) => [...prev, { username, message: message.trim() }])
        setMessage('')
    }

    async function handleDelete() {
        if (!confirm(`Are you sure you want to stop/delete stream #${roomName}?`)) return
        try {
            const response = await fetch(`${BACKEND_URL}/rooms/${roomId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userName: username })
            })
            const data = await response.json()
            if (data.success) {
                navigate('/general')
            }
        } catch (err) {
            console.error("Error deleting stream:", err)
        }
    }

    return (
        <div className="channel-container">
            <div className="video-player-area">
                <div className="chat-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                            <h1 style={{ margin: 0 }}>{roomName}</h1>
                            <span style={{ fontSize: '0.9em', color: '#aaa' }}>
                                by <strong>{adminName}</strong>
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button onClick={() => setShowInviteModal(true)} className="invite-btn">
                                Invite Viewers
                            </button>
                            {username === adminName && (
                                <button onClick={handleDelete} className="delete-btn">Stop Stream</button>
                            )}
                        </div>
                    </div>
                </div>

                <StreamPlayer token={livekitToken} serverUrl={livekitUrl} adminName={adminName} onLiveStateChange={setIsLive} />
            </div>

            <StreamChat 
                messages={messages} 
                message={message} 
                setMessage={setMessage} 
                handleSend={handleSend} 
                messagesEndRef={messagesEndRef} 
                streamCredentials={streamCredentials}
            />

            {showInviteModal && (
                <InviteModal 
                    roomId={roomId} 
                    roomName={roomName} 
                    onClose={() => setShowInviteModal(false)} 
                />
            )}
        </div>
    )
}
