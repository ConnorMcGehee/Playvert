import { Link } from "react-router-dom";
import "../css/Footer.css";

function Footer() {
    return (
        <footer>
            <p>Created by Connor McGehee</p>
            <Link to="/about">About</Link>
            <Link to="/feedback">Feedback / Report a Problem</Link>
        </footer>
    )
}

export default Footer;