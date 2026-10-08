
require("dotenv").config();

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

const kevinPersonality =
    require("./config/kevin.js");

const { askKevin } =
    require("./ai/brain.js");

const PORT = process.env.PORT || 3000;
const DEFAULT_KEVIN_USERNAME = "kevin";
const DEFAULT_KEVIN_PASSWORD = "Kammiketah@3";

const app = express();
const isVercelRuntime = Boolean(process.env.VERCEL);


/*
=========================================
SECURITY HEADERS
=========================================
*/

app.use(
    helmet({
        contentSecurityPolicy: false
    })
);


/*
=========================================
SECURITY SETTINGS
=========================================
*/

app.disable("x-powered-by");


/*
=========================================
SESSION STORAGE
=========================================
*/

const sessions =
    new Map();


const SESSION_DURATION =
    1000 * 60 * 60 * 8;


/*
=========================================
CHAT RATE LIMITER
=========================================
*/

/*
Maximum of 20 chat requests
per 60 seconds.

This protects Kevin's AI endpoint
from excessive requests.
*/

const chatLimiter =
    rateLimit({

        windowMs:
            60 * 1000,

        max:
            20,

        standardHeaders:
            true,

        legacyHeaders:
            false,

        message: {

            success: false,

            error:
                "Too many requests. Please wait a minute before trying again."

        }

    });


/*
=========================================
JSON REQUEST SUPPORT
=========================================
*/

app.use(
    express.json({
        limit: "10kb"
    })
);


/*
=========================================
PRIVATE LOCAL ACCESS
=========================================
*/

function privateAccess(
    req,
    res,
    next
) {

    if (isVercelRuntime) {
        return next();
    }

    const remoteAddress =
        req.socket.remoteAddress || req.ip;


    const isLocalhost =
        remoteAddress === "127.0.0.1" ||
        remoteAddress === "::1" ||
        remoteAddress === "::ffff:127.0.0.1";


    if (!isLocalhost) {

        console.warn(
            "Blocked non-local request from:",
            remoteAddress
        );


        return res.status(403).json({

            success: false,

            error:
                "Private access only."

        });

    }


    next();

}


app.use(
    privateAccess
);


/*
=========================================
COOKIE HELPERS
=========================================
*/

function parseCookies(
    req
) {

    const cookieHeader =
        req.headers.cookie;


    if (!cookieHeader) {

        return {};

    }


    const cookies = {};


    cookieHeader
        .split(";")
        .forEach(
            function(cookie) {

                const separator =
                    cookie.indexOf("=");


                if (
                    separator === -1
                ) {

                    return;

                }


                const name =
                    cookie
                        .slice(
                            0,
                            separator
                        )
                        .trim();


                const value =
                    cookie
                        .slice(
                            separator + 1
                        )
                        .trim();


                try {

                    cookies[name] =
                        decodeURIComponent(
                            value
                        );

                } catch (error) {

                    console.warn(
                        "Invalid cookie encoding."
                    );

                }

            }
        );


    return cookies;

}


/*
=========================================
CREATE SESSION
=========================================
*/

function createSession() {

    const sessionId =
        crypto.randomBytes(32)
            .toString("hex");


    sessions.set(
        sessionId,
        {

            createdAt:
                Date.now(),

            expiresAt:
                Date.now() +
                SESSION_DURATION

        }
    );


    return sessionId;

}


/*
=========================================
GET CURRENT SESSION
=========================================
*/

function getSession(
    req
) {

    const cookies =
        parseCookies(req);


    const sessionId =
        cookies.kevin_session;


    if (!sessionId) {

        return null;

    }


    const session =
        sessions.get(
            sessionId
        );


    if (!session) {

        return null;

    }


    if (
        Date.now() >
        session.expiresAt
    ) {

        sessions.delete(
            sessionId
        );

        return null;

    }


    return {

        sessionId,

        session

    };

}


/*
=========================================
SECURE COOKIE CONFIGURATION
=========================================
*/

/*
Kevin uses HTTP during local development.

The Secure flag is therefore only added
when NODE_ENV is set to production.

Production should use HTTPS.
*/

