import dotenv from "dotenv";
import connectToDatabase  from "./db/database.js";

dotenv.config({
    path: "./env"
})


connectToDatabase()










/*const app = express();

(async()=>{
    try {
       await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
       app.on('error', (err) => {
           console.error("Error occurred:", err);
           throw err;
       });

       app.listen(process.env.PORT || 3000, () => {
           console.log(`Server is running on port ${process.env.PORT || 3000}`);
       });

    } catch (error) {
        console.error("Error connecting to the database:", error);
        throw error;
    }
})()
*/
//not a proffessional code, just a simple example
