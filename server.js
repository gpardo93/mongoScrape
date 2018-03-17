var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var path = require("path");

// requiring note and article models 
var Note = require ("./models/Note.js");
var Article = require ("./models/Article.js");

// scraping tools
var request = require("request");
var cheerio = require("cheerio");

mongoose.Promise = Promise;

//define port
var port = process.env.PORT || 3000 

//initilaize express
var app = express();

//using morgan and body parser
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
    extended: false
}));

// make public static dir
app.use(express.static("public"));

// set handlebars
var exphbs = require("express-handlebars");

app.engine("handlebars" , exphbs({
    defaultLayout: "main",
    partialsDir: path.join(__dirname, "/views/layouts/partials")
}));
app.set("view engine", "handlebars");


// database config with mongoose - need to finish
mongoose.connect("mongodb://<dbuser>:<dbpassword>@ds215019.mlab.com:15019/heroku_dw8gbmd0");
var db = mongoose.connection;

//show mongoose errors
db.on("error", function(error){
    console.log("Mongoose error:", error);
});

//log success message for mongoose
db.once("open", function(){
    console.log("Mongoose connection successful.");
});

//Routes

// Get requests
app.get("/", function(req,res){
    Article.find({"saved": false}, function(error, data){
        var hbsObject = {
            article: data
        };
        console.log(hbsObject);
        res.render("home", hbsObject);
    });
});

app.get("/saved", function(req, res){
    Article.find({"saved":true}).populate("notes").exec(function(error, articles){
        var hbsObject = {
            article: articles
        };
        res.render("saved", hbsObject);
    });
});

app.get("/scrape", function(req, res) {
request("https://nytimes.com/", function(error, response, html){
    var $ = cheerio.load(html);
    $("article").each(function(i, element){
        var result = {};

        result.title = $(this).children("h2").text();
        result.summary = $(this).children(".summary").text();
        result.link = $(this).children("h2").children("a").attr("href");

        var entry = new Article(result);
        entry.save(function(err, doc){
            if(err){
                console.log(err);
            } else {
                console.log(doc);
            }
        });

    });
    res.send("scrape complete");
});
});

// getting articles scraped from mongodb
app.get("/articles", function(req,res){
    Article.find({}, function(error, doc){
        if (error){
            console.log(error);
        } else {
            res.json(doc);
        }
    });
});

// getting articles by it's objectid
app.get("/articles/:id", function(req, res){
    Article.findOne({"_id": req.params.id})
    .populate("note")
    .exec(function(error, doc){
        if(error){
            console.log(error);
        } else {
            res.json(doc);
        }
    });
});

// delete an article
app.post("/articles/delete/:id", function(req, res){
    Article.findOneAndUpdate({ "_id": req.params.id}, { " saved": true})
    .exec(function(err, doc){
        if (err){
            console.log(err);
        } else {
            res.send(doc);
        }
    });
});

app.post("/articles/delete/:id", function(req, res){
    Article.findOneAndUpdate({ "_id": req.params.id}, {"saved": false, "notes":[]})
    .exec(function(err,doc){
        if (err){
            console.log(err);

        }else {
            res.send(doc);
        }
    });
});

//creating a new note
app.post("/notes/save/:id", function (req, res){
    var newNote = new Note ({
        body: req.body.text,
        article: req.params.id
    });
    console.log(req.body)
    newNote.save(function(error, note){
        if (error){
            console.log(error);
        } else {
            Article.findOneAndUpdate({ "_id": req.params.id}, {$push: { "notes": note}} )
            .exec(function(err){
                if(err){
                    console.log(err);
                    res.send(err);
                } else {
                    res.send(note);
                }
            });

        }
    });
});

// deleting a note

app.delete("/notes/delete/:note_id/:article_id", function(req, res){
    Note.findOneAndUpdate({ "_id": req.params.note_id}, function(err){
        if (err) {
            console.log(err);
            res.send(err);
        } else {
            Article.findOneAndUpdate({ "_id": req.params.id}, {$pull: {"notes": req.params.note_id}})
            .exec(function(err){
                if (err){
                    console.log(err);
                    res.send(err);
                } else {
                    res.send("Note Deleted");
                }
            });
        }
    });
});

app.listen(port, function(){
    console.log("App running on port " + port);
});