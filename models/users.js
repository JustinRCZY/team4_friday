const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const userSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password:{
        type:String,
        required: true
    },
    admin:{
        type:String,
        default: "false",
        required: false
    },
    currentuser:{
        type:String,
        default: "false",
        required: false
    }
}, {timestamps: true})

const Users = mongoose.model('Users',userSchema)


module.exports = Users;