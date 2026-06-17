import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Login({ setLoggedIn, setUsername }) {
    const [userName, setUserName] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(false)

    async function handleLogIn(e) {
        e.preventDefault()
        try {
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
            const response = await fetch(
                `${BACKEND_URL}/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        username: userName,
                        password
                    })
                }
            )
            const data = await response.json()
            if (data.success) {
                localStorage.setItem('token', data.token)
                setUsername(userName)
                setLoggedIn(true)
            } else {
                setError(true)
            }
        } catch (err) {
            console.error("Login error:", err)
            setError(true)
        }
    }

    return (
        <div>
            <form className='login-form' onSubmit={handleLogIn}>
                {error && (<p>Invalid username/pw</p>)}
                <p className="title">Username:</p>
                <input value={userName} className="username-box" onChange={(e) => { setUserName(e.target.value) }} />

                <p className="title">Password:</p>
                <input type="password" value={password} className="password-box" onChange={(e) => { setPassword(e.target.value) }} />

                <button className="login-btn">Login</button>
            </form>
            <Link to="/signup">Not already signed up?</Link>
        </div>
    )
}
