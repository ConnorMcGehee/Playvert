import { FormEvent, useCallback, useState } from "react";
import "../css/Feedback.css"
import { GoogleReCaptcha } from 'react-google-recaptcha-v3';
import ky from "ky";
import { Link } from "react-router-dom";

function Feedback() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [isSubmitted, setSubmittedStatus] = useState(false);
    const [sendFailed, setSendFailed] = useState(false);
    const [token, setToken] = useState("");
    const [refreshReCaptcha, setRefreshReCaptcha] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const onVerify = useCallback((token: string) => {
        setToken(token);
    }, []);

    const handleInput = (e: FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        switch (e.currentTarget.name) {
            case "name":
                setName(e.currentTarget.value);
                break;
            case "email":
                setEmail(e.currentTarget.value);
                break;
            case "feedback":
                setMessage(e.currentTarget.value);
                break;
        }
    }

    const onSubmitWithReCAPTCHA = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        if (!token) {
            console.error("The reCAPTCHA token was not found.");
            setRefreshReCaptcha(r => !r);
            setIsLoading(false);
            return;
        }

        const formData = {
            name,
            email,
            message
        };

        const response = await ky.post("/api/recaptcha/assessment", {
            json: {
                token,
                formData
            }
        }).catch((error) => {
            return error.response;
        });

        if (!response) {
            setSendFailed(true);
            setRefreshReCaptcha(r => !r);
            setIsLoading(false);
            return;
        }

        if (response.ok) {
            setSubmittedStatus(true);
        } else {
            setSendFailed(true);
        }
        setRefreshReCaptcha(r => !r);
        setIsLoading(false);
    }

    // return (
    //     <>
    //         <h1>Feedback Submission Coming Soon!</h1>
    //         <Link to="/">Return Home</Link>
    //     </>
    // )

    return (
        <>
            <h1>Feedback / Report a Problem</h1>
            {sendFailed ?
                <>
                    <p>There was an error sending your feedback. Please try again later.</p>
                    <Link to="/">Return Home</Link>
                </> : <>
                    {
                        isSubmitted ?
                            <>
                                <p>Your feedback has been sent!</p>
                                <Link to="/">Return Home</Link>
                            </>
                            : <form id="feedback-form" onSubmit={onSubmitWithReCAPTCHA}>
                                <p id="required-info"><span className="asterisk">*</span> indicates required field</p>
                                <label><p>Name<span className="asterisk">*</span></p>
                                    <input type="text" name="name" id="name" value={name} onChange={handleInput} required />
                                </label>
                                <label><p>Email<span className="asterisk">*</span></p>
                                    <input type="email" name="email" id="email" value={email} onChange={handleInput} required />
                                </label>
                                <label><p>Message<span className="asterisk">*</span></p>
                                    <textarea name="feedback" id="feedback" cols={30} rows={10} value={message} onChange={handleInput} required></textarea>
                                </label>
                                <GoogleReCaptcha
                                    onVerify={onVerify}
                                    refreshReCaptcha={refreshReCaptcha}
                                />
                                {isLoading ? <progress /> :
                                    <button type="submit">Submit</button>}
                                <p id="recaptcha-disclaimer">
                                    This site is protected by reCAPTCHA and the Google
                                    <a href="https://policies.google.com/privacy"> Privacy Policy</a> and
                                    <a href="https://policies.google.com/terms"> Terms of Service</a> apply.
                                </p>
                            </form>
                    }
                </>
            }
        </>
    )
}

export default Feedback;