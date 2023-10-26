import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom"
import { Platform, Playlist, PlayvertAPIResponse } from "./App";
import ky from "ky";
import NoPlaylistArtwork from "../assets/NoPlaylistArtwork.png"

function Convert() {
    const params = useParams();
    let playlistUrl = params.url || "";

    const navigate = useNavigate();

    const NoPlaylistFoundMsg = "No playlist found.";

    const [loadingStatus, setLoadingStatus] = useState("");

    async function findPlaylist() {
        try {
            let playlistFound = false;
            const newPlaylist = new Playlist();
            setTimeout(() => {
                if (!playlistFound) {
                    setLoadingStatus(NoPlaylistFoundMsg)
                }
            }, 60000);
            setLoadingStatus("Searching for playlist...");
            if (playlistUrl.toLowerCase().includes("spotify")) {
                if (playlistUrl.toLowerCase().includes("spotify.link")) {
                    playlistUrl = await ky(`/api/playlists/redirect-url?url=${encodeURIComponent(playlistUrl)}`, { timeout: 60000 }).text();
                }
                const regex = /\/playlist\/(\w+)/;
                const match = playlistUrl.match(regex);
                const id = match ? match[1] : "";
                newPlaylist.platform = Platform.Spotify;
                await Promise.all([

                    ky(`/api/spotify/playlists/${id}`).json()
                        .then(data => {
                            const playlist = data as any;
                            const title = playlist.name;
                            const imageUrl = playlist.images[0].url;
                            const playlistUrl = playlist.external_urls.spotify;
                            if (title) {
                                playlistFound = true;
                                setLoadingStatus(`Getting playlist info from Spotify...`);
                            }
                            else {
                                setLoadingStatus(NoPlaylistFoundMsg);
                                return;
                            }
                            newPlaylist.title = title;
                            newPlaylist.imageUrl = imageUrl;
                            newPlaylist.playlistUrl = playlistUrl;
                        }),
                    ky(`/api/spotify/playlists/${id}/tracks`).json()
                        .then(data => {
                            const playlist = data as any;
                            newPlaylist.tracks = [];
                            for (let trackData of playlist) {
                                const artists: string[] = [];
                                for (let artist of trackData.track.artists) {
                                    artists.push(artist.name);
                                }
                                newPlaylist.tracks.push({
                                    id: trackData.track.uri,
                                    isrc: trackData.track.external_ids.isrc,
                                    title: trackData.track.name,
                                    artists: artists,
                                    coverArtUrl: trackData.track.album.images[0].url,
                                    linkToSong: trackData.track.external_urls.spotify
                                });
                            }
                        })
                ])
                    .catch(() => {
                        setLoadingStatus(NoPlaylistFoundMsg);
                    });
            }
            else if (playlistUrl.toLowerCase().includes("apple")) {
                const regex = /\/(pl\.[\w-]+)/;
                const match = playlistUrl.match(regex);
                const id = match ? match[1] : "";
                newPlaylist.platform = Platform.Apple;
                await Promise.all([ky(`/api/apple/playlists/${id}`).json()
                    .then(async data => {
                        const playlistData = (data as any).data[0];
                        const title = playlistData.attributes.name;
                        let imageUrl = NoPlaylistArtwork;
                        if (playlistData.attributes.artwork?.url) {
                            imageUrl = playlistData.attributes.artwork.url.replace("{w}", "700").replace("{h}", "700");
                        }
                        const playlistUrl = playlistData.attributes.url;
                        if (title) {
                            playlistFound = true;
                            setLoadingStatus(`Getting playlist info from Apple Music...`);
                        }
                        else {
                            setLoadingStatus(NoPlaylistFoundMsg);
                            return;
                        }
                        newPlaylist.title = title;
                        newPlaylist.imageUrl = imageUrl;
                        newPlaylist.playlistUrl = playlistUrl;
                    }), ky(`/api/apple/playlists/${id}/tracks`).json()
                        .then(data => {
                            const tracks = data as any;
                            for (let track of tracks) {
                                const trackId = track.id;
                                const isrc = track.attributes.isrc;
                                const title = track.attributes.name;
                                const artistsData = track.relationships.artists.data;
                                const coverArtUrl = track.attributes.artwork.url.replace("{w}", "700").replace("{h}", "700");
                                const linkToSong = track.attributes.url;
                                const artists = artistsData.map((artist: { attributes: { name: string; }; }) => {
                                    return artist.attributes.name;
                                });
                                newPlaylist.tracks.push({
                                    id: trackId,
                                    isrc: isrc,
                                    title: title,
                                    artists: artists,
                                    coverArtUrl: coverArtUrl,
                                    linkToSong: linkToSong
                                });

                            }
                        })
                ])
                    .catch((error) => {
                        console.error(error)
                        setLoadingStatus(NoPlaylistFoundMsg);
                    });
            }
            else if (playlistUrl.toLowerCase().includes("deezer")) {
                if (playlistUrl.includes("page.link")) {
                    playlistUrl = await ky(`/api/playlists/redirect-url?url=${encodeURIComponent(playlistUrl)}`, { timeout: 60000 }).text();
                }
                const regex = /\/playlist\/(\d+)/;
                const match = playlistUrl.match(regex);
                const id = match ? match[1] : "";
                newPlaylist.platform = Platform.Deezer;
                await ky(`/api/deezer/playlists/${id}`).json()
                    .then(async data => {
                        const playlist = data as any;
                        const title = playlist.title;
                        const imageUrl = playlist.picture;
                        const playlistUrl = playlist.link;
                        if (title) {
                            playlistFound = true;
                            setLoadingStatus(`Getting playlist info from Deezer..`);
                        }
                        else {
                            setLoadingStatus(NoPlaylistFoundMsg);
                            return;
                        }
                        newPlaylist.title = title;
                        newPlaylist.imageUrl = imageUrl;
                        newPlaylist.playlistUrl = playlistUrl;
                        const promises = playlist.tracks.data.map(async (track: { id: number; }) => {
                            const updatedTrack = await ky(`/api/deezer/tracks/${track.id}`).json();
                            return updatedTrack;
                        });
                        setLoadingStatus(`Getting song and artist info from Deezer...`);
                        await Promise.all(promises)
                            .then((tracks) => {
                                for (let track of tracks) {
                                    const artists: string[] = [];
                                    for (let artist of track.contributors) {
                                        artists.push(artist.name);
                                    }
                                    newPlaylist.tracks.push({
                                        id: track.id,
                                        isrc: track.isrc,
                                        title: track.title,
                                        artists: artists,
                                        coverArtUrl: track.album.cover,
                                        linkToSong: track.link
                                    });
                                }
                            })
                    })
                    .catch(() => {
                        setLoadingStatus(NoPlaylistFoundMsg);
                    });
            }
            else {
                setLoadingStatus(NoPlaylistFoundMsg);
            }

            if (!playlistFound) {
                return;
            }

            const body = {
                playlist: newPlaylist
            }
            setLoadingStatus("Generating playlist url...");
            const data: PlayvertAPIResponse = await ky.post("/api/playlists/generate-url", { json: body }).json();
            setLoadingStatus("Redirecting...");
            navigate(`/playlists/${data.linkUuid}`);
        } catch (error) {
            console.error(error);
            setLoadingStatus(NoPlaylistFoundMsg);
        }
    }

    let didInit = false;

    useEffect(() => {
        if (!didInit) {
            didInit = true;
            findPlaylist();
        }
    }, [])

    return (
        <>
            <h1>Converting Playlist</h1>
            {loadingStatus ? <>
                {
                    loadingStatus !== NoPlaylistFoundMsg ?
                        <progress />
                        : null
                }
                <p className="loading-status">{loadingStatus}</p>
            </>
                : null}
        </>
    )
}

export default Convert;