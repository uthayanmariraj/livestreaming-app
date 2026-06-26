import { useState } from 'react'

export default function OBSCredentials({ serverUrl, streamKey }) {
    const [copiedUrl, setCopiedUrl] = useState(false)
    const [copiedKey, setCopiedKey] = useState(false)

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(serverUrl)
            setCopiedUrl(true)
            setTimeout(() => setCopiedUrl(false), 2000)
        } catch (err) {
            console.error("Failed to copy URL:", err)
        }
    }

    const handleCopyKey = async () => {
        try {
            await navigator.clipboard.writeText(streamKey)
            setCopiedKey(true)
            setTimeout(() => setCopiedKey(false), 2000)
        } catch (err) {
            console.error("Failed to copy Stream Key:", err)
        }
    }

    return (
        <div className="obs-credentials-box">
            <h3>OBS Stream Settings</h3>
            <p>
                <strong>Server URL:</strong>{' '}
                <code
                    onClick={handleCopyUrl}
                    style={{ cursor: 'pointer' }}
                    title="Click to copy Server URL"
                >
                    {copiedUrl ? 'Copied!' : 'Click to copy'}
                </code>
            </p>
            <p>
                <strong>Stream Key:</strong>{' '}
                <code
                    onClick={handleCopyKey}
                    style={{ cursor: 'pointer' }}
                    title="Click to copy Stream Key"
                >
                    {copiedKey ? 'Copied!' : 'Click to copy'}
                </code>
            </p>
            <p className="hint">&emsp;Click each field and paste into OBS &emsp;Studio.</p>
        </div>
    )
}