const isProduction =
    process.env.NODE_ENV === "production";


function createSessionCookie(
    sessionId
) {

    const cookieParts = [

        "kevin_session=" +
        encodeURIComponent(
            sessionId
        ),

        "HttpOnly",

        "SameSite=Strict",

        "Path=/",

        "Max-Age=28800"

    ];


    /*
    HTTPS protection.

    Secure cookies are enabled only
    in production.
    */

    if (
        isProduction
    ) {

        cookieParts.push(
            "Secure"
        );

    }


    return cookieParts.join(
        "; "
    );

}


function createLogoutCookie() {

    const cookieParts = [

        "kevin_session=",

        "HttpOnly",

        "SameSite=Strict",

        "Path=/",

        "Max-Age=0"

    ];


    if (
        isProduction
    ) {

        cookieParts.push(
            "Secure"
        );

    }


    return cookieParts.join(
        "; "
    );

}


/*
=========================================
AUTHENTICATION MIDDLEWARE
=========================================
*/

function requireAuthentication(
    req,
    res,
    next
) {

    const session =
        getSession(req);


    if (!session) {

        /*
        API REQUEST
        */

        if (
            req.path.startsWith(
                "/api/"
            )
        ) {

            return res.status(401).json({

                success: false,

                error:
                    "Authentication required."

            });

        }


        /*
        WEBSITE REQUEST
        */

        return res.redirect(
            "/login.html"
        );

    }


    next();

}


/*
=========================================
AUTH CHECK
=========================================
*/

app.get(
    "/api/auth/me",
    (req, res) => {

        const session =
            getSession(req);


        if (!session) {

            return res.json({

                authenticated:
                    false

            });

        }


        res.json({

            authenticated:
                true

        });

    }
);


/*
=========================================
LOGIN
=========================================
*/

app.post(
    "/api/auth/login",
    (req, res) => {

        const username =
            typeof req.body.username ===
            "string"
                ? req.body.username.trim()
                : "";


        const password =
            typeof req.body.password ===
            "string"
                ? req.body.password
                : "";


        if (
            !username ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                error:
                    "Username and password are required."

            });

        }


        const expectedUsername =
            process.env.KEVIN_USERNAME ||
            DEFAULT_KEVIN_USERNAME;


        const expectedPassword =
            process.env.KEVIN_PASSWORD ||
            DEFAULT_KEVIN_PASSWORD;


        if (
            !process.env.KEVIN_USERNAME ||
            !process.env.KEVIN_PASSWORD
        ) {

            console.warn(
                "Kevin auth environment variables are missing; using built-in fallback credentials."
            );

        }


        const usernameMatches =
            username ===
            expectedUsername;


        const passwordMatches =
            password ===
            expectedPassword;


        if (
            !usernameMatches ||
            !passwordMatches
        ) {

            console.warn(
                "Failed Kevin login attempt."
            );


            return res.status(401).json({

                success: false,

                error:
                    "Invalid username or password."

            });

        }


        /*
        =========================================
        CREATE SESSION
        =========================================
        */

        const sessionId =
            createSession();


        /*
        =========================================
        SEND SECURE SESSION COOKIE
        =========================================
        */

        res.setHeader(
            "Set-Cookie",
            createSessionCookie(
                sessionId
            )
        );


        res.json({

            success: true,

            message:
                "Login successful."

        });

    }
);


/*
=========================================
LOGOUT
=========================================
*/

app.post(
    "/api/auth/logout",
    (req, res) => {

        const session =
            getSession(req);


        if (session) {

            sessions.delete(
                session.sessionId
            );

        }


        /*
        =========================================
        CLEAR SESSION COOKIE
        =========================================
        */

        res.setHeader(
            "Set-Cookie",
            createLogoutCookie()
        );


        res.json({

            success: true,

            message:
                "Logged out."

        });

    }
);


/*
=========================================
LOGIN PAGE
=========================================
*/

app.get(
    "/login.html",
    (req, res) => {

        const session =
            getSession(req);


        if (session) {

            return res.redirect(
                "/"
            );

        }


        res.sendFile(
            path.join(
                __dirname,
                "public",
                "login.html"
            )
        );

    }
);


