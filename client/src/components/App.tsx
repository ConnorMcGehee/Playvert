import Nav from "./Nav";
import Dashboard from './Dashboard';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NotFound from "./NotFound";
import ShareablePlaylist from "./ShareablePlaylist";
import Convert from "./Convert";
import Account from "./Account";
import Footer from "./Footer";
import About from "./About";
import Feedback from "./Feedback";
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

export enum Platform {
  Spotify,
  Apple,
  Deezer
};

export interface Track {
  id: string;
  isrc: string;
  title: string;
  artists: string[];
  coverArtUrl: string;
  linkToSong: string;
};

export interface SpotifyTrack extends Track {
  uri: string;
};

export interface AppleTrack extends Track {
  type: string;
};

export interface PlayvertAPIResponse {
  playlist: Playlist;
  linkUuid: string;
};

export class Playlist {
  platform?: Platform;
  playlistUrl?: string;
  title?: string;
  imageUrl?: string
  tracks: Track[] = [];
  constructor(platform?: Platform, title?: string, imageUrl?: string, tracks: Track[] = []) {
    this.platform = platform;
    this.title = title;
    this.imageUrl = imageUrl;
    this.tracks = tracks;
  }
};

function App() {
  return (
    <GoogleReCaptchaProvider reCaptchaKey="6Legsr8oAAAAAMs_u_eMuKQ6QToHd2C08eP6qIUh">
      <BrowserRouter>
        <Nav />
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/index.html" element={<Dashboard />} />

            <Route path="/account" element={<Account />} />

            <Route path="/convert/:url" element={<Convert />} />

            <Route path="/playlists/:id" element={<ShareablePlaylist />} />

            <Route path="/about" element={<About />} />

            <Route path="/feedback" element={<Feedback />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </GoogleReCaptchaProvider>
  )
};

export default App;