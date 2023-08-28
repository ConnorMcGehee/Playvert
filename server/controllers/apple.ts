import { Request, Response } from "express";
import got from "got";
import { generateRandomString } from "../../server.ts";

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
    }
}

const APPLE_DEV_TOKEN = process.env.APPLE_DEV_TOKEN;
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || "";
const APPLE_CLIENT_SECRET = process.env.APPLE_CLIENT_SECRET;
const redirectUri = "https://playvert/com/api/apple/callback"

export const getDevToken = (req: Request, res: Response) => {
    return res.send(APPLE_DEV_TOKEN);
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
    let tracks: Track[] = [];
    try {

        let term = encodeURI(`${title}+${artist}`.replaceAll(" ", "+"));

        const response: AppleAPIResponse = await got(`https://api.music.apple.com/v1/catalog/us/search?types=songs&term=${term}&with=topResults`, options).json();
        tracks = response.results.songs.data;

        tracks.forEach((track, index) => {
            const trackIsrc = track.attributes.isrc;
            if (trackIsrc === isrc) {
                tracks.splice(index, 1);
                tracks.unshift(track);
                return;
            }
        });

        if (!tracks.length) {
            const isrcResponse: AppleAPIResponse = await got(`https://api.music.apple.com/v1/catalog/us/songs?filter[isrc]=${isrc}`, options).json();
            tracks = [...isrcResponse.data]
        }

        if (!tracks.length) {
            console.log("No track found:", term);
        }
        else {
            //  console.log("Track found!", `${term}\n  ${tracks[0].attributes.name}`);
        }

        //console.log(tracks.length)
        return res.json(tracks);
    }
    catch (error) {
        return res.send(error);
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
        const response = await got.post("https://api.music.apple.com/v1/me/library/playlists", {
            headers: {
                Authorization: `Bearer ${APPLE_DEV_TOKEN}`,
                "Music-User-Token": musicUserToken,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });
        return res.status(response.statusCode).send(response.body);
    }
    catch (error) {
        console.error("error:", error)
        return res.status(400).send(error);
    }
}