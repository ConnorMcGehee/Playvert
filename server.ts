import express from 'express';
import path from "path";
import url from "url";
import fs from "fs"
import dotenv from "dotenv"
import RedisStore from "connect-redis"
import session from "express-session"
import { createClient } from "redis"
import { auth } from 'express-openid-connect';
import { DynamoDB } from "@aws-sdk/client-dynamodb";

dotenv.config();

const isProductionEnv = process.env.ENVIRONMENT === "prod";
export const baseUrl = isProductionEnv ? "https://playvert.com" : "http://localhost:5173";

export const dynamoDB = new DynamoDB({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_KEY!,
  },
});

export enum Platform {
  Spotify,
  Apple,
  Deezer
}

const app = express();

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

app.use(auth(config));

// Initialize client.
const redisClient = createClient({
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: 'redis-18789.c124.us-central1-1.gce.cloud.redislabs.com',
    port: 18789
  }
});

redisClient.on('connect', () => {
  console.log('Connected to Redis successfully.');
});

redisClient.connect()
  .catch((error) => {
    console.error("Redis connection error:", error)
  });

// Initialize store.
let redisStore = new RedisStore({
  client: redisClient,
  prefix: "playlist:"
})

declare module 'express-session' {
  export interface Session {
    spotify_access_token: string;
    spotify_refresh_token: string;
    spotify_token_expiration_time: number;
    redirect?: string;
  }
}

app.set('trust proxy', 1)

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
      secure: true
    }
  })
);

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, './client/dist')));

app.use(express.urlencoded({ extended: false }));

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
