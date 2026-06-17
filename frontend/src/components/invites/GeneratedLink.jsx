export default function GeneratedLink({ inviteLink, copied, handleCopy, onClose }) {
    return (
        <div className="invite-link-success">
            <p className="invite-success-text">Your invite link is ready!</p>
            <div className="invite-copy-wrapper">
                <input type="text" readOnly value={inviteLink} className="invite-link-input" />
                <button onClick={handleCopy} className="copy-btn">
                    {copied ? "Copied!" : "Copy"}
                </button>
            </div>
            <div className="modal-buttons">
                <button type="button" onClick={onClose}>Close</button>
            </div>
        </div>
    )
}