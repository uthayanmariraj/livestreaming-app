import Sidebar from './components/Sidebar.jsx'
import Login from './components/Login.jsx'
import Signup from './components/Signup.jsx'
import InvitePage from './components/invites/InvitePage.jsx'
import { UserContext, SocketContext } from './UserContext.jsx'
import { io } from 'socket.io-client'
import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
const socket = io(BACKEND_URL)

export default function App() {
    const [loggedIn, setLoggedIn] = useState(false)
    const [username, setUsername] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    const getRedirectPath = () => {
        const pendingToken = sessionStorage.getItem('pending_invite_token')
        if (pendingToken) {
            return `/invite/${pendingToken}`
        }
        return '/general'
    }

    useEffect(() => {
        async function checkToken() {
            const token = localStorage.getItem('token')
            if (!token) {
                setIsLoading(false)
                return
            }
            try {
                const response = await fetch(`${BACKEND_URL}/verify-login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token })
                })
                const data = await response.json()
                if (data.success) {
                    setUsername(data.username)
                    setLoggedIn(true)
                }
                else {
                    localStorage.removeItem('token')
                }
            } catch (err) {
                console.error("Token verification failed:", err)
            } finally {
                setIsLoading(false)
            }
        }
        checkToken()
    }, [])

    if (isLoading) {
        return (
            <div className="loading-screen">
                <p>Loading...</p>
            </div>
        )
    }

    return (
        <UserContext.Provider value={username}>
            <SocketContext.Provider value={socket}>
                <Routes>
                    <Route
                        path="/login"
                        element={loggedIn ? <Navigate to={getRedirectPath()} /> : <Login setLoggedIn={setLoggedIn} setUsername={setUsername} />}
                    />
                    <Route
                        path="/signup"
                        element={loggedIn ? <Navigate to={getRedirectPath()} /> : <Signup />}
                    />
                    <Route
                        path="/invite/:token"
                        element={<InvitePage loggedIn={loggedIn} username={username} />}
                    />
                    <Route
                        path="/*"
                        element={loggedIn ? <Sidebar setLoggedIn={setLoggedIn} setUsername={setUsername} /> : <Navigate to="/login" />}
                    />
                </Routes>
            </SocketContext.Provider>
        </UserContext.Provider>
    )
}


