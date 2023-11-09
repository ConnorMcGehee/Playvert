import { Link } from "react-router-dom";
import "../css/Footer.css";

function Footer() {
    return (
        <footer>
            <Link to="/about">About</Link>
            <Link to="/feedback">Feedback / Report a Problem</Link>
            <a href="https://www.buymeacoffee.com/connormcgehee" target="_blank">🤝 Support Me</a>
        </footer>
    )
}

export default Footer;