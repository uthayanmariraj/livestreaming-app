import { useState, useContext } from 'react'
import { UserContext } from '../../UserContext'
import GenerateLink from './GenerateLink'
import GeneratedLink from './GeneratedLink'

export default function InviteModal({ onClose, roomId, roomName }) {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
    const username = useContext(UserContext)

    const [expiresIn, setExpiresIn] = useState("86400") // Default 1 day (seconds)
    const [maxUses, setMaxUses] = useState("unlimited") // Default unlimited
    const [inviteLink, setInviteLink] = useState("")
    const [copied, setCopied] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleGenerate(e) {
        e.preventDefault()
        setLoading(true)
        try {
            const body = {
                username,
                expiresIn: expiresIn === "never" ? null : parseInt(expiresIn),
                maxUses: maxUses === "unlimited" ? null : parseInt(maxUses)
            }

            const response = await fetch(`${BACKEND_URL}/rooms/${roomId}/invites`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            })

            const data = await response.json()
            if (data.success) {
                const fullLink = `${window.location.origin}/invite/${data.token}`
                setInviteLink(fullLink)
            } else {
                alert(data.message || "Failed to generate invite.")
            }
        } catch (err) {
            console.error("Error generating invite:", err)
            alert("An error occurred. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    function handleCopy() {
        if (!inviteLink) return
        navigator.clipboard.writeText(inviteLink)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content invite-modal-content">
                <h3>Invite to #{roomName}</h3>
                
                {!inviteLink ? (
                    <GenerateLink handleGenerate = {handleGenerate} expiresIn = {expiresIn}
                                setExpiresIn = {setExpiresIn} maxUses = {maxUses} setMaxUses = {setMaxUses} 
                                loading = {loading} onClose = {onClose}/>
                ) : (
                   <GeneratedLink inviteLink = {inviteLink} copied = {copied} handleCopy = {handleCopy} onClose = {onClose}/>
                )}
            </div>
        </div>
    )
}
