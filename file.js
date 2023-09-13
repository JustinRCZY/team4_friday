const fs = require('fs')

const readStream = fs.createReadStream('./docs/blog.txt')
const writeStream = fs.createWriteStream('./docs/blog1.txt')

readStream.pipe(writeStream)

