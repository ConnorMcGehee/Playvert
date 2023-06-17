import { Request, Response } from "express";
import { dynamoDB } from "../../server.ts"
import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { GetItemCommand } from "@aws-sdk/client-dynamodb";

export const createUser = async (req: Request, res: Response) => {
    try {
        // Extract user data from the request body
        let userId = "";
        if (req.oidc.isAuthenticated() && req.oidc.user) {
            userId = req.oidc.user.sub;
        }

        if (!userId) {
            return res.send("Error: userId undefined");
        }

        // Define the item to be written to the DynamoDB table
        const item = {
            userId
        };

        // Define the parameters for the Put operation
        const params = {
            TableName: "UserProfiles", // Replace with your DynamoDB table name
            Item: item
        };

        // Write the item to the DynamoDB table
        await dynamoDB.send(new PutCommand(params));

        // Send a success response
        return res.status(201).redirect("/");
    } catch (error) {
        console.error("Error creating user profile:", error);
        return res.status(500).json({ message: "Error creating user profile." });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        let userId = "";
        if (req.oidc.isAuthenticated() && req.oidc.user) {
            userId = req.oidc.user.sub;
        }

        if (!userId) {
            return res.send("userId undefined");
        }

        const params = {
            TableName: "UserProfiles", // Replace with your DynamoDB table name
            Key: {
                userId: { S: userId },
            },
            UpdateExpression: "set spotifyRefreshToken = :spotifyRefreshToken",
            ExpressionAttributeValues: {
                ":spotifyRefreshToken": { S: req.session.spotify_refresh_token },
            },
            ReturnValues: "UPDATED_NEW",
        };

        await dynamoDB.send(new UpdateItemCommand(params));

        return res.status(200).redirect("/");
    } catch (error) {
        console.error("Error updating user profile:", error);
        return res.status(500).json({ message: "Error updating user profile." });
    }
};

export const spotifyConnected = async (req: Request, res: Response) => {
    try {
        let userId = "";
        if (req.oidc.isAuthenticated() && req.oidc.user) {
            userId = req.oidc.user.sub;
        }

        if (!userId) {
            return res.status(401).json({ message: "No user found" });
        }

        const params = {
            TableName: "UserProfiles", // Replace with your DynamoDB table name
            Key: {
                userId: { S: userId },
            },
        };

        const { Item } = await dynamoDB.send(new GetItemCommand(params));

        if (Item) {
            const isConnected = !!Item.spotifyRefreshToken.S;
            if (isConnected && Item.spotifyRefreshToken.S) {
                req.session.spotify_refresh_token = Item.spotifyRefreshToken.S;
            }
            res.status(200).json({ isConnected: isConnected });
        } else {
            return res.redirect("/auth/update-user");
        }
    } catch (error) {
        console.error("Error getting user profile:", error);
        return res.status(500).json({ message: "Error getting user profile." });
    }
};


export const authorize = (_req: Request, res: Response) => {
    return res.send("Successfully authorized")
}

export const getLoginStatus = (req: Request, res: Response) => {
    return res.json(req.oidc.isAuthenticated());
}

export const logout = (req: Request, res: Response) => {
    req.session.destroy(() => {
        return res.redirect("/");
    });
}