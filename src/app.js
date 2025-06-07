import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials: true,
}));
app.use(express.json({limit: '20kb'})); //use express.json() to parse JSON bodies 
app.use(express.urlencoded({extended: true, limit: '20kb'})); //use express.urlencoded() to parse URL-encoded bodies extended is set to true to allow for rich objects and arrays to be encoded into the URL-encoded format
app.use(express.static('public')); //use express.static() to serve static files from the public directory
app.use(cookieParser()); //use cookie-parser to parse cookies attached to the client request object

// Import routes
import userRoutes from './routes/user.routes.js';

//Routes Declaration
app.use('/api/v1/users', userRoutes);


export {app};