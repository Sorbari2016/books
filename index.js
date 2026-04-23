// Backend Logic

// IMPORTS
import express from "express"; 
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


// Set up database
const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST, 
  database: process.env.DB_NAME, 
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

// Connect to postgres database
db.connect(); 

// Create a method to get book data
const getBooks = async () => {
    let result = await db.query(`
        SELECT 
            bk.*, 
            rl.date_read, 
            rl.rating,
            sm.note AS summary
        FROM books AS bk
        JOIN reading_log AS rl ON bk.id = rl.book_id
        JOIN summaries AS sm ON rl.book_id = sm.book_read_id;   
    `); 
    
    return result.rows;
} 

// Set up Homepaage route 
app.get("/", async (req, res) => {
    
}); 


// Start or run server 
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`)
});