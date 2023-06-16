import { Link } from "react-router-dom";
import "../css/Nav.css"
import logo from "../assets/logo.png";

interface NavProps {
    isLoggedIn: boolean
}

function Nav({ isLoggedIn }: NavProps) {

    return (
        <div id="nav-container">
            <nav id="nav">
                <Link id="logo" to="/"><img src={logo} alt="Logo" /><span>Playvert<sup>alpha</sup></span></Link>
                {/* <ul id="nav-list">
                    {isLoggedIn ? <li><Link to="/account">Account</Link></li>
                        : null}
                    <li>{isLoggedIn ?
                        <a href="/auth/logout">Logout</a> :
                        <a href="/auth/login">Login</a>}
                    </li>
                </ul> */}
            </nav>
        </div>
    )
}

export default Nav;