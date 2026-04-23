-- Create database
CREATE DATABASE library; 

-- Create books table
CREATE TABLE books (
    id SERIAL PRIMARY KEY, 
    title VARCHAR(225) NOT NULL, 
    author VARCHAR(100) NOT NULL,
    cover_image_url TEXT UNIQUE
); 


-- Create a reading log table, default date = current date, rating should be between 1 & 5, book_id should be unique
CREATE TABLE reading_log (
    log_id SERIAL PRIMARY KEY, 
    date_read DATE NOT NULL DEFAULT CURRENT_DATE,
    rating INT CHECK(rating >= 1 AND rating <= 5),
    book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE, 
    UNIQUE(book_id)
);


-- Create a reviews, note or comments table
CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY, 
    note TEXT, 
    book_read_id NOT NULL REFERENCES reading_log(log_id)
); 


-- Add the data for just one book
INSERT INTO books (title, author) 
    VALUES('Atomic Habits', 'James Clear'); 

INSERT INTO reading_log (date_read, rating, book_id)
    VALUES('2021-11-17', 5, 1); 

INSERT INTO reviews (note, book_read_id) 
    VALUES(`
        Atomic habit is a personal development book by James Clear that teaches how to cultivate good habits 
        and eliminate bad ones using certain laws, principles and real life examples, applying them bits by bits. 
        He emphasizes developing small habits that end up paying off hugely.
    `,
    1
    ); 

-- Get the title, author, rating & review of the first book
SELECT bk.title, 
       bk.author, 
       rl.rating, 
       rv.note AS summary
FROM books AS  bk
JOIN reading_log AS rl ON bk.id = rl.book_id
JOIN reviews AS rv ON rl.book_id = rv.book_read_id; 

