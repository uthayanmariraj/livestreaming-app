import { useEffect, useState, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SocketContext } from '../../UserContext'

export default function InvitePage({ loggedIn, username }) {
    const { token } = useParams()
    const navigate = useNavigate()
    const socket = useContext(SocketContext)
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

    const [status, setStatus] = useState("loading") // loading, invalid, processing
    const [message, setMessage] = useState("Verifying invite link...")

    useEffect(() => {
        async function processInvite() {
            try {
                // 1. Verify link is valid from backend
                const response = await fetch(`${BACKEND_URL}/invites/${token}`)
                const data = await response.json()

                if (!response.ok || !data.valid) {
                    setStatus("invalid")
                    setMessage(data.message || "This invite link is invalid or expired.")
                    return
                }

                // 2. If valid but not logged in, redirect to login
                if (!loggedIn) {
                    sessionStorage.setItem('pending_invite_token', token)
                    navigate('/login', { 
                        state: { message: `Please log in or sign up to join #${data.roomName}.` } 
                    })
                    return
                }

                // 3. If logged in, join the room
                setStatus("processing")
                setMessage(`Joining #${data.roomName}...`)

                const joinRes = await fetch(`${BACKEND_URL}/invites/${token}/join`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username })
                })
                const joinData = await joinRes.json()

                if (joinRes.ok && joinData.success) {
                    // Successfully joined! Clean storage and head to the room.
                    sessionStorage.removeItem('pending_invite_token')
                    
                    // Trigger a real-time refresh of rooms
                    if (socket) {
                        socket.emit("join-room", { room: joinData.roomName, username })
                    }
                    
                    navigate(`/${joinData.roomName}`)
                } else {
                    setStatus("invalid")
                    setMessage(joinData.message || "Failed to join the room.")
                }

            } catch (err) {
                console.error("Invite processing error:", err)
                setStatus("invalid")
                setMessage("An error occurred while processing the invite.")
            }
        }

        processInvite()
    }, [token, loggedIn, username, navigate, socket])

    return (
        <div className="invite-page-container">
            <div className="invite-card">
                {status === "loading" || status === "processing" ? (
                    <div className="spinner"></div>
                ) : (
                    <div className="invite-error-content">
                        <h2>Invalid Invite</h2>
                        <p>{message}</p>
                        <button onClick={() => navigate('/')}>Go to Home</button>
                    </div>
                )}
            </div>
        </div>
    )
}
