/*
=========================================
KEVIN WEB RESEARCH ENGINE
GENERAL PURPOSE RESEARCH
=========================================
*/

const {
    webSearch
} = require("./websearch.js");


const MAX_SEARCHES = 4;
const MAX_RESULTS_PER_SEARCH = 5;
const MAX_FINAL_RESULTS = 12;

const SEARCH_RETRIES = 2;
const SEARCH_DELAY = 1000;


/*
=========================================
CLEAN TOPIC
=========================================
*/

function cleanTopic(topic) {

    return String(topic || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 300);

}


/*
=========================================
CREATE RESEARCH QUERIES
=========================================
*/

function createResearchQueries(topic) {

    const clean = cleanTopic(topic);

    return [
        clean,
        `${clean} guide`,
        `${clean} roadmap`,
        `${clean} latest developments`
    ];

}


/*
=========================================
REMOVE DUPLICATE RESULTS
=========================================
*/

function deduplicateResults(results) {

    const seen = new Set();

    const uniqueResults = [];


    for (const result of results) {

        if (
            !result ||
            !result.url
        ) {
            continue;
        }


        const normalizedUrl =
            result.url
                .trim()
                .toLowerCase();


        if (
            seen.has(
                normalizedUrl
            )
        ) {
            continue;
        }


        seen.add(
            normalizedUrl
        );


        uniqueResults.push(
            result
        );

    }


    return uniqueResults
        .slice(
            0,
            MAX_FINAL_RESULTS
        );

}


/*
=========================================
WAIT HELPER
=========================================
*/

function wait(milliseconds) {

    return new Promise(
        function(resolve) {

            setTimeout(
                resolve,
                milliseconds
            );

        }
    );

}


/*
=========================================
RUN WEB RESEARCH
=========================================
*/

async function researchTopic(topic) {

    const clean =
        cleanTopic(topic);


    if (!clean) {

        throw new Error(
            "A research topic is required."
        );

    }


    /*
    =========================================
    CREATE SEARCH QUERIES
    =========================================
    */

    const queries =
        createResearchQueries(
            clean
        );


    const allResults = [];


    /*
    =========================================
    RUN EACH SEARCH
    =========================================
    */

    for (
        const query of
        queries.slice(
            0,
            MAX_SEARCHES
        )
    ) {

        let successfulResults = false;


        /*
        =========================================
        RETRY FAILED SEARCHES
        =========================================
        */

        for (
            let attempt = 1;
            attempt <= SEARCH_RETRIES;
            attempt++
        ) {

            try {

                const searchData =
                    await webSearch(
                        query
                    );


                const results =
                    Array.isArray(
                        searchData?.results
                    )
                        ? searchData.results
                        : [];


                /*
                =========================================
                ADD RESULTS
                =========================================
                */

                if (
                    results.length > 0
                ) {

                    results
                        .slice(
                            0,
                            MAX_RESULTS_PER_SEARCH
                        )
                        .forEach(
                            function(result) {

                                if (
                                    result &&
                                    result.url
                                ) {

                                    allResults.push({

                                        ...result,

                                        searchQuery:
                                            query

                                    });

                                }

                            }
                        );


                    successfulResults =
                        true;

                    break;

                }

            }

            catch (error) {

                console.error(
                    `Research search attempt ${attempt} failed:`,
                    query,
                    error.message
                );

            }


            /*
            =========================================
            WAIT BEFORE RETRY
            =========================================
            */

            if (
                attempt <
                SEARCH_RETRIES
            ) {

                await wait(
                    SEARCH_DELAY
                );

            }

        }


        /*
        =========================================
        LOG EMPTY SEARCH
        =========================================
        */

        if (
            !successfulResults
        ) {

            console.warn(
                "No results found for research query:",
                query
            );

        }


        /*
        =========================================
        PAUSE BETWEEN QUERIES
        =========================================
        */

        await wait(
            SEARCH_DELAY
        );

    }


    /*
    =========================================
    REMOVE DUPLICATES
    =========================================
    */

    const uniqueResults =
        deduplicateResults(
            allResults
        );


    /*
    =========================================
    RETURN RESEARCH DATA
    =========================================
    */

    return {

        topic:
            clean,

        queries:
            queries,

        results:
            uniqueResults

    };

}


/*
=========================================
FORMAT RESEARCH FOR KEVIN
=========================================
*/

function formatResearchContext(
    researchData
) {

    if (
        !researchData ||
        !Array.isArray(
            researchData.results
        ) ||
        researchData.results.length === 0
    ) {

        return (
            "No useful web research results were found."
        );

    }


    const lines = [];


    /*
    =========================================
    RESEARCH TOPIC
    =========================================
    */

    lines.push(
        `RESEARCH TOPIC: ${researchData.topic}`
    );

    lines.push("");


    /*
    =========================================
    WEB SOURCES
    =========================================
    */

    lines.push(
        "WEB SOURCES:"
    );

    lines.push("");


    researchData.results.forEach(
        function(result, index) {

            lines.push(
                `${index + 1}. ${result.title}`
            );


            lines.push(
                `URL: ${result.url}`
            );


            if (
                result.snippet
            ) {

                lines.push(
                    `Summary: ${result.snippet}`
                );

            }


            if (
                result.searchQuery
            ) {

                lines.push(
                    `Search Query: ${result.searchQuery}`
                );

            }


            lines.push("");

        }
    );


    return lines.join(
        "\n"
    );

}


/*
=========================================
EXPORT
=========================================
*/

module.exports = {

    researchTopic,

    formatResearchContext

};