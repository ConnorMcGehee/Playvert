import { useParams } from "react-router-dom";
import { Track, AppleTrack, Platform, Playlist, PlayvertAPIResponse, SpotifyTrack } from "./App";
import { useEffect, useState } from "react";
import "../css/ShareablePlaylist.css"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDeezer, faItunesNote, faSpotify } from "@fortawesome/free-brands-svg-icons";
import { faFaceFrownOpen, faClipboard } from "@fortawesome/free-regular-svg-icons";
import { faCircleCheck, faCircleExclamation } from "@fortawesome/free-solid-svg-icons";
import ky from "ky";

interface ConvertFunction {
    (track: Track): Promise<any>;
}

function ShareablePlaylist() {
    const params = useParams();
    const id = params.id;

    const [shareLink, setShareLink] = useState("");
    const [playlist, setPlaylist] = useState<Playlist>(new Playlist());
    const [notFound, setNotFound] = useState(false);
    const [saveStatus, setSaveStatus] = useState(0);
    const [platform, setPlatform] = useState<Platform>();
    const [music, setMusicKitInstance] = useState<MusicKit.MusicKitInstance>();
    const [displayCopied, setDisplayCopied] = useState(false);
    const [copiedTimeout, setCopiedTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
    const [progress, setProgress] = useState(-1);

    async function processTracks(tracks: Track[], convertFunction: ConvertFunction, chunkSize: number = 20): Promise<any[]> {
        const results: any[] = [];
        for (let i = 0; i < tracks.length; i += chunkSize) {
            const chunk = tracks.slice(i, i + chunkSize);
            const chunkPromises = chunk.map(track => convertFunction(track));
            const chunkResults = await Promise.all(chunkPromises);
            results.push(...chunkResults);
        }
        return results;
    }

    async function convertToSpotifySong({ isrc, title, artists }: Track): Promise<string> {
        try {
            const searchParams = new URLSearchParams({
                isrc: isrc,
                title: title,
                artist: artists.join(" ")
            });
            const tracks: SpotifyTrack[] = await ky(`/api/spotify/search?${searchParams}`).json();
            const uri = tracks[0].uri;
            if (!uri) {
                throw new Error("No URI found.");
            }
            return uri;
        }
        catch (error) {
            throw new Error("No URI found.");
        }
        finally {
            setProgress(prevProgress => prevProgress + 1);
        }
    }

    async function convertToAppleSong({ isrc, title, artists }: Track): Promise<{ id: string; type: string }> {
        try {
            const searchParams = new URLSearchParams({
                isrc: isrc,
                title: title,
                artist: artists.join(" ")
            });
            const track: AppleTrack = await ky(`/api/apple/search?${searchParams}`).json();
            if (track) {
                return {
                    id: track.id,
                    type: track.type
                };
            }
            else {
                throw new Error("No ID found.");
            }
        } catch (error) {
            throw new Error("No ID found.");
        } finally {
            setProgress(prevProgress => prevProgress + 1);
        }
    }

    async function saveToSpotify() {
        try {
            setPlatform(Platform.Spotify);
            setSaveStatus(0);

            let loggedIn = await checkSpotifyLoginStatus();

            if (!loggedIn) {
                sessionStorage.setItem('shouldSave', Platform.Spotify.toString());
                window.location.replace(`/api/spotify/login/${id}`);
                return;
            }

            setSaveStatus(-1);
            setProgress(0);

            const spotifyTrackUris = await processTracks(playlist.tracks, convertToSpotifySong);

            const body = {
                playlistName: playlist.title,
                uris: spotifyTrackUris,
                imageUrl: playlist.imageUrl
            }

            const response = await ky.post("/api/spotify/save-playlist", { json: body });
            setSaveStatus(response.status);
        }
        catch (error) {
            console.log(error);
            setSaveStatus(500);
        }
        finally {
            setProgress(-1);
        }
    }

    async function saveToApple() {
        try {
            setPlatform(Platform.Apple);
            setSaveStatus(0);

            await authorizeMusicKit();
            if (!music?.isAuthorized) {
                setSaveStatus(401);
                throw new Error("Not authorized");
            }

            setSaveStatus(-1);
            setProgress(0);

            const appleTracks = await processTracks(playlist.tracks, convertToAppleSong);

            const body = {
                musicUserToken: music.musicUserToken,
                playlistName: playlist.title,
                tracks: appleTracks,
                imageUrl: playlist.imageUrl
            }
            const response = await ky.post("/api/apple/save-playlist", { json: body });
            setSaveStatus(response.status);
        }
        catch {
            setSaveStatus(500);
        }
    }

    // function saveToDeezer() {

    // }

    async function getPlaylist() {
        setPlaylist(new Playlist());
        try {
            const data: PlayvertAPIResponse = await ky(`/api/playlists/${id}`).json();
            setPlaylist(data.playlist);
        }
        catch {
            setNotFound(true);
        }
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
        if (!didInit) {
            didInit = true;
            getPlaylist();
        }
    }, []);

    async function checkSpotifyLoginStatus() {
        const isLoggedIn: boolean = await ky("/api/spotify/login-status").json();
        return isLoggedIn;
    }

    useEffect(() => {
        configureMusicKit();
    }, []);

    async function configureMusicKit() {
        if (!window.MusicKit) {
            const musicKitLoadedListener = () => {
                configureMusicKit();
            };
            document.addEventListener('musickitloaded', musicKitLoadedListener);
            return;
        }

        ky("/api/apple/dev-token").text()
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
            await configureMusicKit();
        }

        if (music && !music.isAuthorized) {
            await music.authorize()
                .catch(error => {
                    console.error("Error authorizing MusicKit:", error);
                });
        }
    }

    let startedSave = false;
    useEffect(() => {
        const savePlatform = sessionStorage.getItem('shouldSave');
        if (savePlatform && !startedSave && playlist.tracks.length > 0) {
            startedSave = true;
            sessionStorage.removeItem('shouldSave');
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
    }, [playlist]);

    function renderSaveProgress() {
        if (!saveStatus) {
            return null;
        }
        if (saveStatus < 0) {
            return <>
                <br />
                <div className="saving-progress">
                    <progress value={progress} max={playlist.tracks.length + 1} />
                    {progress === playlist.tracks.length ?
                        "Saving playlist..."
                        :
                        `Converting song ${progress} of ${playlist.tracks.length}...`
                    }
                </div>
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
                <FontAwesomeIcon className="small-icon" icon={faCircleCheck} /> Playlist saved to {platformText}!
            </>
        }
        if (saveStatus >= 300) {
            return <>
                <br />
                <FontAwesomeIcon className="small-icon" icon={faCircleExclamation} /> There was an error saving the playlist to {platformText} (Error {saveStatus}).
            </>
        }
    }

    function copyShareLink() {
        if (copiedTimeout) {
            clearTimeout(copiedTimeout);
        }

        navigator.clipboard.writeText(shareLink);

        setDisplayCopied(true);

        const newTimeout = setTimeout(() => {
            setDisplayCopied(false);
        }, 2000);

        setCopiedTimeout(newTimeout);
    };

    return (
        <>
            {playlist.tracks.length > 0 ? (
                <>
                    <img src={playlist.imageUrl} alt={playlist.title + " artwork"} style={{ width: "10rem" }} />
                    <h1>
                        {playlist.title}
                    </h1>
                    <a href={playlist.playlistUrl} className="platform-link" target="_blank">
                        {platformText()}
                    </a>
                    {id ? <>
                        <p onClick={copyShareLink} className="share-link">{displayCopied ? "Copied to clipboard!" : shareLink}
                            <FontAwesomeIcon icon={faClipboard} className="copy-icon small-icon" onClick={copyShareLink} /></p>
                        <p>Shareable link expires in 24 hours</p>
                        <section className="save-buttons">
                            <button onClick={saveToSpotify}><FontAwesomeIcon className="small-icon" icon={faSpotify} /> Save to Spotify</button>
                            <button onClick={saveToApple}><FontAwesomeIcon className="small-icon" icon={faItunesNote} /> Save to Apple Music</button>
                            {/* <button><FontAwesomeIcon className="small-icon" icon={faDeezer} /> Save to Deezer</button> */}
                        </section>
                        <div className="save-progress">{renderSaveProgress()}</div>
                    </> : null}
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
                                    <figure><img src={track.coverArtUrl} alt={track.title + " cover art"} />
                                        <figcaption className="playlist-title">{title}</figcaption>
                                        <figcaption className="small">{artists}</figcaption>
                                    </figure>
                                </a>
                            )
                        })}
                    </section>}
                </>
            )
                : notFound ? <p><FontAwesomeIcon className="small-icon" icon={faFaceFrownOpen} style={{ fontSize: "1.5rem" }} /><br /><br />
                    The playlist you're looking for doesn't exist or has expired.</p>
                    :
                    <>
                        <progress />
                    </>
            }
        </>
    )
}

export default ShareablePlaylist;