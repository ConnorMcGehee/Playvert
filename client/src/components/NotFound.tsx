import { faFaceFrownOpen } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

function NotFound() {
    return (
        <p><FontAwesomeIcon icon={faFaceFrownOpen} style={{ fontSize: "1.5rem" }} /><br /><br />
            The page you're looking for doesn't exist.</p>
    )
}

export default NotFound;