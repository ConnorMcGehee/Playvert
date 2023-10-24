import got, { CancelableRequest, Response as GotResponse } from "got";
import { Request, Response } from "express";
import { NewRequest, baseUrl, generateRandomString } from "../../server.ts";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "";
const REDIRECT_URI = `${baseUrl}/api/spotify/callback`;

interface SpotifyTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    scope: string;
}

interface SpotifyAPIResponse {
    items: [],
    tracks: {
        items: []
    },
    id: string,
    audio_features: AudioFeaturesObject[]
}

interface SpotifySong {
    track: {
        id: string,
        uri: string
    }
}

interface AudioFeaturesObject {
    danceability: number,
    energy: number,
    tempo: number,
    id: string,
    uri: string
}

const SCOPE_ARRAY = ["ugc-image-upload",
    "playlist-read-private",
    "playlist-read-collaborative",
    "playlist-modify-private",
    "playlist-modify-public",
    "user-read-private",
    "user-library-modify",
    "user-library-read"];
const SCOPE = SCOPE_ARRAY.join(" ");

export const login = (req: Request, res: Response) => {
    let { uuid } = req.params;

    const state = generateRandomString();
    req.session.state = state;

    const params = new URLSearchParams({
        response_type: "code",
        client_id: SPOTIFY_CLIENT_ID,
        scope: SCOPE,
        redirect_uri: REDIRECT_URI,
        state: state,
        show_dialog: "true"
    })
    if (uuid) {
        req.session.redirect = uuid;
    }
    return res.redirect('https://accounts.spotify.com/authorize?' + params);
}


export const logout = (req: Request, res: Response) => {
    req.session.spotify_access_token = "";
    req.session.spotify_refresh_token = "";
    req.session.spotify_token_expiration_time = 0;

    return res.redirect("/");
}

export const getLoginStatus = (req: Request, res: Response) => {
    try {
        const isLoggedIn = !!req.session.spotify_access_token; // Check if the access_token is present in the session
        return res.json(isLoggedIn);
    }
    catch (error) {
        console.error(error);
        return res.status(500).send(error);
    }
}

export const authorize = async (req: Request, res: Response) => {
    const error = req.query.error;
    const code = req.query.code?.toString();
    if (!code) {
        return res.send("Error: " + error);
    }
    const returnState = req.query.state;

    if (returnState !== req.session.state) {
        return res.status(400).send("Mismatched state");
    }

    delete req.session.state;

    if (error) {
        return res.status(500).send(`Callback Error: ${error}`);
    }

    const options = {
        form: {
            grant_type: "authorization_code",
            code: code,
            redirect_uri: REDIRECT_URI
        },
        headers: {
            Authorization: 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
        }
    }

    try {
        const data: SpotifyTokenResponse = await spotifyRequest(got.post("https://accounts.spotify.com/api/token", options).json());

        const access_token = data['access_token'];
        const refresh_token = data['refresh_token']!;
        const expires_in = data['expires_in'];

        req.session.spotify_access_token = access_token;
        req.session.spotify_refresh_token = refresh_token;
        req.session.spotify_token_expiration_time = new Date().getTime() + expires_in * 1000;

        if (req.session.redirect) {
            let uuid = req.session.redirect;
            delete req.session.redirect;
            return res.redirect(`/playlists/${uuid}`);
        }
        return res.redirect("/");
    }
    catch (error) {
        console.error(error);
        return res.status(500).send(error);
    }
}

export const getUserPlaylists = async (req: Request, res: Response) => {
    const options = {
        headers: {
            Authorization: `Bearer ${req.session.spotify_access_token}`
        }
    }
    try {
        const data: SpotifyAPIResponse = await spotifyRequest(got("https://api.spotify.com/v1/me/playlists", options).json());
        return res.json(data.items);
    }
    catch (error) {
        console.error(error);
        return res.status(500).send(error);
    }
}

export const getPlaylist = async (req: Request, res: Response) => {
    let token = req.session.spotify_access_token;

    if (!token) {
        const authOptions = {
            headers: {
                'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64'),
                "Content-Type": "application/x-www-form-urlencoded"
            },
            form: {
                grant_type: 'client_credentials'
            },
        };

        const body: { access_token: string } = await spotifyRequest(got.post("https://accounts.spotify.com/api/token", authOptions).json());

        token = body.access_token;
    }

    const options = {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
    try {
        const data: SpotifyAPIResponse = await spotifyRequest(got(`https://api.spotify.com/v1/playlists/${req.params.id}`, options).json());
        return res.json(data);
    }
    catch (error) {
        console.error(error);
        return res.status(500).send(error);
    }
}

