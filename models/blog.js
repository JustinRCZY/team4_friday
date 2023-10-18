const mongoose = require('mongoose');
const Schema = mongoose.Schema;


// creates an object with type string and set required to true
const blogSchema = new Schema({
    tasknames: {
        type: String,
        required: true
    },
    tags:{
        type: [Array],
        required: true
    },
    priority:{
        type:String,
        required: true
    },
    storypoint:{
        type:String,
        required: true
    },
    stage:{
        type:String,
        required: true
    },
    status:{
        type:String,
        required: true
    },
    member:{
        type:[Array],
        required: true
    },
    type:{
        type:String,
        required: true
    },
    description:{
        type:String,
        required: true
    },
    visibility:{
        type:Boolean,
        default: true
    },
    hours:{
        type:[Array],
        required:false
    }
}, {timestamps: true})




// this is a constructor for the above, we must use tasks which is the name in our mongoAtlas database
const Blog = mongoose.model('Tasks',blogSchema)

module.exports = Blog;
