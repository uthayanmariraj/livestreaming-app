import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Signup({ setLoggedIn, setUsername }) {
    const [userName, setUserName] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(false)
    const [signedUp, setSignedUp] = useState(false)

    async function handleLogIn(e) {
        e.preventDefault()
        try {
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
            const response = await fetch(
                `${BACKEND_URL}/signup`,
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
                setError(false)
                setSignedUp(true)
            } else {
                setError(true)
            }
        } catch (err) {
            console.error("Login error:", err)
            setError(true)
        }
    }

    if (signedUp) {
        return (
            <div>
                <p>SUCCESSFULLY SIGNED UP</p>
                <Link to='/login'>Log In</Link>
            </div>
        )
    }

    return (
        <div>
            <form className='login-form' onSubmit={handleLogIn}>
                {error && (<p>username already taken</p>)}
                <p className="title">Username:</p>
                <input value={userName} className="username-box" onChange={(e) => { setUserName(e.target.value) }} />

                <p className="title">Password:</p>
                <input type="password" value={password} className="password-box" onChange={(e) => { setPassword(e.target.value) }} />

                <button className="login-btn">Sign Up</button>
            </form>
            <Link to="/login">already signed up?</Link>
        </div>
    )
}
