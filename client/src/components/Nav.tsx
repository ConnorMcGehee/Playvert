import { Link } from "react-router-dom";
import "../css/Nav.css"
import logo from "../assets/logo.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";

// interface NavProps {
//     isLoggedIn: boolean
// }

// function Nav({ isLoggedIn }: NavProps) {
function Nav() {

    return (
        <div id="nav-container">
            <nav id="nav">
                <Link id="logo" to="/"><img src={logo} alt="Logo" /><span>Playvert<sup>beta</sup></span></Link>
                <ul id="nav-list">
                    <li><Link id="account-icon" to="/account"><FontAwesomeIcon className="small-icon" icon={faUser} /></Link></li>
                </ul>
            </nav>
        </div>
    )
}

export default Nav;