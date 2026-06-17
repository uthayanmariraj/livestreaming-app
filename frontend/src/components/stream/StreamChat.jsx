import OBSCredentials from './OBSCredentials'

export default function StreamChat({ messages, message, setMessage, handleSend, messagesEndRef, streamCredentials }) {
    return (
        <div className="members-sidebar chat-sidebar">
            {streamCredentials && (
                <OBSCredentials 
                    serverUrl={streamCredentials.serverUrl} 
                    streamKey={streamCredentials.streamKey} 
                />
            )}
            <h3>Live Stream Chat</h3>
            <div className="message-container">
                <ul className="message-list">
                    {messages.map((msg, index) => (
                        <li key={index} className={msg.isSystem ? "message-system-notif" : "message"}>
                            {msg.isSystem ? (
                                <p className="system-text">{msg.message}</p>
                            ) : (
                                <>
                                    <p className="username">{msg.username}: &nbsp;</p>
                                    <p className="text">{msg.message}</p>
                                </>
                            )}
                        </li>
                    ))}
                    <div ref={messagesEndRef} />
                </ul>
            </div>

            <form className="message-form" onSubmit={handleSend}>
                <input
                    className="message-box"
                    placeholder="Say something..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                <button className="send-btn">SEND</button>
            </form>
        </div>
    )
}