/*
=========================================
PROTECT EVERYTHING ELSE
=========================================
*/

app.use(
    requireAuthentication
);


/*
=========================================
STATIC WEBSITE
=========================================
*/

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


/*
=========================================
KEVIN STATUS
=========================================
*/

app.get(
    "/api/status",
    (req, res) => {

        res.json({

            success: true,

            name:
                kevinPersonality.name,

            role:
                kevinPersonality.role,

            message:
                "Kevin is online."

        });

    }
);


/*
=========================================
KEVIN PERSONALITY
=========================================
*/

app.get(
    "/api/personality",
    (req, res) => {

        res.json(
            kevinPersonality
        );

    }
);


/*
=========================================
KEVIN CHAT
=========================================
*/

app.post(
    "/api/chat",
    chatLimiter,
    async (req, res) => {

        try {

            /*
            =========================================
            REQUEST BODY VALIDATION
            =========================================
            */

            if (
                !req.body ||
                typeof req.body !== "object" ||
                Array.isArray(req.body)
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Invalid request body."

                });

            }


            /*
            =========================================
            GET MESSAGE
            =========================================
            */

            const message =
                req.body.message;


            /*
            =========================================
            MESSAGE TYPE VALIDATION
            =========================================
            */

            if (
                typeof message !== "string"
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Message must be text."

                });

            }


            /*
            =========================================
            CLEAN MESSAGE
            =========================================
            */

            const cleanMessage =
                message.trim();


            /*
            =========================================
            EMPTY MESSAGE VALIDATION
            =========================================
            */

            if (
                !cleanMessage
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Message is required."

                });

            }


            /*
            =========================================
            MAXIMUM MESSAGE LENGTH
            =========================================
            */

            if (
                cleanMessage.length > 2000
            ) {

                return res.status(400).json({

                    success: false,

                    error:
                        "Message is too long. Maximum length is 2000 characters."

                });

            }


            /*
            =========================================
            ASK KEVIN
            =========================================
            */

            const response =
                await askKevin(
                    cleanMessage
                );


            res.json(
                response
            );


        } catch (error) {

            console.error(
                "Kevin chat error:",
                error
            );


            res.status(500).json({

                success: false,

                error:
                    "Kevin encountered an error."

            });

        }

    }
);


/*
=========================================
UNKNOWN API ROUTES
=========================================
*/

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({

            success: false,

            error:
                "Kevin API endpoint not found."

        });

    }
);


/*
=========================================
SERVER ERROR HANDLER
=========================================
*/

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            "Kevin server error:",
            error
        );


        res.status(500).json({

            success: false,

            error:
                "Kevin server encountered an error."

        });

    }
);


/*
=========================================
START SERVER
=========================================
*/

if (require.main === module) {

    const server =
        app.listen(
            PORT,
            "127.0.0.1",
            () => {

                console.log(
                    `Kevin is running privately at http://127.0.0.1:${PORT}`
                );

                console.log(
                    "Private access protection: ENABLED"
                );

                console.log(
                    "Kevin authentication: ENABLED"
                );

                console.log(
                    "Kevin chat rate limiting: ENABLED (20 requests/minute)"
                );

                console.log(
                    "Kevin input validation: ENABLED"
                );

                console.log(
                    "Kevin security headers: ENABLED"
                );

                console.log(
                    "Kevin secure cookies: ENABLED"
                );

                console.log(
                    "Kevin server process: RUNNING"
                );

            }
        );

    server.on(
        "error",
        (error) => {

            console.error(
                "Kevin server startup error:",
                error
            );

        }
    );

    server.on(
        "close",
        () => {

            console.log(
                "Kevin server has CLOSED."
            );

        }
    );
}

module.exports = app;


/*
=========================================
PROCESS ERROR MONITOR
=========================================
*/

process.on(
    "uncaughtException",
    (error) => {

        console.error(
            "Kevin uncaught exception:",
            error
        );

    }
);


process.on(
    "unhandledRejection",
    (error) => {

        console.error(
            "Kevin unhandled rejection:",
            error
        );

    }
);
