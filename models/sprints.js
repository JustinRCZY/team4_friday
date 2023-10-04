const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const sprintSchema = new Schema({
    sprintname: {
        type: String,
        required: true
    },
    tasks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tasks', // Reference to the Task model
    }],
    status:{
        type:String,
        required: true
    },
    startdate:{
        type:Date,
        required: true
    },
    enddate:{
        type:Date,
        required: true
    },
    burndown:{
        type: Array,
        required: false
    }
    
}, {timestamps: true})

const Sprints = mongoose.model('Sprints',sprintSchema)


module.exports = Sprints;