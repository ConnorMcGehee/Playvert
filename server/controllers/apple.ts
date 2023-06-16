import { Request, Response } from "express";
import got from "got";

interface AppleAPIResponse {
    data: {}[],
    results: {
        songs: {
            data: {}[]
        }
    }
}

const APPLE_DEV_TOKEN = process.env.APPLE_DEV_TOKEN;

export const getPlaylist = async (req: Request, res: Response) => {
    const options = {
        headers: {
            Authorization: `Bearer ${APPLE_DEV_TOKEN}`
        }
    }
    const playlistId = req.params.id;
    try {
        const data: AppleAPIResponse = await got(`https://api.music.apple.com/v1/catalog/us/playlists/${playlistId}?include=tracks,artists`, options).json()
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
        const data: AppleAPIResponse = await got(`https://api.music.apple.com/v1/catalog/us/playlists/${playlistId}/tracks`, options).json()
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