export const getPlaylistSongs = async (req: Request, res: Response) => {

    let token = req.session.spotify_access_token;

    if (!token) {
        const authOptions = {
            headers: {
                'Authorization': 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'),
                "Content-Type": "application/x-www-form-urlencoded"
            },
            form: {
                grant_type: 'client_credentials'
            },
        };

        const body: { access_token: string } = await spotifyRequest(got.post("https://accounts.spotify.com/api/token", authOptions).json());
        token = body.access_token;
    }

    const options = {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };

    let playlistSongs: SpotifySong[] = [];
    let moreDataAvailable = true;
    let offset = 0;
    const limit = 100;

    while (moreDataAvailable) {
        try {
            const url = `https://api.spotify.com/v1/playlists/${req.params.id}/tracks?offset=${offset}&limit=${limit}`;
            const data: SpotifyAPIResponse = await spotifyRequest(got(url, options).json());
            playlistSongs = playlistSongs.concat(data.items);
            if (data.items.length < limit) {
                moreDataAvailable = false;
            } else {
                offset += limit;
            }
        } catch (error) {
            console.error(error);
            return res.send(error);
        }
    }

    return res.json(playlistSongs);
};

export const auth = (_req: Request, res: Response) => {
    return res.send("Success!")
}

export const search = async (req: Request, res: Response) => {
    const options = {
        headers: {
            Authorization: `Bearer ${req.session.spotify_access_token}`
        }
    }
    const isrc = req.query.isrc ? `isrc: ${req.query.isrc} ` : "";
    const title = req.query.title ? `title: ${req.query.title} ` : "";
    const artist = req.query.artist ? `artist: ${req.query.artist} ` : "";
    let tracks = [];
    try {
        const isrcSearchParams = new URLSearchParams({
            q: isrc,
            type: "track"
        });
        const isrcResponse: SpotifyAPIResponse = await spotifyRequest(got(`https://api.spotify.com/v1/search?${isrcSearchParams}`, options).json());
        tracks = [...isrcResponse.tracks.items];
        const trackSearchParams = new URLSearchParams({
            q: title + artist,
            type: "track"
        });
        let trackResponse: SpotifyAPIResponse;
        if (!tracks.length) {
            trackResponse = await spotifyRequest(got(`https://api.spotify.com/v1/search?${trackSearchParams}`, options).json());
            tracks = [...trackResponse.tracks.items];
        }
        return tracks.length ? res.json(tracks) : res.status(404).json({ message: "No tracks found." });
    }
    catch (error) {
        console.error("spotify search error:", error);
        return res.status(500).send(error);
    }
}

