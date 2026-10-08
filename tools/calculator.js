/*
==================================================
KEVIN MATHEMATICS ENGINE
==================================================

Supports:

BASIC ARITHMETIC
- Addition: +
- Subtraction: -
- Multiplication: *
- Division: /
- Modulo: %
- Parentheses: ()
- Decimals
- Exponents: ^

NATURAL LANGUAGE
- 15% of 85000
- 20 percent of 500
- 25% of 800 + 100

ADVANCED MATH
- sqrt()
- cbrt()
- abs()
- exp()
- log()
- ln()
- sin()
- cos()
- tan()
- asin()
- acos()
- atan()
- factorial
- pi
- e

SYMBOLIC MATH
- simplify
- expand
- factor
- differentiate
- derivative
- integrate
- integral
- solve

MATRICES
- determinant
- det

Uses:
- mathjs
- nerdamer

No eval() is used.
==================================================
*/

const math = require("mathjs");
const nerdamer = require("nerdamer");


/*
==================================================
INPUT VALIDATION
==================================================
*/

function validateInput(expression) {

    if (typeof expression !== "string") {
        throw new Error("Mathematics input must be text.");
    }

    if (!expression.trim()) {
        throw new Error("No mathematical expression was provided.");
    }

    if (expression.length > 5000) {
        throw new Error("Mathematical expression is too long.");
    }
}


/*
==================================================
NORMALIZE BASIC MATHEMATICS
==================================================
*/

function normalizeExpression(expression) {

    let cleaned = expression
        .trim()
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/−/g, "-")
        .replace(/π/g, "pi")
        .replace(/∞/g, "Infinity")
        .replace(/\s+/g, " ");


    /*
    ----------------------------------------------
    NATURAL LANGUAGE PERCENTAGES
    ----------------------------------------------

    Example:

    15% of 85000

    becomes:

    (15/100) * 85000
    */

    cleaned = cleaned.replace(
        /(\d+(?:\.\d+)?)\s*%\s*(?:of)\s*(\([^()]+\)|[\d.]+)/gi,
        "($1 / 100) * ($2)"
    );


    /*
    Example:

    20 percent of 500
    */

    cleaned = cleaned.replace(
        /(\d+(?:\.\d+)?)\s*percent\s*(?:of)\s*(\([^()]+\)|[\d.]+)/gi,
        "($1 / 100) * ($2)"
    );


    /*
    ----------------------------------------------
    STANDALONE PERCENTAGES
    ----------------------------------------------

    15% → (15 / 100)
    */

    cleaned = cleaned.replace(
        /(\d+(?:\.\d+)?)\s*%/g,
        "($1 / 100)"
    );


    /*
    ----------------------------------------------
    POWER SYMBOL
    ----------------------------------------------

    ^ is accepted by mathjs.
    */

    cleaned = cleaned.replace(/\^/g, "^");


    return cleaned;
}


/*
==================================================
SECURITY VALIDATION
==================================================

We allow mathematical expressions only.

We reject:
- JavaScript syntax
- assignments
- object access
- function construction
- imports
- semicolons
- brackets used as code
==================================================
*/

function validateMathematicalSyntax(expression) {

    const dangerousPatterns = [
        /;/,
        /=>/,
        /\bimport\b/i,
        /\brequire\b/i,
        /\bprocess\b/i,
        /\bglobal\b/i,
        /\bmodule\b/i,
        /\bexports\b/i,
        /\bconstructor\b/i,
        /\bprototype\b/i,
        /\b__proto__\b/i,
        /\beval\b/i,
        /\bFunction\b/i,
        /\bwhile\b/i,
        /\bfor\b/i,
        /\bif\b/i,
        /\breturn\b/i
    ];

    for (const pattern of dangerousPatterns) {

        if (pattern.test(expression)) {
            throw new Error(
                "Invalid mathematical expression."
            );
        }
    }

    /*
    Only mathematical characters,
    letters, numbers and common
    mathematical punctuation are allowed.
    */

    if (
        !/^[a-zA-Z0-9_+\-*/%^().,\[\] =<>!:\s]+$/.test(
            expression
        )
    ) {

        throw new Error(
            "Invalid mathematical expression."
        );
    }
}


