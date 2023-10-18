const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const tableSchema = new Schema({
    name: {
        type: String,
        required: false
    },
    array: {
        type: [Array],
        required: false
    },
}, {timestamps: true})

const Tables = mongoose.model('Tables',tableSchema)


module.exports = Tables;