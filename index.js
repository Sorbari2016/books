// Backend Logic

// IMPORTS
import express from "expess"; 
import dotenv from "dotenv"; 
import axios from "axios"; 
import pg from "pg"; 
import bodyParser from "body-parser";

// Set up dotenv to process env variables
dotenv.config(); 

// Create express app
const app = express(); 

// Create port for app to listen to
const PORT = 3000; 

// Use middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Use static files
app.use(express.static("public"));


// Start or run server 
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`)
});