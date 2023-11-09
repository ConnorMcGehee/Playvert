import { ChangeEvent, useState } from "react";
import "../css/Dashboard.css"
import { useNavigate } from "react-router-dom";

function Dashboard() {
    const navigate = useNavigate();
    const [playlistUrl, updatePlaylistUrl] = useState("");

    async function convertPlaylist(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
        navigate(`/convert/${encodeURIComponent(playlistUrl)}`);
    }

    return (
        <>
            <h1 id="playvert-h1">Playvert</h1>
            <div id="dashboard">
                <form id="search-form" action="">
                    <div id="search-container" className="move-up">
                        <label id="playlist-link">
                            <p>Playlist link</p>
                            <input onInput={(e: ChangeEvent<HTMLInputElement>) => updatePlaylistUrl(e.target.value)} type="search" name="search" id="search" placeholder="Paste playlist link here..." />
                        </label>
                        <button onClick={(e) => convertPlaylist(e)} id="convert">Convert!</button>
                    </div>
                </form>
                <p className="move-up">Enter a playlist link from Spotify or Apple Music to get started.</p>
            </div>
        </>
    )
}

export default Dashboard;