/*
==================================================
SYMBOLIC COMMAND DETECTION
==================================================
*/

function isSymbolicRequest(expression) {

    return /^(simplify|expand|factor|differentiate|derivative|integrate|integral|solve|limit|determinant|det)\b/i
        .test(expression.trim());
}


/*
==================================================
SYMBOLIC MATHEMATICS
==================================================
*/

function calculateSymbolic(expression) {

    let input = expression.trim();


    /*
    ----------------------------------------------
    SIMPLIFY
    ----------------------------------------------
    */

    let match = input.match(
        /^simplify\s+(.+)$/i
    );

    if (match) {

        const result = nerdamer(match[1]);

        return result.text();
    }


    /*
    ----------------------------------------------
    EXPAND
    ----------------------------------------------
    */

    match = input.match(
        /^expand\s+(.+)$/i
    );

    if (match) {

        const result = nerdamer.expand(
            nerdamer(match[1])
        );

        return result.text();
    }


    /*
    ----------------------------------------------
    FACTOR
    ----------------------------------------------
    */

    match = input.match(
        /^factor\s+(.+)$/i
    );

    if (match) {

        const result = nerdamer.factor(
            match[1]
        );

        return result.text();
    }


    /*
    ----------------------------------------------
    DIFFERENTIATE
    ----------------------------------------------

    Example:

    differentiate x^3 * sin(x)
    */

    match = input.match(
        /^(?:differentiate|derivative)\s+(.+)$/i
    );

    if (match) {

        const result = nerdamer.diff(
            match[1],
            "x"
        );

        return result.text();
    }


    /*
    ----------------------------------------------
    INTEGRATE
    ----------------------------------------------

    Example:

    integrate x^2
    */

    match = input.match(
        /^(?:integrate|integral)\s+(.+)$/i
    );

    if (match) {

        const result = nerdamer.integrate(
            match[1],
            "x"
        );

        return result.text();
    }


    /*
    ----------------------------------------------
    SOLVE
    ----------------------------------------------

    Examples:

    solve x^2 - 5*x + 6 = 0

    solve x^2 - 4
    */

    match = input.match(
        /^solve\s+(.+)$/i
    );

    if (match) {

        let equation = match[1];

        /*
        If the user provides:

        x^2 - 5*x + 6 = 0

        convert it to:

        x^2 - 5*x + 6
        */

        equation = equation.replace(
            /=\s*0\s*$/,
            ""
        );

        const result = nerdamer.solveFor(
            equation,
            "x"
        );

        return result.text();
    }


    /*
    ----------------------------------------------
    LIMIT
    ----------------------------------------------

    Example:

    limit (sin(x)/x) as x->0
    */

    match = input.match(
        /^limit\s+(.+?)\s+(?:as\s+)?x\s*(?:->|→)\s*(.+)$/i
    );

    if (match) {

        const expressionPart = match[1];
        const value = match[2];

        try {

            const result = nerdamer(
                `limit(${expressionPart}, x, ${value})`
            );

            return result.text();

        } catch (error) {

            throw new Error(
                "Unable to calculate the requested limit."
            );
        }
    }


    /*
    ----------------------------------------------
    DETERMINANT
    ----------------------------------------------
    */

    match = input.match(
        /^(?:determinant|det)\s+(.+)$/i
    );

    if (match) {

        try {

            const matrix = math.evaluate(
                match[1]
            );

            const result = math.det(matrix);

            return formatCalculatorResult(
                result
            );

        } catch (error) {

            throw new Error(
                "Unable to calculate the determinant."
            );
        }
    }


    throw new Error(
        "I couldn't understand that symbolic mathematics command."
    );
}


