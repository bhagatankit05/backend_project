import { v2 as cloudAnkit} from "cloudinary";
import fs from "fs";
 


    // Configuration
    cloudAnkit.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET 
        
    });

    const uploadCloudinary = async (localFilePath) => {}
    try {
        if(!localFilePath) return null;
       const response = await cloudAnkit.uploader.upload(localFilePath,{
            resource_type: 'auto'}
        )
        console.log("File uploaded successfully",response.url);
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath); // Delete the file if upload fails
        return null;
    }
     /*const uploadResult = await cloudAnkit.uploader
       .upload(
           'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
               public_id: 'shoes',
           }
       )
       */

export { uploadCloudinary };