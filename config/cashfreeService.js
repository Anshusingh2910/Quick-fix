const axios = require("axios");

const CASHFREE_BASE_URL =
    process.env.CASHFREE_ENV === "production"
        ? "https://api.cashfree.com/verification"
        : "https://sandbox.cashfree.com/verification";

const getExpiryDate = () => {
    const date = new Date();

    date.setDate(date.getDate() + 29);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const generateKYCLink = async ({
    phone,
    name,
    email,
    verificationId,
}) => {
    try {
        const linkExpiry = getExpiryDate();

        console.log("Cashfree KYC Request:", {
            phone,
            name,
            email,
            verificationId,
            link_expiry: linkExpiry,
        });

        const response = await axios.post(
            `${CASHFREE_BASE_URL}/form`,
            {
                phone,
                template_name: "Aadhaar_verification",
                verification_id: verificationId,
                name,
                email,
                link_expiry: linkExpiry,
                notification_types: [],
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-client-id":
                        process.env.CASHFREE_CLIENT_ID,
                    "x-client-secret":
                        process.env.CASHFREE_CLIENT_SECRET,
                },
            }
        );

        console.log(
            "Cashfree KYC Response:",
            response.data
        );

        return response.data;
    } catch (error) {
        console.error(
            "Cashfree KYC Error:",
            error.response?.data || error.message
        );

        throw error;
    }
};

module.exports = {
    generateKYCLink,
};