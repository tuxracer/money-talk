import React, { useState } from "react";

// Define the types for the image data response
interface DalleImageResponse {
    data: Array<{
        url: string;
    }>;
}

const DalleImageFetcher: React.FC = () => {
    const [prompt, setPrompt] = useState<string>("");
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDalleImage = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                "https://api.openai.com/v1/images/generations",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                        prompt: prompt,
                        n: 1, // We only want one image
                        size: "1024x1024" // You can modify the size if needed
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const data: DalleImageResponse = await response.json();
            setImageUrl(data.data[0].url); // Get the first image URL from the response
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt) {
            fetchDalleImage();
        }
    };

    return (
        <div>
            <h1>Generate Image with DALL-E</h1>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter an image prompt"
                    required
                />
                <button type="submit">Generate Image</button>
            </form>

            {loading && <p>Loading...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}
            {imageUrl && (
                <div>
                    <h2>Generated Image:</h2>
                    <img
                        src={imageUrl}
                        alt="Generated from DALL-E"
                        style={{ maxWidth: "100%" }}
                    />
                </div>
            )}
        </div>
    );
};

export default DalleImageFetcher;
