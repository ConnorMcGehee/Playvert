import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpotify, faDeezer, faItunesNote } from "@fortawesome/free-brands-svg-icons";
import "../css/Account.css"

interface AccountProps {
    isLoggedIn: boolean,
    isSpotifyConnected: boolean,
    isDeezerConnected: boolean,
    isAppleConnected: boolean
}

function Account({ isLoggedIn, isSpotifyConnected, isDeezerConnected, isAppleConnected }: AccountProps) {
    return (
        <>
            <h2>Account</h2>
            <section id="account-settings">
                {isLoggedIn ?
                    <>
                        <div className="connection">
                            <FontAwesomeIcon icon={faSpotify} />
                            {!isSpotifyConnected && isLoggedIn ? (
                                <a href="/api/spotify/login" target="_self">Connect to Spotify</a>) :
                                <a href="/api/spotify/logout" target="_self">Disconnect from Spotify</a>}
                        </div>
                        <div className="connection">
                            <FontAwesomeIcon icon={faDeezer} />
                            {!isDeezerConnected && isLoggedIn ? (
                                <a href="/api/deezer/login" target="_self">Connect to Deezer</a>) :
                                <a href="/api/deezer/logout" target="_self">Disconnect from Deezer</a>}
                        </div>
                        <div className="connection">
                            <FontAwesomeIcon icon={faItunesNote} />
                            {!isAppleConnected && isLoggedIn ? (
                                <a href="/api/apple/login" target="_self">Connect to Apple Music</a>) :
                                <a href="/api/apple/logout" target="_self">Disconnect from Apple Music</a>}
                        </div>
                    </> :
                    <p>You're not logged in.</p>}
            </section>
        </>
    )
}

export default Account;