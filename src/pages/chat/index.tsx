import React, { useState } from "react";
import JSON5 from "json5";

// Define the type for the OpenAI response
interface OpenAIResponse {
    choices: {
        message: {
            content: string;
        };
    }[];
}

const OpenAIImageChat: React.FC = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [response, setResponse] = useState<{
        denomination: "1" | "5" | "10" | "20" | "50" | "100" | null;
        confidence: number;
    } | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Function to encode the image to base64
    const encodeImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result?.toString().split(",")[1]; // Get the base64 part
                if (base64String) {
                    resolve(base64String);
                } else {
                    reject("Failed to encode image");
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleSubmit = async () => {
        if (!selectedFile) {
            setError("Please select an image.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Encode the image
            const base64Image = await encodeImage(selectedFile);

            // Prepare the payload for the OpenAI API request
            const payload = {
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `You are given an image of US dollars. Please describe which denomination the image represents. If the image does not contain any US dollars, please respond with null.

Respond with JSON only. Do not return markdown.

interface AnalysisResponse {
    denomination: "1" | "5" | "10" | "20" | "50" | "100" | null;
    confidence: number;
}

Return a valid AnalysisResponse JSON object.`
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Image}`
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

    return (
        <div>
            <h1>OpenAI Image Analysis</h1>
            <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            <button onClick={handleSubmit} disabled={loading || !selectedFile}>
                {loading ? "Analyzing..." : "Analyze Image"}
            </button>

            {error && <p style={{ color: "red" }}>Error: {error}</p>}
            {!!response && <p>{JSON.stringify(response)}</p>}
            <p>Denomination: {response?.denomination}</p>
        </div>
    );
};

export default OpenAIImageChat;
