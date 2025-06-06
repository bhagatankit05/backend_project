import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Set the destination folder for uploaded files}
        cb(null, ".public/temp");
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Set the filename for the uploaded file
        cb(null, file.fieldname + "-" + uniqueSuffix);
    }
});

export const upload = multer({ storage, });