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

// Use middleware, body-parser
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

// Create a method to get all books' data
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
}; 

// Convert date to simple yyyy-mm-dd format
const formatDate = (date) => {
  return new Date(date).toISOString().split("T")[0];
};

// store base url of open lib api
const BASE_URL = 'https://openlibrary.org'; 

// Create method to get covers by title
const getCoverByTitle = async (title) => {
    try {
        // // Encode the title for the URL (replaces spaces with %20, etc.)
        let encodeTitle = encodeURIComponent(title); 
        let response = await axios.get(`${BASE_URL}/search.json?title=${encodeTitle}&limit=1`); 
        let data = response.data;  
    
        let book = data.docs[0]; 

        let coverURL = BASE_URL.split('//')[0] + '//' + 'covers.' + BASE_URL.split('//')[1]; 

        // Return the Cover ID URL if found, otherwise a placeholder
        if (book && book.cover_i) {
            return {
                title: title,
                coverUrl: `${coverURL}/b/id/${book.cover_i}-M.jpg`
            };
        } else {
            return { title: title, coverUrl: null }; // No cover found
        }

    } catch(error) {
        console.error(`Error searching for ${title}:`, error); 
        return { title: title, error: "Search failed" };
    }
}; 

// Create a method to get multiple book covers
const getMultipleCovers = async (bookList) => {
    // Map every title to a search promise
    const promises = bookList.map(title => getCoverByTitle(title));
    
    // Wait for all searches to finish
    const results = await Promise.all(promises);
    
    return results;
}


// Set up Homepaage route 
app.get("/", async (req, res) => {
  try {
    const result = (await getBooks()) || [];

    const titles = result.map((book) => book.title);

    const covers = await getMultipleCovers(titles);

    const books = result.map((book) => {
      let matchedCover = covers.find((bk) => bk.title === book.title);
      let placeholderUrl =
        "https://placehold.jp/24/cccccc/ffffff/200x300.png?text=No%20Cover%20Found";

      return {
        ...book,
        cover_image_url: matchedCover
          ? matchedCover.coverUrl
          : placeholderUrl,
      };
    });

    console.log(books);

    res.render("pages/index.ejs", {
      books: books,
      totalBooks: books.length,
      formatDate: formatDate 
    });
  } catch (error) {
    console.error("Server Error: ", error);

    res.status(500).send("Something went wrong while fetching your library.");
  }
});


// Create Add new book route
app.get("/books/new", async (req, res) => {
  const books = await getBooks(); 

  res.render("pages/add.ejs", {totalBooks: books.length, formatDate: formatDate});
}); 


// Create a post route to add a new book
app.post ("/books", async (req, res) => {
  const {title, author, date_read,rating, notes } = req.body; 

  try {
    //Perform multiple table insert, with CTE
    const result = await db.query(`
        WITH new_book AS (
            INSERT INTO books (title, author)
            VALUES($1, $2)
            RETURNING id
          ), 
          new_log AS (
            INSERT INTO reading_log (book_id, date_read, rating)
            SELECT id, $3, $4 
            FROM new_book
            RETURNING book_id
          )
            INSERT INTO summaries (note, book_read_id)
            SELECT $5, book_id
            FROM new_log; 
      `, 
      [title, author, date_read, rating, notes]
    );  

    res.redirect("/");

  } catch(err) {
    console.log('Error inserting data', err); 
    res.status(500).send("Failed to save book entry.");
  }
}); 

// Create a get method to get the edit page
app.get("/books/:id/edit", async (req, res) => {
  const books = await getBooks(); 

  const bookId = parseInt(req.params.id); 

  const book = books.find((bk) => bk.id === bookId); 

  if (!book) {
    return res.status(404).send("Book not found"); 
  }

  res.render("pages/edit.ejs", {
    books: books, 
    book: book, 
    totalBooks: books.length,
    formatDate: formatDate,
  })
})

// Start or run server 
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`)
});