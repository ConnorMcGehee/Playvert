import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpotify, faItunesNote } from "@fortawesome/free-brands-svg-icons";
import "../css/Account.css"
import { useEffect, useState } from "react";

function Account() {
    // const [isLoggedIn, setLoginStatus] = useState(false);
    const [isSpotifyConnected, setSpotifyConnectionStatus] = useState(false);
    const [isAppleConnected, setAppleConnectionStatus] = useState(false);
    // const [isDeezerConnected, setDeezerConnectionStatus] = useState(false);
    // const isDeezerConnected = false;
    const [music, setMusicKitInstance] = useState<MusicKit.MusicKitInstance>();
    const [isLoading, setLoadingStatus] = useState(true);

    async function fetchConnectionData() {
        await Promise.all([
            fetch("/auth")
                .then(res => res.json()),
                // .then((isLoggedIn: boolean) => {
                //     // setLoginStatus(isLoggedIn);
                // }),
            fetch("/api/spotify/login-status")
                .then(res => res.json())
                .then((isConnected: boolean) => {
                    setSpotifyConnectionStatus(isConnected);
                }),
            configureMusicKit()
        ]);
        setLoadingStatus(false);
    }

    async function configureMusicKit() {
        if (!window.MusicKit) {
            const musicKitLoadedListener = () => {
                configureMusicKit();
            };
            document.addEventListener('musickitloaded', musicKitLoadedListener);
            return;
        }

        await fetch("/api/apple/dev-token")
            .then(response => response.text())
            .then(token => {
                MusicKit.configure({
                    developerToken: token,
                    app: {
                        name: 'Playvert',
                        build: '0.0.2',
                    },
                });

                // MusicKit instance is available
                setMusicKitInstance(MusicKit.getInstance());
            })
            .catch(error => console.error('Error getting Apple developer token:', error));
    }

    useEffect(() => {
        fetchConnectionData();
    }, []);

    useEffect(() => {
        setAppleConnectionStatus(music?.isAuthorized ?? false);
    }, [music]);

    async function appleConnect(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) {
        e.preventDefault();
        await music?.authorize();
        if (music?.isAuthorized) {
            setAppleConnectionStatus(true);
        }
    }

    async function appleDisconnect(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) {
        e.preventDefault();
        await music?.unauthorize();
        setAppleConnectionStatus(false);
    }

    return (
        <>
            <h2>Account</h2>
            <section id="account-settings">
                {isLoading ? <>
                    <progress />
                    <p>Loading...</p>
                </> : <>
                    {/* {isLoggedIn ? <p>You're logged in!</p> :
                        <p>You're not logged in.</p>} */}
                    <>
                        <div className="connection">
                            <FontAwesomeIcon icon={faSpotify} />
                            {!isSpotifyConnected ? (
                                <a href="/api/spotify/login" target="_self">Connect to Spotify</a>) :
                                <a href="/api/spotify/logout" target="_self">Disconnect from Spotify</a>}
                        </div>
                        <div className="connection">
                            <FontAwesomeIcon icon={faItunesNote} />
                            {!isAppleConnected ? (
                                <a href="#" onClick={(e) => appleConnect(e)}>Connect to Apple Music</a>) :
                                <a href="#" onClick={(e) => appleDisconnect(e)}>Disconnect from Apple Music</a>}
                        </div>
                        {/* <div className="connection">
                            <FontAwesomeIcon icon={faDeezer} />
                            {!isDeezerConnected ? (
                                <a href="/api/deezer/login" target="_self">Connect to Deezer</a>) :
                                <a href="/api/deezer/logout" target="_self">Disconnect from Deezer</a>}
                        </div> */}
                    </>
                </>}
            </section>
        </>
    )
}

export default Account;