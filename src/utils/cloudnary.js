import {v2 as cloudinary} from "cloudinary"
import fs from "fs"
import { env } from "process"


cloudinary.config({
    cloud_name : process.env.CLOUDNAME ,
    api_key : process.env.CLOUDNARY_API_KEY,
    api_secret : process.env.CLOUDNARY_API_SECRET_KEY
});



const uploadonCloudinary = async (localfilepath) =>{
    try {
        if(!localfilepath) return "Upload file";

        const response = await cloudinary.uploader.upload(localfilepath, {resource_type:"auto"})

        console.log("File uploaded successfully", response.url);
        return response;

        
    } catch (error) {
        fs.unlinkSync(localfilepath)
        console.log("ERROR : ", error );
        
    }

}
export {uploadonCloudinary}