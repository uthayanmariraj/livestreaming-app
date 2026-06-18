import { VideoTrack, useTracks } from '@livekit/components-react'
import { Track } from 'livekit-client'
import { useEffect } from 'react'

export default function StreamVideoRenderer({ streamerIdentity, onLiveStateChange }) {
    // Queries only active video tracks in this room
    const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }])
    
    console.log("Streamer we are looking for:", `${streamerIdentity}_stream`);
    console.log("All active video tracks in room:", tracks.map(t => ({
        identity: t.participant.identity,
        source: t.source,
        isSubscribed: t.publication?.isSubscribed
    })));
    
    // Find the track belonging to the streamer (adminName/streamerIdentity + "_stream")
    const streamerTrack = tracks.find((t) => t.participant.identity === `${streamerIdentity}_stream`) || tracks[0]
    const isLive = !!streamerTrack

    useEffect(() => {
        if (onLiveStateChange) {
            onLiveStateChange(isLive)
        }
    }, [isLive, onLiveStateChange])

    if (!streamerTrack) {
        return (
            <div className="stream-offline">
                <p>Stream is currently offline.</p>
                <p className="subtext">Waiting for the streamer to start broadcasting from OBS...</p>
            </div>
        )
    }

    return (
        <VideoTrack
            trackRef={streamerTrack}
            className="video-track-element"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
    )
}
