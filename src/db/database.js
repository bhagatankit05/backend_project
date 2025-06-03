import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectToDatabase = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`, {
            
        });
        console.log(`Database connceted!!!!!! DB Host : ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error("Error connecting to the database:", error);
        throw error;
        process.exit(1); // Exit the process if connection fails
    }
}
export default connectToDatabase;