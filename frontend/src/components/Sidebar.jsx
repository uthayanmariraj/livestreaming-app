import { Routes, Route, NavLink } from 'react-router-dom'
import { useState, useEffect, useContext } from 'react'
import { SocketContext, UserContext } from '../UserContext.jsx'
import Channels from './Channels.jsx'
import Modal from './Modal.jsx'

export default function Sidebar({setLoggedIn, setUsername}) {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
    const [rooms, setRooms] = useState([])
    const [showModal, setShowModal] = useState(false);
    const [newRoomName, setNewRoomName] = useState("");

    const socket = useContext(SocketContext)
    const username = useContext(UserContext)

    async function handleCreate(roomName, privacy) {
        if (!roomName || !roomName.trim()) {
            console.error("Cannot create a room without a name.");
            return null;
        }
        try {
            const formattedRoomName = roomName.trim().toLowerCase().replace(/\s+/g, '-');
            const response = await fetch(
                `${BACKEND_URL}/rooms`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        roomName: formattedRoomName,
                        adminName: username || "reserved",
                        privacy: privacy
                    })
                }
            )
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `Server responded with status: ${response.status}`);
            }
        } catch (err) {
            console.error("Error in createRoom handler:", err.message);
            alert(err.message || "Failed to create room. Please try again.");
            throw err;
        }

    }

    useEffect(() => {
        fetchRooms()

        if (socket) {
            const handleRoomCreated = () => {
                fetchRooms()
            }
            const handleRoomDeleted = () => {
                fetchRooms()
            }
            socket.on("room-created", handleRoomCreated)
            socket.on("room-deleted", handleRoomDeleted)

            return () => {
                socket.off("room-created", handleRoomCreated)
                socket.off("room-deleted", handleRoomDeleted)
            }
        }
    }, [socket, username])

    async function fetchRooms() {
        try {
            const response = await fetch(
                `${BACKEND_URL}/rooms?userName=${encodeURIComponent(username || "")}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            )
            const data = await response.json()
            if (data.success) {
                setRooms(data.rooms)
            }
        } catch (err) {
            console.error("Error fetching rooms:", err)
        }
    }

    function handleLogout(){
        localStorage.removeItem('token')
        setUsername("")
        setLoggedIn(false)
    }

    return (
        <div className="app-container">
            <div className="sidebar">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <span className="sidebar-username" style={{ fontWeight: 'bold' }}>{username}</span>
                    <button onClick={handleLogout} className="logout-btn">LOGOUT</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h2 style={{ margin: 0 }}>Channels</h2>
                    <button onClick={() => setShowModal(true)} className="add-room-btn">+</button>
                </div>
                <div className="rooms-list">
                    {rooms.map((room) => (
                        <div key={room.id} className="room-item" style={{ marginBottom: '15px' }}>
                            <NavLink className="room-links" to={`/${room.stream_name}`} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span className="stream-title" style={{ fontWeight: 'bold' }}>
                                    {room.stream_name}
                                </span>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', color: '#888' }}>
                                    <span>by {room.streamer_name}</span>
                                    <span style={{ 
                                        color: room.status === 'streaming' ? '#00ff88' : '#888',
                                        fontWeight: room.status === 'streaming' ? 'bold' : 'normal'
                                    }}>
                                        ● {room.status}
                                    </span>
                                </div>
                            </NavLink>
                        </div>
                    ))}
                </div>
            </div>

            <div className="main-content">
                <Routes>
                    {rooms.map((room) => (
                        <Route key={room.stream_name}
                            path={`/${room.stream_name}`}
                            element={
                                <Channels 
                                    key={room.stream_name} 
                                    roomName={room.stream_name} 
                                    roomId={room.id} 
                                    adminName={room.streamer_name} 
                                />
                            } 
                        />
                    ))}
                </Routes>
            </div>

            {showModal && <Modal onClose={() => setShowModal(false)}
                onCreate={async (roomName, privacy) => {
                    await handleCreate(roomName, privacy)
                    setShowModal(false);
                }}
            />}
        </div>
    )
}
