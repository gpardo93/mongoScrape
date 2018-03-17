// require mongoose

var mongoose = require("mongoose");

//create schema class 
var Schema = mongoose.Schema;

var NoteSchema = new Schema({
    body: {
        type: String 
    },
    article: {
        type: Schema.Types.ObjectId,
        ref: "Article"
    }
});
