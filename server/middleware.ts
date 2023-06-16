import { Request, Response, NextFunction } from 'express';
import got, { HTTPError } from 'got';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

interface SpotifyTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    scope: string;
}

export async function spotifyRefreshToken(req: Request, res: Response, next: NextFunction) {
    const now = new Date().getTime();

    if (!req.session.spotify_refresh_token) {
        next();
        return;
    }

    // Check if the access token is expired or about to expire (add some buffer time, e.g., 60 seconds)
    if (req.session.spotify_token_expiration_time - now < 60 * 1000 || (!req.session.spotify_access_token && req.session.spotify_refresh_token)) {
        const options = {
            form: {
                grant_type: "refresh_token",
                refresh_token: req.session.spotify_refresh_token,
            },
            headers: {
                Authorization: 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
            }
        }

        try {
            const data: SpotifyTokenResponse = await got.post("https://accounts.spotify.com/api/token", options).json()
            req.session.spotify_access_token = data.access_token;
            req.session.spotify_token_expiration_time = now + data.expires_in * 1000;
            next();
        }
        catch (error) {
            if (error instanceof HTTPError) {
                console.error('Error refreshing token:', error.response.body);
                if (!error.response.body) {
                    next();
                    return res.send("Unknown error");
                }
                if (JSON.parse(error.response.body.toString()).error_description.includes("refresh_token must be suppled")) {
                    next();
                    return res.status(401).send("Not authenticated");
                }
            } else {
                console.error('Error refreshing token:', error);
            }
            next();
            return;
        }
    } else {
        next();
    }
}