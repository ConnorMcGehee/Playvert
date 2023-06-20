import Nav from "./Nav"
import Dashboard from './Dashboard'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NotFound from "./NotFound"
//import { useState, useEffect } from "react"
import ShareablePlaylist from "./ShareablePlaylist"
import Convert from "./Convert"

export enum Platform {
  Spotify,
  Apple,
  Deezer
}

export interface Track {
  id: string,
  isrc: string,
  title: string,
  artists: string[],
  coverArtUrl: string,
  linkToSong: string
}

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
}

function App() {
  // const [isLoggedIn, setLoginStatus] = useState(false);
  // async function fetchAuthData() {
  //   await fetch("/auth")
  //     .then(res => res.json())
  //     .then((isLoggedIn: boolean) => {
  //       setLoginStatus(isLoggedIn);
  //     });
  // }
  // useEffect(() => {
  //   fetchAuthData();
  // }, [isLoggedIn])
  return (
    <BrowserRouter>
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/index.html" element={<Dashboard />} />

          <Route path="/convert/:url" element={<Convert />} />

          <Route path="/playlists/:id" element={<ShareablePlaylist />} />
          <Route path="/playlists/:id/save/:platform" element={<ShareablePlaylist />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App