/*
==================================================
NUMERICAL MATHEMATICS
==================================================
*/

function calculateNumerical(expression) {

    const normalized = normalizeExpression(
        expression
    );

    validateMathematicalSyntax(
        normalized
    );


    /*
    ----------------------------------------------
    MATHJS PARSER
    ----------------------------------------------
    */

    try {

        const result = math.evaluate(
            normalized
        );


        /*
        ------------------------------------------
        MATRIX RESULT
        ------------------------------------------
        */

        if (
            Array.isArray(result) ||
            result &&
            typeof result === "object" &&
            Array.isArray(result.valueOf?.())
        ) {

            return formatMatrixResult(
                result
            );
        }


        /*
        ------------------------------------------
        COMPLEX NUMBERS
        ------------------------------------------
        */

        if (
            result &&
            typeof result === "object" &&
            "re" in result &&
            "im" in result
        ) {

            return formatComplexResult(
                result
            );
        }


        /*
        ------------------------------------------
        NUMERIC RESULT
        ------------------------------------------
        */

        if (typeof result === "number") {

            if (!Number.isFinite(result)) {

                throw new Error(
                    "The calculation produced an invalid result."
                );
            }

            return formatCalculatorResult(
                result
            );
        }


        /*
        ------------------------------------------
        OTHER MATHJS RESULTS
        ------------------------------------------
        */

        return String(result);

    } catch (error) {

        throw new Error(
            "Invalid mathematical expression: " +
            error.message
        );
    }
}


/*
==================================================
MATRIX FORMATTER
==================================================
*/

function formatMatrixResult(matrix) {

    try {

        const value =
            typeof matrix.valueOf === "function"
                ? matrix.valueOf()
                : matrix;

        return JSON.stringify(value);

    } catch (error) {

        return String(matrix);
    }
}


/*
==================================================
COMPLEX NUMBER FORMATTER
==================================================
*/

function formatComplexResult(value) {

    const real = Number(value.re);
    const imaginary = Number(value.im);

    if (
        Number.isFinite(real) &&
        Number.isFinite(imaginary)
    ) {

        if (imaginary === 0) {
            return formatCalculatorResult(real);
        }

        if (real === 0) {
            return `${formatCalculatorResult(imaginary)}i`;
        }

        const sign =
            imaginary >= 0
                ? "+"
                : "-";

        return (
            `${formatCalculatorResult(real)} ` +
            `${sign} ` +
            `${formatCalculatorResult(Math.abs(imaginary))}i`
        );
    }

    return String(value);
}


/*
==================================================
FORMAT NUMERIC RESULT
==================================================
*/

function formatCalculatorResult(result) {

    if (typeof result !== "number") {
        return String(result);
    }

    if (!Number.isFinite(result)) {

        throw new Error(
            "The calculation produced an invalid result."
        );
    }


    /*
    Avoid ugly floating-point artifacts.

    Example:

    0.1 + 0.2

    should display approximately:

    0.3
    */

    const rounded =
        Number(
            result.toPrecision(12)
        );


    if (Number.isInteger(rounded)) {

        return rounded.toLocaleString(
            "en-US"
        );
    }


    return rounded.toLocaleString(
        "en-US",
        {
            maximumFractionDigits: 12
        }
    );
}


/*
==================================================
MAIN CALCULATOR FUNCTION
==================================================
*/

function calculateExpression(expression) {

    validateInput(expression);

    const cleaned = expression.trim();


    /*
    ----------------------------------------------
    SYMBOLIC MATHEMATICS
    ----------------------------------------------
    */

    if (
        isSymbolicRequest(cleaned)
    ) {

        return calculateSymbolic(
            cleaned
        );
    }


    /*
    ----------------------------------------------
    NUMERICAL MATHEMATICS
    ----------------------------------------------
    */

    return calculateNumerical(
        cleaned
    );
}


/*
==================================================
EXPORTS
==================================================
*/

module.exports = {

    calculateExpression,

    formatCalculatorResult

};