import { LiveKitRoom } from '@livekit/components-react'
import StreamVideoRenderer from './StreamVideoRenderer'

export default function StreamPlayer({ token, serverUrl, adminName, onLiveStateChange }) {
    if (!token || !serverUrl) {
        return <div className="video-loading">Connecting to stream host...</div>
    }

    return (
        <div className="stream-viewport">
            <LiveKitRoom
                video={false}
                audio={false}
                token={token}
                serverUrl={serverUrl}
                connect={true}
                style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%', height: '100%' }}
            >
                <StreamVideoRenderer streamerIdentity={adminName} onLiveStateChange={onLiveStateChange} />
            </LiveKitRoom>
        </div>
    )
}
