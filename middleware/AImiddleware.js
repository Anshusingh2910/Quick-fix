const mechanicPrompt = require("../prompt/mechanicPrompt");
const ApiError = require("../utilities/ApiError");
const Groq = require("../config/Groq");

const MODEL =
    process.env.GROQ_MODEL || "openai/gpt-oss-20b";

const chatWithAI = async ({
    user,
    vehicles = [],
    bookingHistory = [],
    message,
}) => {

    // -------------------------
    // 1. Validate message
    // -------------------------

    if (!message?.trim()) {
        throw new ApiError(
            400,
            "Message is required."
        );
    }

    // -------------------------
    // 2. Create prompt
    // -------------------------

    const prompt = mechanicPrompt({
        user,
        vehicles,
        bookingHistory,
        message,
    });

    try {


        const response =
            await Groq.chat.completions.create({
                model: MODEL,

                messages: [
                    {
                        role: "system",
                        content:
                            "You are QuickFix AI, an expert automobile mechanic. Return only valid JSON.",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],

                temperature: 0.3,

                max_completion_tokens: 1200,

                response_format: {
                    type: "json_object",
                },
            });

        // -------------------------
        // 4. Get response
        // -------------------------

        const content =
            response?.choices?.[0]?.message?.content?.trim();

        if (!content) {
            throw new ApiError(
                502,
                "QuickFix AI returned an empty response."
            );
        }

        // -------------------------
        // 5. Parse JSON
        // -------------------------

        let result;

        try {

            result = JSON.parse(content);

        } catch (error) {

            console.error(
                "❌ Invalid Groq JSON:",
                content
            );

            throw new ApiError(
                502,
                "QuickFix AI returned an invalid response."
            );
        }

        // -------------------------
        // 6. Basic validation
        // -------------------------

        if (
            !result.vehicle ||
            !result.problem ||
            !Array.isArray(
                result.possibleCauses
            ) ||
            !Array.isArray(
                result.recommendedSteps
            ) ||
            !result.needMechanic ||
            !result.estimatedCost
        ) {

            throw new ApiError(
                502,
                "QuickFix AI returned an incomplete response."
            );
        }

        // -------------------------
        // 7. Normalize confidence
        // -------------------------

        result.confidence = Math.min(
            Math.max(
                Number(result.confidence) || 0,
                0
            ),
            100
        );

        // -------------------------
        // 8. Normalize currency
        // -------------------------

        if (
            !result.estimatedCost.currency
        ) {
            result.estimatedCost.currency =
                "INR";
        }

        // -------------------------
        // 9. Return
        // -------------------------

        return result;

    } catch (err) {

        console.error(
            "❌ QuickFix AI Error:",
            err?.message || err
        );

        const status =
            err?.status ||
            err?.statusCode ||
            err?.response?.status;

        const errorMessage =
            String(
                err?.message || ""
            );

        // -------------------------
        // Invalid API key
        // -------------------------

        if (
            status === 401 ||
            errorMessage.includes(
                "authentication"
            ) ||
            errorMessage.includes(
                "invalid_api_key"
            )
        ) {

            throw new ApiError(
                500,
                "QuickFix AI API key is invalid."
            );
        }

        // -------------------------
        // Model not found
        // -------------------------

        if (
            status === 404 ||
            errorMessage.includes(
                "model_not_found"
            )
        ) {

            throw new ApiError(
                500,
                `QuickFix AI model "${MODEL}" is unavailable.`
            );
        }

        // -------------------------
        // Rate limit
        // -------------------------

        if (status === 429) {

            throw new ApiError(
                429,
                "QuickFix AI is receiving too many requests. Please try again shortly."
            );
        }

        // -------------------------
        // Server unavailable
        // -------------------------

        if (
            status === 500 ||
            status === 502 ||
            status === 503
        ) {

            throw new ApiError(
                503,
                "QuickFix AI is temporarily unavailable. Please try again."
            );
        }

        // -------------------------
        // Our own ApiError
        // -------------------------

        if (err instanceof ApiError) {
            throw err;
        }

        // -------------------------
        // Unknown error
        // -------------------------

        throw new ApiError(
            500,
            "Unable to process your request with QuickFix AI."
        );
    }
};

module.exports = {
    chatWithAI,
};