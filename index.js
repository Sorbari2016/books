// Backend Logic

// IMPORTS
import express from "express"; 
import dotenv from "dotenv"; 
import axios from "axios"; 
import pg from "pg"; 
import bodyParser from "body-parser";
import methodOverride from "method-override"; 

// Set up dotenv to process env variables
dotenv.config(); 

// Create express app
const app = express(); 

// Create port for app to listen to
const PORT = 3000; 

// Use middlewares, body-parser, method override 
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method')); // Helps the browser make the method, a put 

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
const getBooks = async (sortBy) => {
    // define allowed sorting methods
    let orderByTypes = {
      recent: "rl.date_read DESC",
      rating: "rl.rating DESC",
      title: "bk.title ASC"
    }

    // Pick a sorting method
    let orderBy = orderByTypes[sortBy] || "bk.id DESC"; 
  
    // query database
    let result = await db.query(`
        SELECT 
            bk.*, 
            TO_CHAR(rl.date_read,'YYYY-MM-DD') AS date_read, 
            rl.rating,
            sm.note AS summary
        FROM books AS bk
        JOIN reading_log AS rl ON bk.id = rl.book_id
        JOIN summaries AS sm ON bk.id = sm.book_id
        ORDER BY ${orderBy};
    `
      ); 
    
    return result.rows;
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
    const sort = req.query.sort || 'recent';
    
    const result = (await getBooks(sort)) || [];
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
      showHero: true, 
    });
  } catch (error) {
    console.error("Server Error: ", error);

    res.status(500).send("Something went wrong while fetching your library.");
  }
});


// Create Add new book route
app.get("/books/new", async (req, res) => {
  const books = await getBooks(); 

  res.render("pages/add.ejs", {
    totalBooks: books.length, 
    showHero: false,
  });
}); 


// Create a post route to add a new book
app.post ("/books", async (req, res) => {
  const {title, author, date_read,rating, notes } = req.body; 

  try {
    //Perform multiple table insert, with CTE
    await db.query(`
        WITH new_book AS (
            INSERT INTO books (title, author)
            VALUES($1, $2)
            RETURNING id
          ), 
          new_log AS (
            INSERT INTO reading_log (book_id, date_read, rating)
            SELECT id, $3, $4 
            FROM new_book
          )
            INSERT INTO summaries (book_id, note, )
            SELECT book_id, $5
            FROM new_book; 
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
    showHero: false,
  })
}); 

// Create a put method to edit a book 
app.put("/books/:id", async (req, res) => {

  const {title, author, date_read,rating, notes } = req.body; 

  const bookId = parseInt(req.params.id); 
  
  try {
    await db.query(
      ` WITH updated_book AS (
          UPDATE books
          SET title = $1, 
              author = $2
          WHERE id = $3
          RETURNING id 
      ),
         updated_log AS (
          UPDATE reading_log
          SET date_read = $4,
              rating = $5
          WHERE book_id = $3 -- Link log to the updated book
        )
          UPDATE summaries
          SET note = $6
          WHERE book_id = $3;  
    
    `,
      [title, author, bookId, date_read, rating, notes]
    )
  
  res.redirect("/");

  } catch(error) {
    console.error('Error updating data', error); 
    res.status(500).send("Failed to update book entry.");
  } 
}); 

// Create a delete method to delete a book
app.delete("/books/:id", async (req, res) => {
  const bookId = parseInt(req.params.id); 

  try {
  await db.query("DELETE FROM books WHERE id = $1;", [bookId]);

  res.redirect("/"); 

  } catch (error) {
    console.error('Cannot delete book', error); 
    res.status(500).send("Could not delete book");
  }
})

// Start or run server 
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`)
});