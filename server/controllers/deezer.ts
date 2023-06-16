import { Request, Response } from "express";
import got from "got";

interface DeezerAPIResponse {
    data: []
}

export const getRedirectLink = async (req: Request, res: Response) => {
    const url = req.params.url;
    const response = await got(url);
    return res.status(200).send(response.url);
}

export const getPlaylist = async (req: Request, res: Response) => {
    const id = req.params.id;
    const response = await got(`https://api.deezer.com/playlist/${id}?limit=20`).json();
    return res.json(response);
};

export const getTrackInfo = async (req: Request, res: Response) => {
    const id = req.params.id;
    const response = await got(`https://api.deezer.com/track/${id}`).json();
    return res.json(response);
};

export const search = async (req: Request, res: Response) => {
    // Note that Deezer uses the term "track:" for title queries
    const title = req.query.title ? `track:"${req.query.title}" ` : "";
    const artist = req.query.artist ? `artist:"${req.query.artist}" ` : "";
    try {
        const searchParams = new URLSearchParams({
            q: title + artist,
            order: "RANKING"
        })
        const response: DeezerAPIResponse = await got(`https://api.deezer.com/search/track?${searchParams}`).json()
        return res.json(response.data);
    }
    catch (error) {
        return res.send(error);
    }
}