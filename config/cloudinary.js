const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});

const deleteFromCloudinary = async (public_id) => {
    try {
        if (!public_id) return;
        await cloudinary.uploader.destroy(public_id, {
            resource_type: "image",
        });

        return true;
    } catch (err) {
        throw new Error(
            `Cloudinary Delete Failed: ${err.message}`
        );
    }
};

module.exports = {
    cloudinary,
    deleteFromCloudinary,
};