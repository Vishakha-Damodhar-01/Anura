const express = require("express");
const path = require("path");
const collection = require("./config"); // Assuming this imports your MongoDB User Model
const bcrypt = require('bcrypt');
const fetch = require('node-fetch'); 
const mongoose = require('mongoose'); 

const app = express();
const PORT = 5000;

// --- CRITICAL PATH RESOLUTION FIX ---
// Determine the directory of the current file (src)
const currentDir = path.dirname(require.main.filename); 
// Determine the project root (C:\login) by going up one level
const projectRoot = path.join(currentDir, '..'); 
// ------------------------------------

// --- CRITICAL SETUP ---
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Tell Express to serve static files from the 'public' folder inside the project root
app.use(express.static(path.join(projectRoot, 'public'))); 

app.set("view engine", "ejs");
// FIX: Set the views directory to C:\login\views explicitly
app.set("views", path.join(projectRoot, 'views')); 
// ----------------------


// --- EXTERNAL API SETUP (SearchApi.io for Jobs) ---
const EXTERNAL_JOB_API_URL = 'https://www.searchapi.io/api/v1/search'; 
// Use the key you provided. This MUST be a valid key.
const EXTERNAL_API_KEY = 'FK9UZYp42EDCzYftgpki9wDS'; 
const BLOG_API_URL = 'https://jsonplaceholder.typicode.com/posts'; 


// --- FIX: ROBUST JOB FETCHING FUNCTION (Using google_jobs engine) ---
async function fetchJobsFromExternalAPI(query) {
    const keywords = query || 'Data Scientist, AI Engineer';
    
    // GUARANTEE: Declare jobResults with an empty array fallback right away.
    let jobResults = [];
    
    try {
        // Use the keywords directly, and the location will be searched by Google Jobs
        const googleQuery = keywords; 
        
        const queryParams = new URLSearchParams({
            engine: "google_jobs", // <--- CORRECT ENGINE FOR JOB SEARCH
            q: googleQuery,
            api_key: EXTERNAL_API_KEY,
            num: 5 
        });

        const response = await fetch(`${EXTERNAL_JOB_API_URL}?${queryParams}`);
        
        if (!response.ok) {
             // Logs the actual error body from the API
             const errorBody = await response.text();
             console.error(`[JOB FETCH ERROR] API rejected request. Status: ${response.status}. Response Body:`, errorBody);
             return [];
        }

        const externalData = await response.json();

        // Assign jobResults from the successful external data.
        jobResults = externalData.jobs_results || []; 

        if (jobResults.length > 0) {
            return jobResults.map(job => ({
                title: job.title,
                company: job.company_name || 'N/A',
                location: job.location || 'Remote',
                url: job.link
            }));
        }
        
        return [];

    } catch (error) {
        // This catch block handles network errors or JSON parsing failures.
        console.error("[JOB FETCH FATAL ERROR] Could not connect or parse JSON:", error.message);
        return [];
    }
}

// --- BLOG FETCHING FUNCTION (Simulated) ---
async function fetchBlogPosts() {
    try {
        const response = await fetch(`${BLOG_API_URL}?_limit=3`); 
        const externalData = await response.json();

        if (externalData && externalData.length > 0) {
            return externalData.map(post => ({
                title: post.title.substring(0, 50) + '...',
                body: post.body.substring(0, 100) + '...',
                url: `/blog/${post.id}` 
            }));
        }
        return [];
    } catch (error) {
        console.error("Error fetching blog data:", error);
        return [];
    }
}


// --- AUTHENTICATION ROUTES (Your Original Code) ---

app.get("/", (req, res) => {
    res.render("login");
});

app.get("/signup", (req, res) => {
    res.render("signup");
});

// Register User
app.post("/signup", async (req, res) => {
    const data = {
        name: req.body.username,
        password: req.body.password
    }
    const existingUser = await collection.findOne({ name: data.name });

    if (existingUser) {
        res.send('User already exists. Please choose a different username.');
    } else {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(data.password, saltRounds);
        data.password = hashedPassword;
        const userdata = await collection.insertMany(data);
        console.log(userdata);
        res.redirect('/'); 
    }
});

// Login user 
app.post("/login", async (req, res) => {
    try {
        const check = await collection.findOne({ name: req.body.username });
        if (!check) {
            res.send("User name cannot found")
        }
        const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);
        if (!isPasswordMatch) {
            res.send("wrong Password");
        }
        else {
            res.redirect(`/dashboard?username=${req.body.username}`);
        }
    }
    catch {
        res.send("wrong Details");
    }
});


// --- ANURA DASHBOARD ROUTE ---

app.get("/dashboard", async (req, res) => {
    const username = req.query.username || 'User'; 
    
    const jobQuery = req.query.jobRole;
    const jobListings = await fetchJobsFromExternalAPI(jobQuery); 
    const blogPosts = await fetchBlogPosts();

    const userData = {
        userEmail: username, 
        jobListings: jobListings, 
        blogPosts: blogPosts, 
        currentQuery: jobQuery || '' 
    };

    res.render("home", userData); 
});


// --- FEATURE INTEGRATION ROUTES ---

app.get("/analyze-resume", (req, res) => {
    res.render("resume_analyzer", { userEmail: 'LoggedInUser@anura.com' }); 
});

app.get("/quiz-generator", (req, res) => {
    res.render("quiz_generator", { userEmail: 'LoggedInUser@anura.com' }); 
});

app.get("/code-review", (req, res) => {
    res.render("code_review", { userEmail: 'LoggedInUser@anura.com' }); 
});

app.get("/ai-chatbot", (req, res) => {
    res.render("ai_chatbot", { userEmail: 'LoggedInUser@anura.com' }); 
});

app.get('/voice-assistant', (req, res) => res.send('<h1>AI Voice Assistant Interface Here</h1>'));
app.get('/logout', (req, res) => res.send('<h1>Logout Successful!</h1>'));


// Define Port for Application
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
});

app.get("/voice-assistant", (req, res) => {
    res.render("voice_assistant", { userEmail: 'LoggedInUser@anura.com' }); 
});