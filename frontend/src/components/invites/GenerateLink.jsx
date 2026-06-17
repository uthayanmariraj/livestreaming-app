
export default function GenerateLink({ handleGenerate, expiresIn, setExpiresIn, maxUses, setMaxUses, loading, onClose }) {
    return (
        <form onSubmit={handleGenerate}>
            <div className="form-group">
                <label>Expire Link After:</label>
                <select value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)}>
                    <option value="1800">30 minutes</option>
                    <option value="3600">1 hour</option>
                    <option value="21600">6 hours</option>
                    <option value="86400">1 day</option>
                    <option value="never">Never</option>
                </select>
            </div>

            <div className="form-group">
                <label>Max Number of Uses:</label>
                <select value={maxUses} onChange={(e) => setMaxUses(e.target.value)}>
                    <option value="1">1 use</option>
                    <option value="5">5 uses</option>
                    <option value="10">10 uses</option>
                    <option value="unlimited">No limit</option>
                </select>
            </div>

            <div className="modal-buttons">
                <button type="submit" disabled={loading}>
                    {loading ? "Generating..." : "Generate Invite Link"}
                </button>
                <button type="button" onClick={onClose} disabled={loading}>Cancel</button>
            </div>
        </form>
    )
}