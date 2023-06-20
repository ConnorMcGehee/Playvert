import { useEffect, useState } from "react";
import { useParams } from "react-router-dom"
import { Platform, Playlist } from "./App";
import ShareablePlaylist from "./ShareablePlaylist";

function Convert() {
    const params = useParams();
    const playlistUrl = params.url || "";

    const NoPlaylistFoundMsg = "No playlist found.";

    const [loadingStatus, setLoadingStatus] = useState("");
    const [playlist, setPlaylist] = useState<Playlist>(new Playlist());
    const [uuid, setUuid] = useState("");

    async function findPlaylist() {
        let playlistFound = false;
        setPlaylist(new Playlist());
        const newPlaylist = new Playlist();
        setTimeout(() => {
            if (!playlistFound) {
                setLoadingStatus(NoPlaylistFoundMsg)
            }
        }, 15000)
        setLoadingStatus("Searching for playlist...");
        if (playlistUrl.toLowerCase().includes("spotify")) {
            const regex = /\/playlist\/(\w+)/;
            const match = playlistUrl.match(regex);
            const id = match ? match[1] : "";
            newPlaylist.platform = Platform.Spotify;
            await Promise.all([
                fetch(`/api/spotify/playlists/${id}`)
                    .then(res => res.json())
                    .then(data => {
                        const title = data.name;
                        const imageUrl = data.images[0].url;
                        const playlistUrl = data.external_urls.spotify;
                        if (title) {
                            playlistFound = true;
                            setLoadingStatus(`Getting playlist info from Spotify..`);
                        }
                        else {
                            setLoadingStatus(NoPlaylistFoundMsg);
                            return;
                        }
                        newPlaylist.title = title;
                        newPlaylist.imageUrl = imageUrl;
                        newPlaylist.playlistUrl = playlistUrl;
                        setPlaylist(prevPlaylist => ({
                            ...prevPlaylist,
                            title: title,
                            imageUrl: imageUrl,
                            playlistUrl: playlistUrl,
                            platform: Platform.Spotify
                        }));
                    }),
                fetch(`/api/spotify/playlists/${id}/tracks`)
                    .then(res => res.json())
                    .then(data => {
                        newPlaylist.tracks = [];
                        for (let trackData of data) {
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
                            setPlaylist(prevPlaylist => ({
                                ...prevPlaylist,
                                tracks: [...prevPlaylist.tracks, {
                                    id: trackData.track.uri,
                                    isrc: trackData.track.external_ids.isrc,
                                    title: trackData.track.name,
                                    artists: artists,
                                    coverArtUrl: trackData.track.album.images[0].url,
                                    linkToSong: trackData.track.external_urls.spotify
                                }]
                            }));
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
            await Promise.all([fetch(`/api/apple/playlists/${id}`)
                .then(res => res.json())
                .then(async data => {
                    const playlistData = data.data[0];
                    const title = playlistData.attributes.name;
                    const imageUrl = playlistData.attributes.artwork.url.replace("{w}", "700").replace("{h}", "700");
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
                    setPlaylist(prevPlaylist => ({
                        ...prevPlaylist,
                        title: title,
                        imageUrl: imageUrl,
                        playlistUrl: playlistUrl,
                        platform: Platform.Apple
                    }))
                }), fetch(`/api/apple/playlists/${id}/tracks`)
                    .then(res => res.json())
                    .then(data => {
                        const tracks = data.data;
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
                            setPlaylist(prevPlaylist => ({
                                ...prevPlaylist,
                                tracks: [...prevPlaylist.tracks, {
                                    id: trackId,
                                    isrc: isrc,
                                    title: title,
                                    artists: artists,
                                    coverArtUrl: coverArtUrl,
                                    linkToSong: linkToSong
                                }]
                            }));

                        }
                    })
            ])
                .catch(() => {
                    setLoadingStatus(NoPlaylistFoundMsg);
                });
        }
        else if (playlistUrl.toLowerCase().includes("deezer")) {
            let url = playlistUrl;
            if (playlistUrl.includes("page.link")) {
                url = await (await fetch(`/api/deezer/redirect/${encodeURIComponent(url)}`)).text();
            }
            const regex = /\/playlist\/(\d+)/;
            const match = url.match(regex);
            const id = match ? match[1] : "";
            newPlaylist.platform = Platform.Deezer;
            await fetch(`/api/deezer/playlists/${id}`)
                .then(res => res.json())
                .then(async data => {
                    const title = data.title;
                    const imageUrl = data.picture;
                    const playlistUrl = data.link;
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
                    setPlaylist(prevPlaylist => ({
                        ...prevPlaylist,
                        title: title,
                        imageUrl: imageUrl,
                        playlistUrl: playlistUrl,
                        platform: Platform.Deezer
                    }));
                    const promises = data.tracks.data.map(async (track: { id: number; }) => {
                        const res = await fetch(`/api/deezer/tracks/${track.id}`);
                        const updatedTrack = await res.json();
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
                                setPlaylist(prevPlaylist => ({
                                    ...prevPlaylist,
                                    tracks: [...prevPlaylist.tracks, {
                                        id: track.id,
                                        isrc: track.isrc,
                                        title: track.title,
                                        artists: artists,
                                        coverArtUrl: track.album.cover,
                                        linkToSong: track.link
                                    }]
                                }));
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
        const response = await fetch("/api/playlists/generate-url", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        setUuid(data.linkUuid);
        setLoadingStatus("");
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
            {loadingStatus ? <>
                {
                    loadingStatus !== NoPlaylistFoundMsg ?
                        <progress />
                        : null
                }
                <h3 className="loading-status">{loadingStatus}</h3>
            </>
                : null}
            {playlist.title ? <ShareablePlaylist newPlaylist={playlist} newId={uuid} isConverting={true} />
                : null}
        </>
    )
}

export default Convert;