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


-- Create a summary, note or comments table
CREATE TABLE summaries (
    summary_id SERIAL PRIMARY KEY, 
    note TEXT, 
    book_read_id INT NOT NULL REFERENCES reading_log(log_id)
); 


-- Add the data for just one book
INSERT INTO books (title, author) 
    VALUES('Atomic Habits', 'James Clear'); 

INSERT INTO reading_log (date_read, rating, book_id)
    VALUES('2021-11-17', 5, 1); 

INSERT INTO summaries (note, book_read_id) 
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
       sm.note AS note
FROM books AS  bk
JOIN reading_log AS rl ON bk.id = rl.book_id
JOIN summaries AS sm ON rl.book_id = sm.book_read_id; 

-- RENOVATION
-- AVOID long chaining from reading_log to summaries, rather let both tables point directly to books table.
-- 1. Remove old linking structure
ALTER TABLE summaries
DROP CONSTRAINT summaries_book_read_id_fkey

-- 2. Rename and adjust the name in the summaries table
ALTER TABLE summaries RENAME COLUMN book_read_id TO book_id;

-- 3. Point summary directly to books with CASCADE
ALTER TABLE summaries
ADD CONSTRAINT summaries_book_id_fkey
FOREIGN KEY (book_id) REFERENCES books(id)
ON DELETE CASCADE;

-- Re-write other queries
-- 1. Get book details for front-end
SELECT 
        bk.*, 
        rl.date_read, 
        rl.rating,
        sm.note AS summary
FROM books AS bk
JOIN reading_log AS rl ON bk.id = rl.book_id
JOIN summaries AS sm ON bk.id = sm.book_id;

-- 2. Insert into all three relations at the same time
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
            INSERT INTO summaries (book_id, note)
            SELECT id, $5
            FROM new_book;


-- 3. Update multiple tables as well, using a CTE
WITH updated_book AS (
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
          WHERE book_id = $3-- Link log to the updated book
        )
          UPDATE summaries
          SET note = $6
          WHERE book_id = $3;

-- Delete now simply becomes
DELETE FROM books 
WHERE id = 1;