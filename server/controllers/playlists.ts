import { Request, Response } from "express";
import short from "short-uuid"
import { dynamoDB } from "../../server.ts"
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

enum Platform {
    Spotify,
    Apple,
    Deezer
}

interface Track {
    id: string,
    isrc: string,
    title: string,
    artists: string[],
    coverArtUrl: string,
    linkToSong: string
}

class Playlist {
    platform!: Platform;
    playlistUrl!: string;
    title!: string;
    imageUrl!: string
    tracks!: Track[];
    constructor(platform: Platform, playlistUrl: string, title: string, imageUrl: string, tracks: Track[]) {
        this.platform = platform;
        this.playlistUrl = playlistUrl;
        this.title = title;
        this.imageUrl = imageUrl;
        this.tracks = tracks;
    }
}

export const generateUrl = async (req: Request, res: Response) => {

    const playlist: Playlist = req.body.playlist;

    const linkUuid = short.generate();

    // Define the item to be written to the DynamoDB table
    const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // Current time in seconds + 24 hours
    const item = {
        linkUuid: {
            S: linkUuid.toString()
        },
        playlist: {
            S: JSON.stringify(playlist)
        },
        ttl: {
            N: ttl.toString()
        }
    };

    const params = {
        TableName: 'PlaylistLinks',
        Item: {
            linkUuid: linkUuid,
            playlist: playlist,
            ttl: ttl
        }
    };

    await dynamoDB.send(new PutCommand(params));
    return res.status(200).json({ linkUuid: linkUuid });
}

export const getPlaylist = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;

        const params = {
            TableName: "PlaylistLinks",
            Key: { linkUuid: id }
        };

        dynamoDB.send(new GetCommand(params)).then((data) => {
            if (data.Item) {
                const playlist = data.Item;
                return res.status(200).json(playlist);
            }
            else {
                return res.status(404).json({ message: "Playlist not found" });
            }
        });

    }
    catch (error) {
        console.error("Error getting item from DynamoDB:", error)
    }
}