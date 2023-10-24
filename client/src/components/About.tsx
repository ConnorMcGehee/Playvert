import { Link } from "react-router-dom";

function About() {
    return (
        <>
            <h1>About</h1>
            <p>
                Hey! Playvert is a web app designed to make it easier to share music with your friends.
                Currently it supports conversions of playlists between Spotify and Apple Music. I'm hoping to add support
                for more platforms in the future, as well as converting individual songs, as well as a more
                comprehensive playlist editor.
                It's still in beta, so you may encounter some bugs. If you have any issues,
                or if you have any comments, please <Link to="/feedback">let me know</Link>!
            </p>
            <p>
                love u!<br />
                -connor
            </p>
        </>
    )
}

export default About;