// Requiring mongoose
var mongoose = require("mongoose");

// Creating Schema class
var Schema = mongoose.Schema;

// Creating article schema
var ArticleSchema = new Schema({
  title: {
    type: String,
    required: true,
    unique: true
  },
  summary: {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true
  },
  saved: {
    type: Boolean,
    default: false
  },
  notes: [{
     type: Schema.Types.ObjectId,
     ref: "Note"
  }]
});

// Creates the Article model with the ArticleSchema
var Article = mongoose.model("Article", ArticleSchema);

// Exports the model
module.exports = Article;