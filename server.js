// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var path = require("path");

// Requiring Models
var Note = require("./models/note.js");
var Article = require("./models/article.js");

// Requiring Axios & Cheerio for scraping tools
var axios = require("axios");
var cheerio = require("cheerio");

// Setting up port to locallhost 3000
var PORT = process.env.PORT || 3000

// Express App
var app = express();

// Using morgan and body parser
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
    extended: false
}));

// Making the public a static dir
app.use(express.static("public"));

// Setting up express handlebars
var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({
    defaultLayout: "main",
    partialsDir: path.join(__dirname, "/views/layouts/partials")
}));
app.set("view engine", "handlebars");

mongoose.connect("mongodb://heroku_2sr4jntk:ruplf58fv5pnlt3dgjou1agfi3@ds049854.mlab.com:49854/heroku_2sr4jntk", { useNewUrlParser: true });



// Main Page Routes

app.get("/", function (req, res) {
    Article.find({ "saved": false }, function (error, data) {
        var hbsObject = {
            article: data
        };
        console.log(hbsObject);
        res.render("index", hbsObject);
    });
});

app.get("/saved", function (req, res) {
    Article.find({ "saved": true }).populate("notes").exec(function (error, articles) {
        var hbsObject = {
            article: articles
        };
        res.render("saved", hbsObject);
    });
});

// Scraping Routes
app.get("/scrape", function (req, res) {
    // Getting the html website for cnn articles
    axios.get("https://www.cnn.com/articles").then(function (response) {
        // Loading cheerio
        var $ = cheerio.load(response.data);
        $("div.cd__content").each(function (i, element) {

            var result = {};

            // Add the text and href of every link, and save them as properties of the result object
            result.title = $(element)
                .children("h3.cd__headline")
                .text();
            result.link = "https://www.cnn.com" + $(element)
                .find("a")
                .attr("href");
            result.summary = $(element)
                .find("span.cd__headline-text")
                .text();

                Article.create(result) 
                    .then(function(data) {
                        console.log(data);
                    })
                    .catch(function(err) {
                        return res.json(err)
                    })
                })
   
        res.send("Scrape Finished");

    });
});


// Clear unsaved routes
app.get('/clear', function(req, res) {
    Article.remove({ saved: false}, function(err, doc) {
        if (err) {
            console.log(err);
        } else {
            console.log('removed');
        }

    });
    res.redirect('/');
});

// Getting Json
app.get("/articles", function (req, res) {
    // Grab every doc in the Articles array
    Article.find({}, function (error, data) {
        // Logs errors if any
        if (error) {
            console.log(error);
        }
        // Else send the data to the browser as a json object
        else {
            res.json(data);
        }
    });
});

// Article Routes
app.get("/articles/:id", function (req, res) {

    Article.findOne({ "_id": req.params.id })
        .populate("note")
        .exec(function (error, data) {
            // Log errors if any
            if (error) {
                console.log(error);
            }
            else {
                res.json(data);
            }
        });
});


// Save Routes
app.post("/articles/save/:id", function (req, res) {
    // Using the article id to find and update the saved boolean
    Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": true })
        .exec(function (err, data) {
            // Log errors if any
            if (err) {
                console.log(err);
            }
            else {

                res.send(data);
            }
        });
});

// Routes to delete
app.post("/articles/delete/:id", function (req, res) {
    // Anything that is not saved
    Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": false, "notes": [] })

        .exec(function (err, data) {
            // Log errors if any
            if (err) {
                console.log(err);
            }
            else {
                res.send(data);
            }
        });
});


// Comments routes
app.post("/notes/save/:id", function (req, res) {
    // Creates a new note and passes the req.body to the entry
    var newNote = new Note({
        body: req.body.text,
        article: req.params.id
    });
    console.log(req.body)
    // Saves the new note to the database
    newNote.save(function (error, note) {

        if (error) {
            console.log(error);
        }
        else {
            Article.findOneAndUpdate({ "_id": req.params.id }, { $push: { "notes": note } })
            // Executes the above query
                .exec(function (err) {
                    // Logs errors if any
                    if (err) {
                        console.log(err);
                        res.send(err);
                    }
                    else {
                        res.send(note);
                    }
                });
        }
    });
});

// Routes to delete a note
app.delete("/notes/delete/:note_id/:article_id", function (req, res) {
    // Uses the note id to find and delete it
    Note.findOneAndRemove({ "_id": req.params.note_id }, function (err) {
        // Log any errors
        if (err) {
            console.log(err);
            res.send(err);
        }
        else {
            Article.findOneAndUpdate({ "_id": req.params.article_id }, { $pull: { "notes": req.params.note_id } })
                // Executes the above query
                .exec(function (err) {
                    // Log errors if any
                    if (err) {
                        console.log(err);
                        res.send(err);
                    }
                    else {
                        // Sends note to browser
                        res.send("Note Deleted");
                    }
                });
        }
    });
});

// Listening on port 3000
app.listen(PORT, function () {
    console.log("App running on port " + PORT);
});