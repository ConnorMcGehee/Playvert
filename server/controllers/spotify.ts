import got from "got";
import { Request, Response } from "express";
import { Platform, baseUrl } from "../../server.ts";

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
    id: string
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

const generateRandomString = function (length = 16) {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

const STATE = generateRandomString();

export const login = (req: Request, res: Response) => {

    let { uuid } = req.params;

    const params = new URLSearchParams({
        response_type: "code",
        client_id: SPOTIFY_CLIENT_ID,
        scope: SCOPE,
        redirect_uri: REDIRECT_URI,
        state: STATE,
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
        return res.json({ isLoggedIn });
    }
    catch (error) {
        console.error(error);
        return res.send(error);
    }
}

export const authorize = async (req: Request, res: Response) => {
    const error = req.query.error;
    const code = req.query.code?.toString();
    if (!code) {
        return res.send("Error: " + error);
    }
    const returnState = req.query.state;

    if (returnState !== STATE) {
        return res.send("Mismatched state");
    }

    if (error) {
        return res.send(`Callback Error: ${error}`);
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
        const data: SpotifyTokenResponse = await got.post("https://accounts.spotify.com/api/token", options).json();

        const access_token = data['access_token'];
        const refresh_token = data['refresh_token']!;
        const expires_in = data['expires_in'];

        req.session.spotify_access_token = access_token;
        req.session.spotify_refresh_token = refresh_token;
        req.session.spotify_token_expiration_time = new Date().getTime() + expires_in * 1000;

        if (req.session.redirect) {
            let uuid = req.session.redirect;
            delete req.session.redirect;
            return res.redirect(`/#/playlists/${uuid}/save/${Platform.Spotify}`);
        }
        return res.redirect("/");
    }
    catch (error) {
        console.error(error);
        return res.send(error);
    }
}

export const getUserPlaylists = async (req: Request, res: Response) => {
    const options = {
        headers: {
            Authorization: `Bearer ${req.session.spotify_access_token}`
        }
    }
    try {
        const data: SpotifyAPIResponse = await got("https://api.spotify.com/v1/me/playlists", options).json();
        return res.json(data.items);
    }
    catch (error) {
        console.log(error);
        return res.send(error);
    }
}

export const getPlaylist = async (req: Request, res: Response) => {
    let token = req.session.spotify_access_token;

    console.log("token:", token)

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

        const body: { access_token: string } = await got.post("https://accounts.spotify.com/api/token", authOptions).json();

        token = body.access_token;
        console.log("new token:", token)
    }

    const options = {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
    try {
        const data: SpotifyAPIResponse = await got(`https://api.spotify.com/v1/playlists/${req.params.id}`, options).json();
        return res.json(data);
    }
    catch (error) {
        console.error(error);
        return res.send(error);
    }
}

export const getPlaylistSongs = async (req: Request, res: Response) => {

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

        const body: { access_token: string } = await got.post("https://accounts.spotify.com/api/token", authOptions).json();
        token = body.access_token;
    }

    const options = {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }
    try {
        const data: SpotifyAPIResponse = await got(`https://api.spotify.com/v1/playlists/${req.params.id}/tracks`, options).json()
        return res.json(data.items);
    }
    catch (error) {
        console.error(error);
        return res.send(error);
    }
}

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
        const isrcResponse: SpotifyAPIResponse = await got(`https://api.spotify.com/v1/search?${isrcSearchParams}`, options).json();
        tracks = [...isrcResponse.tracks.items];
        const trackSearchParams = new URLSearchParams({
            q: title + artist,
            type: "track"
        });
        const trackResponse: SpotifyAPIResponse = await got(`https://api.spotify.com/v1/search?${trackSearchParams}`, options).json();
        tracks = [...tracks, ...trackResponse.tracks.items];
        return res.json(tracks);
    }
    catch (error) {
        console.log("spotify search error:", error);
        return res.send(error);
    }
}

export const savePlaylist = async (req: Request, res: Response) => {
    try {
        const playlistName = req.body.playlistName;
        const songUris: string[] = req.body.uris;
        const imageUrl = req.body.imageUrl;
        let imageData = "";
        const buffer = await got(imageUrl).buffer();
        imageData = buffer.toString("base64");
        const userData: SpotifyAPIResponse = await got("https://api.spotify.com/v1/me", {
            headers: {
                Authorization: `Bearer ${req.session.spotify_access_token}`
            }
        }).json();
        const userId = userData.id;
        const playlistBodyData = {
            name: playlistName
        }
        const playlistData: SpotifyAPIResponse = await got.post(`https://api.spotify.com/v1/users/${userId}/playlists`, {
            headers: {
                Authorization: `Bearer ${req.session.spotify_access_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(playlistBodyData)
        }).json();
        const playlistId = playlistData.id;
        let imageSizeKB = Buffer.byteLength(imageData, 'base64') / 1024;
        if (imageSizeKB < 256) {
            await got.put(`https://api.spotify.com/v1/playlists/${playlistId}/images`, {
                headers: {
                    Authorization: `Bearer ${req.session.spotify_access_token}`,
                    "Content-Type": "image/jpeg"
                },
                body: imageData
            });
        }
        songUris.slice(0, 99);
        const tracksBodyData = {
            uris: songUris
        }
        const response = await got.post(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            headers: {
                Authorization: `Bearer ${req.session.spotify_access_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(tracksBodyData)
        });
        return res.status(response.statusCode).send(response.body);
    }
    catch (error) {
        return res.status(400).send(error);
    }
}