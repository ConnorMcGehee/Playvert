import express from 'express';
import path from "path";
import url from "url";
import fs from "fs"
import dotenv from "dotenv"
import RedisStore from "connect-redis"
import session from "express-session"
import { createClient } from "redis"
import { auth } from 'express-openid-connect';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import cors from "cors";
import puppeteer from 'puppeteer';
import { CancelableRequest, Response as GotResponse } from 'got';

console.log("Starting up...")

dotenv.config();

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const isProductionEnv = process.env.ENVIRONMENT === "prod";
export const baseUrl = isProductionEnv ? "https://playvert.com" : "http://localhost:8888";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_KEY!,
  },
});

console.log("Creating DynamoDB client...");

export const dynamoDB = DynamoDBDocumentClient.from(client);

export enum Platform {
  Spotify,
  Apple,
  Deezer
}

export type NewRequest = CancelableRequest<Buffer | GotResponse<any>>;

export const generateRandomString = function (length = 16) {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

console.log("Creating Express app...");

const app = express();

app.use(cors());

const PORT = process.env.PORT;

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_CLIENT_SECRET,
  baseURL: baseUrl,
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: 'https://dev-dbwj0lxpkx6op0g6.us.auth0.com',
  routes: {
    login: '/auth/login',
    logout: '/auth/logout',
    callback: '/auth/callback',
  },
};

console.log("Setting up Auth0...");

app.use(auth(config));

console.log("Setting up Puppeteer...");

let browser: puppeteer.Browser | null = null;
const TIMEOUT_MS = 3600000;  // 1 hour in milliseconds

export const getBrowserInstance = async () => {
  if (browser && browser.connected) {
    return browser;
  }

  if (browser) {
    await browser.close();
  }

  browser = await puppeteer.launch({
    headless: "new",
    args: isProductionEnv ? [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ] : undefined,
  });

  console.log("Puppeteer browser launched.");

  setTimeout(async () => {
    if (browser) {
      await browser.close();
      browser = null;
    }
  }, TIMEOUT_MS);

  return browser;
};

await getBrowserInstance();

console.log("Connecting to Redis...");

const redisClient = createClient({
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: 'redis-13380.c124.us-central1-1.gce.cloud.redislabs.com',
    port: 13380
  },
});

await redisClient.connect()
  .then(() => {
    console.log('Connected to Redis successfully.');
    // Initialize store.
    const redisStore = new RedisStore({
      client: redisClient,
      prefix: "playlist:"
    });
    // Initialize session storage.
    app.use(
      session({
        store: redisStore,
        resave: false, // required: force lightweight session keep alive (touch)
        saveUninitialized: false, // recommended: only save session when data exists
        secret: process.env.SESSION_SECRET!,
        cookie: {
          httpOnly: true,
          maxAge: 14 * 24 * 60 * 60 * 1000,
          sameSite: "none",
          secure: isProductionEnv
        }
      })
    );
  })
  .catch((error) => {

    console.error(`Redis connection error: "${error}"`);
  });

declare module 'express-session' {
  export interface Session {
    spotify_access_token?: string;
    spotify_refresh_token: string;
    spotify_token_expiration_time: number;
    redirect?: string;
    state?: string;
  }
}

app.set('trust proxy', 1)

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, './client/dist')));

app.use(express.urlencoded({ extended: false }));

console.log("Importing routes...")

const routeFiles = fs.readdirSync(path.join(__dirname, '/server/routes'));
// Note the use of Promise.all to wait for all dynamic imports
Promise.all(routeFiles.map(async (file) => {
  if (file.startsWith(".DS_Store")) {
    return Promise.resolve(); // resolve immediately for non-route files
  }
  const routerModule = await import(`./server/routes/${file}`);
  const { path, router } = routerModule;
  if (typeof router === 'function') {
    app.use(path, router);
  } else {
    console.warn(`The 'router' export in ${file} is not a middleware function.`);
  }
})).then(() => {
  // Define the catch-all route handler here, after all routes have been loaded
  app.get('*', function (_req, res) {
    res.sendFile(path.join(__dirname, './client/dist/index.html'), function (err) {
      if (err) {
        res.status(500).send(err)
      }
    })
  });

  app.listen(PORT, () => {
    if (isProductionEnv) {
      console.log(`HTTP Server up.`);
    }
    else {
      console.log(`HTTP Server up. Now go to http://localhost:${PORT}/ in your browser.`);
    }
  });
});