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
        <div id="dashboard">
            <form id="search-form" action="">
                <div id="search-container">
                    <input onInput={(e: ChangeEvent<HTMLInputElement>) => updatePlaylistUrl(e.target.value)} type="search" name="search" id="search" placeholder="Paste playlist link here..." autoFocus />
                    <button onClick={(e) => convertPlaylist(e)} id="convert">Convert!</button>
                </div>
            </form>
            <p>Enter a playlist link from Spotify, Apple Music, or Deezer to get started.</p>
        </div>
    )
}

export default Dashboard;