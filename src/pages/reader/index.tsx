import { useEffect, useState } from "react";
import { IReactReaderStyle, ReactReader, ReactReaderStyle } from "react-reader";
import type { Contents, Rendition } from "epubjs";

interface DalleImageResponse {
    data: Array<{
        url: string;
    }>;
}

type TextSelection = {
    text: string;
    cfiRange: string;
};

const darkReaderTheme: IReactReaderStyle = {
    ...ReactReaderStyle,
    arrow: {
        ...ReactReaderStyle.arrow,
        color: "white"
    },
    arrowHover: {
        ...ReactReaderStyle.arrowHover,
        color: "#ccc"
    },
    readerArea: {
        ...ReactReaderStyle.readerArea,
        backgroundColor: "#000",
        transition: undefined
    },
    titleArea: {
        ...ReactReaderStyle.titleArea,
        color: "#ccc"
    },
    tocArea: {
        ...ReactReaderStyle.tocArea,
        background: "#111"
    },
    tocButtonExpanded: {
        ...ReactReaderStyle.tocButtonExpanded,
        background: "#222"
    },
    tocButtonBar: {
        ...ReactReaderStyle.tocButtonBar,
        background: "#fff"
    },
    tocButton: {
        ...ReactReaderStyle.tocButton,
        color: "white"
    }
};

export const App = () => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDalleImage = async (prompt: string) => {
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
                        model: "dall-e-3",
                        prompt: `Create a beautiful, compelling, image to visualize the following text from a book. Do not include any writing in the image.
                        
${prompt}`,
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

    const [selections, setSelections] = useState<TextSelection[]>([]);
    const [location, setLocation] = useState<string | number>(0);
    const [rendition, setRendition] = useState<Rendition | undefined>(
        undefined
    );

    useEffect(() => {
        if (rendition) {
            rendition.themes.override("color", "#fff");
            rendition.themes.override("background", "#000");

            const setRenderSelection = (
                cfiRange: string,
                contents: Contents
            ) => {
                if (rendition) {
                    setSelections((list) => {
                        if (list.length > 0) {
                            rendition.annotations.remove(
                                list[0].cfiRange,
                                "highlight"
                            );
                        }
                        return [
                            {
                                text: rendition.getRange(cfiRange).toString(),
                                cfiRange
                            }
                        ];
                    });

                    rendition.annotations.add(
                        "highlight",
                        cfiRange,
                        {},
                        (e: MouseEvent) =>
                            console.log("click on selection", cfiRange, e),
                        "hl",
                        {
                            fill: "red",
                            "fill-opacity": "0.5",
                            "mix-blend-mode": "multiply"
                        }
                    );
                    const selection = contents.window.getSelection();
                    selection?.removeAllRanges();
                }
            };
            rendition.on("selected", setRenderSelection);
            return () => {
                rendition?.off("selected", setRenderSelection);
            };
        }
    }, [setSelections, rendition]);

    return (
        <div style={{ height: "100vh" }}>
            <ReactReader
                url="/three.epub"
                location={location}
                readerStyles={darkReaderTheme}
                locationChanged={(epubcfi: string) => setLocation(epubcfi)}
                getRendition={(_rendition: Rendition) => {
                    setRendition(_rendition);
                }}
            />
            {imageUrl && (
                <>
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            height: "calc(100vh - 200px)",
                            width: "100vw",
                            backgroundColor: "#000",
                            backgroundSize: "contain",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                            backgroundImage: `url(${imageUrl})`,
                            zIndex: 1000
                        }}
                        onClick={() => {
                            const isConfirmed = window.confirm("Close image?");
                            if (!isConfirmed) return;
                            setImageUrl(null);
                        }}
                    />
                    <div
                        style={{
                            position: "fixed",
                            bottom: 0,
                            left: 0,
                            height: 200,
                            width: "100vw",
                            backgroundColor: "#000",
                            zIndex: 1000,
                            color: "white",
                            textAlign: "center",
                            padding: 20,
                            overflow: "auto"
                        }}
                    >
                        {selections[0].text}
                    </div>
                </>
            )}
            {!!selections.length && (
                <div
                    style={{
                        position: "fixed",
                        bottom: 0,
                        left: 0,
                        width: "100vw",
                        textAlign: "center",
                        zIndex: 100,
                        color: "white",
                        padding: 10,
                        cursor: "pointer",
                        background: "rgba(0, 0, 0, 0.5)"
                    }}
                    onClick={() => fetchDalleImage(selections[0].text)}
                >
                    {loading ? "Loading..." : "Generate Image"}
                </div>
            )}
        </div>
    );
};
export default App;
