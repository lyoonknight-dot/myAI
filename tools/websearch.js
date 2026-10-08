require("dotenv").config();

/*
=========================================
KEVIN — WEB SEARCH TOOL
=========================================
*/

const SERPER_URL = "https://google.serper.dev/search";
const SEARCH_URL = "https://duckduckgo.com/html/?q=";
const SERPER_API_KEY = process.env.SERPER_API_KEY;

const MAX_QUERY_LENGTH = 300;
const MAX_RESULTS = 5;
const REQUEST_TIMEOUT = 20000;
const SEARCH_RETRIES = 3;
const SEARCH_RETRY_DELAY = 1500;

/*
=========================================
CLEAN SEARCH QUERY
=========================================
*/

function cleanSearchQuery(query) {
    if (typeof query !== "string" || !query.trim()) {
        throw new Error("Search query cannot be empty.");
    }

    const cleaned = query.trim().replace(/\s+/g, " ");

    if (cleaned.length > MAX_QUERY_LENGTH) {
        throw new Error("Search query is too long.");
    }

    return cleaned;
}

/*
=========================================
DECODE HTML ENTITIES
=========================================
*/

function decodeHtmlEntities(text) {
    return String(text || "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/gi, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#x2F;/gi, "/")
        .replace(/&#47;/g, "/")
        .replace(/&#x3A;/gi, ":")
        .replace(/&#58;/g, ":");
}

/*
=========================================
STRIP HTML
=========================================
*/

function stripHtml(html) {
    return decodeHtmlEntities(
        String(html || "")
            .replace(/<br\s*\/?>/gi, " ")
            .replace(/<[^>]*>/g, "")
            .replace(/\s+/g, " ")
            .trim()
    );
}

/*
=========================================
EXTRACT SEARCH RESULTS
=========================================
*/

function extractSearchResults(html) {
    const results = [];
    const linkPattern = /<a[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while ((match = linkPattern.exec(html)) !== null && results.length < MAX_RESULTS) {
        let url = decodeHtmlEntities(match[1]);
        const title = stripHtml(match[2]);

        if (url.startsWith("//")) {
            url = "https:" + url;
        }

        try {
            const parsedUrl = new URL(url);
            const redirectedUrl = parsedUrl.searchParams.get("uddg");

            if (redirectedUrl) {
                url = decodeURIComponent(redirectedUrl);
            }
        } catch {
            // Keep original URL if parsing fails.
        }

        const remainingHtml = html.slice(linkPattern.lastIndex, linkPattern.lastIndex + 3000);
        const snippetMatch = remainingHtml.match(/class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|div)/i);
        const snippet = snippetMatch ? stripHtml(snippetMatch[1]) : "";

        if (!title) {
            continue;
        }

        results.push({ title, url, snippet });
    }

    return results;
}

/*
=========================================
SEARCH THE WEB
=========================================
*/

async function webSearch(query) {
    const cleanQuery = cleanSearchQuery(query);

    if (!SERPER_API_KEY) {
        return {
            success: false,
            query: cleanQuery,
            results: [],
            message: "SERPER_API_KEY is not configured."
        };
    }

    let lastError = null;

    for (let attempt = 1; attempt <= SEARCH_RETRIES; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        try {
            const response = await fetch(SERPER_URL, {
                method: "POST",
                headers: {
                    "X-API-KEY": SERPER_API_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    q: cleanQuery,
                    num: MAX_RESULTS
                }),
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`Web search returned HTTP ${response.status}.`);
            }

            const data = await response.json();
            const organicResults = Array.isArray(data.organic) ? data.organic : [];
            const results = organicResults
                .slice(0, MAX_RESULTS)
                .map(function(result) {
                    return {
                        title: result.title || "",
                        url: result.link || "",
                        snippet: result.snippet || ""
                    };
                })
                .filter(function(result) {
                    return result.title && result.url;
                });

            if (results.length > 0) {
                return {
                    success: true,
                    query: cleanQuery,
                    results
                };
            }

            lastError = new Error("No web search results were found.");
        } catch (error) {
            if (error && error.name === "AbortError") {
                lastError = new Error("Web search timed out.");
            } else {
                lastError = new Error(`Web search failed: ${error.message}`);
            }
        } finally {
            clearTimeout(timeout);
        }

        if (attempt < SEARCH_RETRIES) {
            await new Promise(function(resolve) {
                setTimeout(resolve, SEARCH_RETRY_DELAY * attempt);
            });
        }
    }

    return {
        success: false,
        query: cleanQuery,
        results: [],
        message: lastError ? lastError.message : "Web search failed."
    };
}

/*
=========================================
FORMAT SEARCH RESULTS
=========================================
*/

function formatSearchResults(searchData) {
    if (!searchData || !Array.isArray(searchData.results) || !searchData.results.length) {
        return `I couldn't find any web results for "${searchData?.query || ""}".`;
    }

    let output = `Web search results for "${searchData.query}":\n\n`;

    searchData.results.forEach((result, index) => {
        output += `${index + 1}. ${result.title}\n`;

        if (result.snippet) {
            output += `   ${result.snippet}\n`;
        }

        if (result.url) {
            output += `   ${result.url}\n`;
        }

        output += "\n";
    });

    return output.trim();
}

/*
=========================================
EXPORTS
=========================================
*/

module.exports = {
    webSearch,
    formatSearchResults,
    extractSearchResults
};
