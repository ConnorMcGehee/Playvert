import { Request, Response } from "express";
import got from "got";
import { NewRequest, generateRandomString } from "../../server.ts";

interface Track {
    attributes: {
        isrc: string,
        name: string
    }
}

interface AppleAPIResponse {
    data: Track[],
    results: {
        songs: {
            data: Track[]
        }
    },
    next: string
}

const APPLE_DEV_TOKEN = process.env.APPLE_DEV_TOKEN;
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || "";
const APPLE_CLIENT_SECRET = process.env.APPLE_CLIENT_SECRET;
const redirectUri = "https://playvert/com/api/apple/callback"

export const getDevToken = (req: Request, res: Response) => {
    return APPLE_DEV_TOKEN ? res.status(200).send(APPLE_DEV_TOKEN) : res.status(500).send("No Apple Dev Token found");
}

export const login = (req: Request, res: Response) => {
    try {
        const appleAuthUrl = new URL('https://appleid.apple.com/auth/authorize');

        const state = generateRandomString();
        req.session.state = state;

        appleAuthUrl.searchParams.append('response_type', 'code');
        appleAuthUrl.searchParams.append('client_id', APPLE_CLIENT_ID);
        appleAuthUrl.searchParams.append('redirect_uri', redirectUri);
        appleAuthUrl.searchParams.append('state', state);

        // Redirect the user to Apple's authorization page
        return res.redirect(appleAuthUrl.toString());
    }
    catch (error) {
        console.error(error);
        return res.status(500).send(error);
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

        const data = await appleRequest(got.post(tokenEndpoint, {
            form: form
        }).json());

        return res.json(data);
    }
    catch (error) {
        console.error(error);
        return res.status(500).send(error);
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
        const data: AppleAPIResponse = await appleRequest(got(`https://api.music.apple.com/v1/catalog/us/playlists/${playlistId}`, options).json());
        return res.json(data);
    } catch (error) {
        console.error(error);
        return res.status(500).send(error);
    }
}


export const getPlaylistTracks = async (req: Request, res: Response) => {
    const playlistId = req.params.id;
    const options = {
        headers: {
            Authorization: `Bearer ${APPLE_DEV_TOKEN}`
        }
    };

    try {
        let allTracks = [];
        let urlSuffix = `/v1/catalog/us/playlists/${playlistId}/tracks?offset=0`;

        while (urlSuffix) {
            const data: AppleAPIResponse = await appleRequest(got(`https://api.music.apple.com${urlSuffix}&include=artists&limit=300`, options).json());
            allTracks.push(...data.data);
            urlSuffix = data.next;
        }

        return res.json(allTracks);
    } catch (error) {
        console.error(error);
        return res.status(500).send(error);
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
        const data: AppleAPIResponse = await appleRequest(got(`https://api.music.apple.com/v1/catalog/us/songs/${songId}`, options).json());
        return res.json(data);
    } catch (error) {
        console.error(error);
        return res.status(500).send(error);
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
        const data: AppleAPIResponse = await appleRequest(got(`https://api.music.apple.com/v1/catalog/us/artists/${artistId}`, options).json());
        return res.json(data);
    } catch (error) {
        console.error(error);
        return res.status(500).send(error);
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
    try {
        const term = encodeURIComponent(`${title} ${artist}`
            .replace(/[^a-zA-Z0-9 ]/g, ''))
            .replace(/%20/g, '+');

        const response: AppleAPIResponse = await appleRequest(got(`https://api.music.apple.com/v1/catalog/us/search?types=songs&term=${term}&with=topResults`, options).json());
        let searchTracks = response.results.songs?.data ?? [];

        let matchingTrack = searchTracks?.find(track => track.attributes.isrc === isrc);

        if (!matchingTrack) {
            const isrcResponse: AppleAPIResponse = await appleRequest(got(`https://api.music.apple.com/v1/catalog/us/songs?filter[isrc]=${isrc}`, options).json());
            matchingTrack = isrcResponse.data[0] ?? searchTracks[0];
        }

        return matchingTrack ? res.json(matchingTrack) : res.status(404).json({ message: "No matching track found" });
    }
    catch (error) {
        console.error(error);
        return res.status(500).send(error);
    }
}

export const savePlaylist = async (req: Request, res: Response) => {
    try {
        const musicUserToken = req.body.musicUserToken;
        const body = {
            attributes: {
                name: req.body.playlistName
            },
            relationships: {
                tracks: {
                    data: req.body.tracks
                }
            }
        }
        const response = await appleRequest(got.post("https://api.music.apple.com/v1/me/library/playlists", {
            headers: {
                Authorization: `Bearer ${APPLE_DEV_TOKEN}`,
                "Music-User-Token": musicUserToken,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        }));
        return res.status(response.statusCode).send(response.body);
    } catch (error) {
        if (error && (error as any).response) {
            console.error((error as any).response.body);
        } else {
            console.error(error);
        }
        return res.status(500).send(error);
    }
}

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

const appleRequest = (request: NewRequest): Promise<any> => {
    return new Promise((resolve, reject) => {
        gotQueue.push({ request, resolve, reject });
        processQueue();
    });
};