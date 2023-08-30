import { useParams } from "react-router-dom";
import { Platform, Playlist } from "./App";
import { useEffect, useState } from "react";
import "../css/ShareablePlaylist.css"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDeezer, faItunesNote, faSpotify } from "@fortawesome/free-brands-svg-icons";
import { faFaceFrownOpen } from "@fortawesome/free-regular-svg-icons";
import { faCircleCheck, faCircleExclamation } from "@fortawesome/free-solid-svg-icons";

interface ShareablePlaylistProps {
    newPlaylist?: Playlist,
    newId?: string,
    isConverting?: boolean
}

function ShareablePlaylist({ newPlaylist, newId, isConverting = false }: ShareablePlaylistProps) {
    const params = useParams();
    const id = params.id || newId;
    const savePlatform = params.platform || "";

    const [shareLink, setShareLink] = useState("");
    const [playlist, setPlaylist] = useState<Playlist>(new Playlist());
    const [notFound, setNotFound] = useState(false);
    const [saveStatus, setSaveStatus] = useState(0);
    const [platform, setPlatform] = useState<Platform>();
    const [isSpotifyConnected, setSpotifyConnected] = useState(false);
    const [music, setMusicKitInstance] = useState<MusicKit.MusicKitInstance>();

    async function saveToSpotify() {
        setPlatform(Platform.Spotify);
        setSaveStatus(-1);

        let loggedIn = await checkSpotifyLoginStatus();

        if (!loggedIn) {
            window.location.replace(`/api/spotify/login/${id}`);
            return;
        }

        async function convertToSpotifySong(isrc: string, title: string, artist: string) {
            const searchParams = new URLSearchParams({
                isrc: isrc,
                title: title,
                artist: artist
            });
            const uri = await fetch(`/api/spotify/search?${searchParams}`)
                .then(res => {
                    return res.json()
                })
                .then(tracks => {
                    return tracks[0].uri;
                })
            return uri;
        }
        const convertPromises: Promise<string>[] = [];
        for (let track of playlist.tracks) {
            convertPromises.push(convertToSpotifySong(
                track.isrc, track.title, track.artists.join(" ")
            ));
        }
        const spotifyTrackUris = await Promise.all(convertPromises);
        const body = {
            playlistName: playlist.title,
            uris: spotifyTrackUris,
            imageUrl: playlist.imageUrl
        }
        const response = await fetch("/api/spotify/save-playlist", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
        setSaveStatus(response.status);
    }

    async function saveToApple() {
        console.log("Initializing Apple Music save")
        setPlatform(Platform.Apple);
        setSaveStatus(-1);
        console.log("Authorizing Apple Music")
        await authorizeMusicKit();


        if (!music?.isAuthorized) {
            setSaveStatus(401);
            console.log("Unauthorized ): sorry")
            return;
        }

        console.log("Authorized Apple Music")

        async function convertToAppleSong(isrc: string, title: string, artist: string): Promise<{
            id: string;
            type: string;
        } | null> {
            const searchParams = new URLSearchParams({
                isrc: isrc,
                title: title,
                artist: artist
            });
            try {
                console.count("Converting song");
                const res = await fetch(`/api/apple/search?${searchParams}`);
                const tracks: { id: string, type: string }[] = await res.json();
                if (tracks[0]) {
                    return {
                        id: tracks[0].id,
                        type: tracks[0].type
                    };
                }
                else {
                    return null;
                }
            } catch (error) {
                console.error(searchParams.toString(), error);
                return null;
            }
        }

        const convertPromises = playlist.tracks.map(track =>
            convertToAppleSong(track.isrc, track.title.replace(/ /g, "+"), track.artists.join("+"))
        );
        const appleTracks = (await Promise.all(convertPromises)).filter((item): item is { id: string; type: string; } => item !== null);
        console.log("Converted songs")
        const body = {
            musicUserToken: music.musicUserToken,
            playlistName: playlist.title,
            tracks: appleTracks,
            imageUrl: playlist.imageUrl
        }
        console.log("Saving playlist")
        const response = await fetch("/api/apple/save-playlist", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
        console.log(response)
        setSaveStatus(response.status);
        console.log("Finished")
    }

    // function saveToDeezer() {

    // }

    async function fetchPlaylist() {
        setPlaylist(new Playlist());
        await fetch(`/api/playlists/${id}`)
            .then(res => res.json())
            .then((data) => {
                setPlaylist(data.playlist);
            })
            .catch(() => {
                setNotFound(true);
            });
    }

    function disconnectLink() {
        return "/api/spotify/logout";

        // add other disconnect links here
    }
    function disconnectText() {

        return `Disconnect from Spotify`;

        // if (typeof playlist.platform !== "undefined") {
        //     return `Disconnect from ${Platform[playlist.platform]}`;
        // }
        // return null;
    }

    function platformText() {

        switch (playlist?.platform) {
            case Platform.Spotify: {
                return (
                    <span className="playlist-type">
                        <FontAwesomeIcon icon={faSpotify} className="small-icon" /> Open in Spotify&#32;
                    </span>
                );
            }
            case Platform.Apple: {
                return (
                    <span className="playlist-type">
                        <FontAwesomeIcon icon={faItunesNote} className="small-icon" /> Open in Apple Music&#32;
                    </span>
                );
            }
            case Platform.Deezer: {
                return (
                    <span className="playlist-type">
                        <FontAwesomeIcon icon={faDeezer} className="small-icon" /> Open in Deezer&#32;
                    </span>
                );
            }
            default: {
                return null;
            }
        }
    }

    useEffect(() => {
        setShareLink(`https://playvert.com/playlists/${id}`);
    }, [id]);

    let didInit = false;
    useEffect(() => {
        if (!newPlaylist && !didInit) {
            didInit = true;
            fetchPlaylist();
        }
        else if (newPlaylist) {
            setPlaylist(new Playlist());
            setPlaylist(newPlaylist);
        }
    }, [newPlaylist]);

    async function checkSpotifyLoginStatus() {
        const isLoggedIn = await new Promise<boolean>((resolve) => {
            fetch("/api/spotify/login-status")
                .then(res => res.json())
                .then((isLoggedIn: boolean) => {
                    setSpotifyConnected(isLoggedIn);
                    resolve(isLoggedIn);
                })
        });
        return isLoggedIn;
    }

    useEffect(() => {
        checkSpotifyLoginStatus();
        configureMusicKit();
    }, []);

    async function configureMusicKit() {
        if (!window.MusicKit) {
            const musicKitLoadedListener = () => {
                console.log("Loaded!")
                configureMusicKit();
            };
            document.addEventListener('musickitloaded', musicKitLoadedListener);
            return;
        }

        fetch("/api/apple/dev-token")
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

    async function authorizeMusicKit() {
        if (!music) {
            console.log("Configuring MusicKit")
            await configureMusicKit();
        }

        if (music && !music.isAuthorized) {
            await music.authorize()
                .then(() => {
                    console.log("Authorized!")
                })
                .catch(error => {
                    console.error("Error authorizing MusicKit:", error);
                });
        }
    }

    let startedSave = false;
    useEffect(() => {
        if (savePlatform && !startedSave && playlist.tracks.length > 0) {
            startedSave = true;
            switch (parseInt(savePlatform)) {
                case Platform.Spotify: {
                    saveToSpotify();
                    break;
                }
                case Platform.Apple: {
                    break;
                }
                case Platform.Deezer: {
                    break;
                }
                default: {
                    return;
                }
            }
        }
    }, [playlist])

    function renderSaveProgress() {
        if (!saveStatus) {
            return null;
        }
        if (saveStatus < 0) {
            return <>
                <br />
                <progress />
                Saving playlist...
            </>
        }
        let platformText = "";
        switch (platform) {
            case Platform.Spotify: {
                platformText = "Spotify";
                break;
            }
            case Platform.Apple: {
                platformText = "Apple Music";
                break;
            }
            case Platform.Deezer: {
                platformText = "Deezer";
                break;
            }
        }
        if (saveStatus >= 200 && saveStatus < 300) {
            return <>
                <br />
                <FontAwesomeIcon icon={faCircleCheck} /> Playlist saved to {platformText}!
            </>
        }
        if (saveStatus >= 300) {
            return <>
                <br />
                <FontAwesomeIcon icon={faCircleExclamation} /> There was an error saving the playlist to {platformText} (Error {saveStatus}).
            </>
        }
    }

    return (
        <>
            {playlist.tracks.length > 0 ? (
                <>
                    <a href={playlist.playlistUrl} target="_blank">
                        <img src={playlist.imageUrl} style={{ width: "10rem" }} />
                    </a>
                    <h2>
                        <a href={playlist.playlistUrl} target="_blank">
                            {playlist.title}
                        </a>
                    </h2>
                    {id ? <>
                        <input type="text" value={shareLink} readOnly className="share-link" />
                        <p>Shareable link expires in 24 hours</p>
                        <section className="save-buttons">
                            <button onClick={saveToSpotify}><FontAwesomeIcon className="small-icon" icon={faSpotify} /> Save to Spotify</button>
                            <button onClick={saveToApple}><FontAwesomeIcon className="small-icon" icon={faItunesNote} /> Save to Apple Music</button>
                            {/* <button><FontAwesomeIcon className="small-icon" icon={faDeezer} /> Save to Deezer</button> */}
                        </section>
                        <div className="save-progress">{renderSaveProgress()}</div>
                    </> : null}
                    <div className="platform-link">
                        <a href={playlist.playlistUrl} target="_blank">
                            {platformText()}
                        </a>
                        {isSpotifyConnected ?
                            <a href={disconnectLink()}>
                                {disconnectText()}
                            </a>
                            : null}
                    </div>
                    {<section className="playlist-data">
                        {playlist.tracks.map((track, index) => {
                            const title = track.title;
                            const artistLength = track.artists.length;
                            let artists = "";
                            if (artistLength > 1) {
                                track.artists.forEach((artist: any, index: number) => {
                                    let suffix = ", ";
                                    if (index === artistLength - 2) {
                                        suffix = " & ";
                                    } else if (index === artistLength - 1) {
                                        suffix = "";
                                    }
                                    artists += artist + suffix;
                                });
                            } else {
                                artists += track.artists[0];
                            }
                            return (
                                <a href={track.linkToSong} target="_blank" key={index}>
                                    <figure><img src={track.coverArtUrl} />
                                        <figcaption><h4>{title}</h4></figcaption>
                                        <figcaption className="small">{artists}</figcaption>
                                    </figure>
                                </a>
                            )
                        })}
                    </section>}
                </>
            )
                : notFound ? <p><FontAwesomeIcon icon={faFaceFrownOpen} style={{ fontSize: "1.5rem" }} /><br /><br />
                    The playlist you're looking for doesn't exist or has expired.</p>
                    : isConverting ?
                        null
                        : <>
                            <p>Loading...</p>
                            <progress />
                        </>
            }
        </>
    )
}

export default ShareablePlaylist;