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
        linkUuid,
        playlist,
        ttl
    };

    // Define the parameters for the Put operation
    const params = {
        TableName: "PlaylistLinks",
        Item: item
    };
    // Write the item to the DynamoDB table
    await dynamoDB.send(new PutCommand(params))
        .catch(error => console.log("PutError:", error));

    return res.status(201).json(item);
}

export const getPlaylist = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const params = {
            TableName: "PlaylistLinks",
            Key: {
                linkUuid: id
            }
        };
        const response = await dynamoDB.send(new GetCommand(params));
        return res.status(200).json(response.Item);
    }
    catch (error) {
        console.error("Error getting item from DynamoDB:", error)
    }
}