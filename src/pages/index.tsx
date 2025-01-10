import Webcam from "react-webcam";
import { throttle } from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";
import JSON5 from "json5";

// Define the type for the OpenAI response
interface OpenAIResponse {
    choices: {
        message: {
            content: string;
        };
    }[];
}

export const speak = throttle((word: string) => {
    if (typeof speechSynthesis === "undefined") {
        console.warn("speaking not supported", word);
        return;
    }
    const speech = new SpeechSynthesisUtterance();
    speech.text = word;
    speech.lang = "en-US";
    speech.rate = 0.9;
    speechSynthesis.speak(speech);
}, 500);

export default function Home() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [response, setResponse] = useState<{
        denomination: "0.01" | "0.05" | "0.10" | "0.25" | "1" | "5" | "10" | "20" | "50" | "100" | null;
        confidence: number;
    } | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // const [base64Image, setBase64Image] = useState<string | null>(null);

    const webcamRef = useRef<any>(null);

    const handleSubmit = async (base64Image: string | null) => {
        setLoading(true);
        setError(null);

        console.log({ base64Image });

        if (!base64Image) {
            console.error("no image");
            setError("Please select an image.");
            return;
        }

        try {
            // Prepare the payload for the OpenAI API request
            const payload = {
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `You are given an image of US dollars or US coins. Please describe which denomination the image represents. If the image does not contain any US dollars, please respond with null.

Respond with JSON only. Do not return markdown.

interface AnalysisResponse {
    denomination: "0.01" | "0.05" | "0.10" | "0.25" | "1" | "5" | "10" | "20" | "50" | "100" | null;
    confidence: number;
}

Return a valid AnalysisResponse JSON object.`
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: base64Image
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 300
            };

            const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

            const response = await fetch(
                "https://api.openai.com/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(payload)
                }
            );

            if (!response.ok) {
                throw new Error("Failed to fetch the OpenAI API");
            }

            const data: OpenAIResponse = await response.json();
            const responseJSON = JSON5.parse(data.choices[0].message.content);
            setResponse(responseJSON);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const capture = useCallback(() => {
        speak("Capturing image");
        handleSubmit(webcamRef.current?.getScreenshot() || null);
    }, [webcamRef]);

    useEffect(() => {
        if (!response) return;
        let announcement = "No money detected.";
        if (response?.denomination) {
            announcement = `${response.denomination} dollars`;
        }

        speak(announcement);

        const timeout = setTimeout(() => {
            setResponse(null);
        }, 10_000);

        return () => {
            clearTimeout(timeout);
        };
    }, [response]);

    return (
        <div
            style={{
                width: "100vw",
                height: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
            }}
            onClick={() => {
                capture();
            }}
        >
            {loading && !error && <div className="scan-line" />}
            <div
                style={{
                    position: "absolute",
                    width: "100vw",
                    height: "100vh",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: 100,
                    textAlign: "center"
                }}
            >
                {response &&
                    !!response.denomination &&
                    "$" + response.denomination}

                {response && !response.denomination && "No money detected"}
            </div>
            <Webcam
                style={{
                    opacity: 0.5
                }}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                    facingMode: "environment"
                }}
                width="100%"
                height="100%"
            />
        </div>
    );
}