export const savePlaylist = async (req: Request, res: Response) => {
    try {
        const playlistName = req.body.playlistName;
        const songUris: string[] = req.body.uris;
        const imageUrl = req.body.imageUrl;
        let imageData = "";
        const buffer = await spotifyRequest(got(imageUrl).buffer());
        imageData = buffer.toString("base64");
        const userData: SpotifyAPIResponse = await spotifyRequest(got("https://api.spotify.com/v1/me", {
            headers: {
                Authorization: `Bearer ${req.session.spotify_access_token}`
            }
        }).json());
        const userId = userData.id;
        const playlistBodyData = {
            name: playlistName
        }
        const playlistData: SpotifyAPIResponse = await spotifyRequest(got.post(`https://api.spotify.com/v1/users/${userId}/playlists`, {
            headers: {
                Authorization: `Bearer ${req.session.spotify_access_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(playlistBodyData)
        }).json());
        const playlistId = playlistData.id;
        let imageSizeKB = Buffer.byteLength(imageData, 'base64') / 1024;
        if (imageSizeKB < 256) {
            await spotifyRequest(got.put(`https://api.spotify.com/v1/playlists/${playlistId}/images`, {
                headers: {
                    Authorization: `Bearer ${req.session.spotify_access_token}`,
                    "Content-Type": "image/jpeg"
                },
                body: imageData
            }));
        }

        let response: any;

        const chunkSize = 100;
        for (let i = 0; i < songUris.length; i += chunkSize) {
            const chunk = songUris.slice(i, i + chunkSize);
            const tracksBodyData = {
                uris: chunk
            };
            response = await spotifyRequest(got.post(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
                headers: {
                    Authorization: `Bearer ${req.session.spotify_access_token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(tracksBodyData)
            }));

            // Handle the response, e.g., check for errors, log success, etc.
        }
        return res.status(response.statusCode).send(response.body);
    }
    catch (error) {
        return res.status(500).send(error);
    }
};

export const replaceAllPlaylistTracksInDanceableOrderLol = async (req: Request, res: Response) => {

    const token = req.session.spotify_access_token;

    if (!token) {
        return res.status(401).send("Not authorized");
    }

    const options = {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };

    const playlistSongs: SpotifySong[] = req.body.playlistSongs;

    async function fetchAudioFeatures(trackIds: string[], options: { headers: { Authorization: string; }; }) {
        const chunkSize = 100;
        let featuresData: AudioFeaturesObject[] = [];

        for (let i = 0; i < trackIds.length; i += chunkSize) {
            const chunk = trackIds.slice(i, i + chunkSize).join(",");
            const featuresUrl = `https://api.spotify.com/v1/audio-features?ids=${chunk}`;
            const response: SpotifyAPIResponse = await spotifyRequest(got(featuresUrl, options).json());
            featuresData = featuresData.concat(response.audio_features);
        }

        return featuresData;
    }

    const trackIds = playlistSongs.map(song => song.track.id);
    const featuresData = await fetchAudioFeatures(trackIds, options);

    // Find the min and max tempo for scaling
    const minTempo = Math.min(...featuresData.map(song => song.tempo));
    const maxTempo = Math.max(...featuresData.map(song => song.tempo));

    // Define the weighting factors
    const tempoWeight = 0.33;
    const danceabilityWeight = 0.33;
    const energyWeight = 0.34;

    // Function to calculate the score of a song
    function scoreSong(song: AudioFeaturesObject) {
        const normalizedTempo = (song.tempo - minTempo) / (maxTempo - minTempo);
        return (normalizedTempo * tempoWeight + song.danceability * danceabilityWeight + song.energy * energyWeight) * 100;
    }

    function customSort(arr: AudioFeaturesObject[]): AudioFeaturesObject[] {
        // Define the weighting factors

        // Sort the array using a weighted sum of tempo and danceability
        const sortedArr = arr.sort((a, b) => {
            const scoreA = scoreSong(a);
            const scoreB = scoreSong(b);
            return scoreB - scoreA;
        });

        const length = sortedArr.length;
        const newArr: AudioFeaturesObject[] = [];

        for (let i = 0; i < length; i++) {
            if (i % 3 === 0) {
                newArr.push(sortedArr[i]);
            } else {
                newArr.unshift(sortedArr[i]);
            }
        }

        return newArr;
    }

    const reorderedSongs = customSort(featuresData);

    // Create a map of song IDs to their corresponding playlist item
    const idToSongMap = new Map();
    playlistSongs.forEach(song => {
        idToSongMap.set(song.track.id, song);
    });

    // Reorder the playlistSongs array based on reorderedSongs
    const reorderedPlaylistSongs = new Set(reorderedSongs.map(feature => {
        return idToSongMap.get(feature.id);
    }));

    async function replacePlaylistTracksInChunks(playlistId: string, reorderedPlaylistSongs: SpotifySong[]) {
        const chunkSize = 100;

        // Initial replace to set the first chunk of tracks (or clear the playlist if no tracks)
        const initialTrackUris = reorderedPlaylistSongs.slice(0, chunkSize).map(song => song.track.uri);
        await spotifyRequest(got.put(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ uris: initialTrackUris })
        }));

        // Add the remaining tracks in chunks
        for (let i = chunkSize; i < reorderedPlaylistSongs.length; i += chunkSize) {
            const chunk = reorderedPlaylistSongs.slice(i, i + chunkSize);
            const trackUris = chunk.map(song => song.track.uri);
            spotifyRequest(got.post(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ uris: trackUris })
            }))
        }
    }

    // Usage:
    const playlistId = req.params.id;
    await replacePlaylistTracksInChunks(playlistId, [...reorderedPlaylistSongs]);

    return res.json([...reorderedPlaylistSongs]);
};

const gotQueue: { request: NewRequest, resolve: (value: any) => void, reject: (reason: any) => void }[] = [];
const RATE_LIMIT = 20;
const INTERVAL = 1000 / RATE_LIMIT; // 50ms interval between requests to achieve 20 requests per second

let isProcessing = false;

const processQueue = async () => {
    if (isProcessing) return;
    isProcessing = true;

    while (gotQueue.length > 0) {
        const { request, resolve, reject } = gotQueue.shift()!;
        try {
            const response = await request;
            resolve(response);
        } catch (error) {
            reject(error);
        }

        await new Promise(resolve => setTimeout(resolve, INTERVAL));
    }

    isProcessing = false;
};

const spotifyRequest = (request: NewRequest): Promise<any> => {
    return new Promise((resolve, reject) => {
        gotQueue.push({ request, resolve, reject });
        processQueue();
    });
};