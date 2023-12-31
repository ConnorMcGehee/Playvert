import { Request, Response } from 'express';
import { RecaptchaEnterpriseServiceClient } from '@google-cloud/recaptcha-enterprise';
import nodemailer from 'nodemailer';
import { isProductionEnv } from '../../server.ts';

const base64EncodedKey = process.env.GOOGLE_PRIVATE_KEY_BASE64 || "";
const privateKey = Buffer.from(base64EncodedKey, 'base64').toString('utf-8');

const client = new RecaptchaEnterpriseServiceClient({
    credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey
    }
});

const transporter = nodemailer.createTransport({
    host: "smtp.forwardemail.net",
    port: isProductionEnv ? 465 : 587,
    secure: isProductionEnv,
    auth: {
        user: "connor@playvert.com",
        pass: process.env.EMAIL_PASSWORD,
    },
});

export const assessment = async (req: Request, res: Response) => {
    const { formData } = req.body;
    const score = await createAssessment(req.body);
    console.log(score)
    if (score && score > 0.5) {
        try {
            await transporter.sendMail({
                from: 'Playvert <connor@playvert.com>', // sender address
                to: 'connorjames050@gmail.com', // list of receivers
                subject: 'New Playvert Feedback', // Subject line
                html: `
                <p><strong>Name:</strong> ${formData.name}</p>
                <p><strong>Email:</strong> ${formData.email}</p>
                <p><strong>Message:</strong></p>
                <p>${formData.message}</p>
            `,
            });
            return res.status(200).send("Success!");
        } catch (err) {
            console.log(err);
            return res.status(400).send("Error sending email.");
        }
    }
    else {
        return res.status(400).send("Error assessing reCAPTCHA.");
    }
};

async function createAssessment({
    projectID = "playvert-1697988130270",
    recaptchaKey = "6Legsr8oAAAAAMs_u_eMuKQ6QToHd2C08eP6qIUh",
    token = "action-token",
}) {
    const projectPath = client.projectPath(projectID);

    // Build the assessment request.
    const request = ({
        assessment: {
            event: {
                token: token,
                siteKey: recaptchaKey,
            },
        },
        parent: projectPath,
    });

    // client.createAssessment() can return a Promise or take a Callback
    const [response] = await client.createAssessment(request);

    // Check if the token is valid.
    if (!response.tokenProperties?.valid) {
        console.log("The CreateAssessment call failed because the token was: " +
            response.tokenProperties?.invalidReason);

        return null;
    }

    return response.riskAnalysis?.score;
}