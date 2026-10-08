/*
=========================================
KEVIN — DATE & TIME TOOL
STEP 46
=========================================
*/

function getCurrentDateTime(timeZone = "Africa/Lagos") {
    const now = new Date();

    const formatter = new Intl.DateTimeFormat(
        "en-US",
        {
            timeZone,
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        }
    );

    return formatter.format(now);
}


function getCurrentDate(timeZone = "Africa/Lagos") {
    const now = new Date();

    const formatter = new Intl.DateTimeFormat(
        "en-US",
        {
            timeZone,
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    );

    return formatter.format(now);
}


function getCurrentTime(timeZone = "Africa/Lagos") {
    const now = new Date();

    const formatter = new Intl.DateTimeFormat(
        "en-US",
        {
            timeZone,
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        }
    );

    return formatter.format(now);
}


function getCurrentYear(timeZone = "Africa/Lagos") {
    const now = new Date();

    const formatter = new Intl.DateTimeFormat(
        "en-US",
        {
            timeZone,
            year: "numeric"
        }
    );

    return formatter.format(now);
}


function getCurrentDay(timeZone = "Africa/Lagos") {
    const now = new Date();

    const formatter = new Intl.DateTimeFormat(
        "en-US",
        {
            timeZone,
            weekday: "long"
        }
    );

    return formatter.format(now);
}


module.exports = {
    getCurrentDateTime,
    getCurrentDate,
    getCurrentTime,
    getCurrentYear,
    getCurrentDay
};