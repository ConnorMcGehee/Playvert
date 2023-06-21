import { Request, Response } from "express";
import got from "got";
import { generateRandomString } from "../../server.ts";
import { json } from "stream/consumers";

interface AppleAPIResponse {
    data: {}[],
    results: {
        songs: {
            data: {}[]
        }
    }
}

const APPLE_DEV_TOKEN = process.env.APPLE_DEV_TOKEN;
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || "";
const APPLE_CLIENT_SECRET = process.env.APPLE_CLIENT_SECRET;
const redirectUri = "https://playvert/com/api/apple/callback`;"

export const login = (req: Request, res: Response) => {
    try {
        const appleAuthUrl = new URL('https://appleid.apple.com/auth/authorize');

        const state = generateRandomString();
        req.session.state = state;

        appleAuthUrl.searchParams.append('response_type', 'code');
        appleAuthUrl.searchParams.append('client_id', APPLE_CLIENT_ID);
        appleAuthUrl.searchParams.append('redirect_uri', redirectUri);
        appleAuthUrl.searchParams.append('state', state);


        console.log(appleAuthUrl.toString());

        // Redirect the user to Apple's authorization page
        return res.redirect(appleAuthUrl.toString());
    }
    catch (error) {
        console.error(error);
        return res.send(error);
    }
}

export const authorize = async (req: Request, res: Response) => {
    try {
        const authorizationCode = req.query.code;

        const tokenEndpoint = 'https://appleid.apple.com/auth/token';

        const form = {
            client_id: APPLE_CLIENT_ID,
            client_secret: APPLE_CLIENT_SECRET,
            code: authorizationCode,
            grant_type: 'authorization_code',
        };

        const data = await got.post(tokenEndpoint, {
            form: form
        }).json();

        return res.json(data);
    }
    catch (error) {
        console.error(error);
        return res.send(error);
    }
}

export const getPlaylist = async (req: Request, res: Response) => {
    const options = {
        headers: {
            Authorization: `Bearer ${APPLE_DEV_TOKEN}`
        }
    }
    const playlistId = req.params.id;
    try {
        const data: AppleAPIResponse = await got(`https://api.music.apple.com/v1/catalog/us/playlists/${playlistId}`, options).json()
        return res.json(data);
    } catch (error) {
        return res.send(error);
    }
}


export const getPlaylistTracks = async (req: Request, res: Response) => {
    const options = {
        headers: {
            Authorization: `Bearer ${APPLE_DEV_TOKEN}`
        }
    }
    const playlistId = req.params.id;
    try {
        const data: AppleAPIResponse = await got(`https://api.music.apple.com/v1/catalog/us/playlists/${playlistId}/tracks?include=artists`, options).json()
        return res.json(data);
    } catch (error) {
        return res.send(error);
    }
}

export const getTrack = async (req: Request, res: Response) => {
    const options = {
        headers: {
            Authorization: `Bearer ${APPLE_DEV_TOKEN}`
        }
    }
    const songId = req.params.id;
    try {
        const data: AppleAPIResponse = await got(`https://api.music.apple.com/v1/catalog/us/songs/${songId}`, options).json()
        return res.json(data);
    } catch (error) {
        return res.send(error);
    }
}

export const getArtist = async (req: Request, res: Response) => {
    const options = {
        headers: {
            Authorization: `Bearer ${APPLE_DEV_TOKEN}`
        }
    }
    const artistId = req.params.id;
    try {
        const data: AppleAPIResponse = await got(`https://api.music.apple.com/v1/catalog/us/artists/${artistId}`, options).json()
        return res.json(data);
    } catch (error) {
        return res.send(error);
    }
}

export const search = async (req: Request, res: Response) => {
    const options = {
        headers: {
            Authorization: `Bearer ${APPLE_DEV_TOKEN}`
        }
    }
    const isrc = req.query.isrc || "";
    const title = req.query.title || "";
    const artist = req.query.artist || "";
    let tracks: {}[] = [];
    try {
        if (isrc) {
            const isrcResponse: AppleAPIResponse = await got(`https://api.music.apple.com/v1/catalog/us/songs?filter[isrc]=${isrc}`, options).json()
            tracks = [...isrcResponse.data];
        }
        let terms = title;
        if (title && artist) {
            terms = `${title}+${artist}`;
        }
        else if (artist) {
            terms = artist;
        }
        if (terms && typeof terms === "string") {
            const searchParams = new URLSearchParams({
                types: "songs",
                term: terms
            })
            const trackResponse: AppleAPIResponse = await got(`https://api.music.apple.com/v1/catalog/us/search?${searchParams}`, options).json()
            tracks = [...tracks, ...trackResponse.results.songs.data];
        }
        return res.json(tracks);
    }
    catch (error) {
        return res.send(error);
    }
}
