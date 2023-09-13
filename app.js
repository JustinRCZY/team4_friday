const express = require('express')
const morgan = require('morgan')
const mongoose = require('mongoose')
const Blog = require('./models/blog')
const { identity } = require('lodash')

//connect to mongoDB
const dbURI = 'mongodb+srv://myin0010:fit2101efficiency@cluster0.pci6sal.mongodb.net/?retryWrites=true&w=majority'



// express app
const app = express();
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(result => app.listen(3000))
  .catch(err => console.log(err));


// register view engine
app.set('view engine', 'ejs');


// middleware & static files
app.use(express.static('public'));
app.use(express.urlencoded({extended: true}))
app.use(morgan('dev'));


app.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});


// if we go to localhost:300/add-blog it automatically creates blogs
// refer to models/blog.js
app.get('/add-blog', (req, res) => {
  const blog = new Blog({
    title: 'new blog',
    snippet: 'about my new blog',
    body: 'more about my new blog'
  })
  blog.save()
    .then(result => {
      res.send(result);
    })
    .catch(err => {
      console.log(err);
    });
});


// when we go to all-blogs, we find everything and send the results
// this isn't really necessary for our code
app.get('/all-blogs', (req, res) => {
  Blog.find()
    .then(result => {
      res.send(result);
    })
    .catch(err => {
      console.log(err);
    });
});




// this is just to demonstrate finding data with their unique ID
app.get('/single-blog', (req, res) => {
  Blog.findById('5ea99b49b8531f40c0fde689')
    .then(result => {
      res.send(result);
    })
    .catch(err => {
      console.log(err);
    });
});



// this is just a case where if localhost:3000/ , then we just send it to localhost:3000/blogs
app.get('/', (req, res) => {
  res.redirect('/blogs');
});



// for ejs files, we use render to update stuff
app.get('/about', (req, res) => {
  res.render('about', { title: 'About' });
});



// blog routes
app.get('/blogs/create', (req, res) => {
  res.render('create', { title: 'Create a new blog' });
});



// whenever /blogs has been called
// we view all the blogs 
app.get('/blogs', (req, res) => {
  Blog.find()
    .then(result => {
      res.render('index', { blogs: result, title: 'All blogs' });
    })
    .catch(err => {
      console.log(err);
    });
});

let sortByDate = -1; // Initialize with -1 for descending order

app.get('/sort-by-date', (req, res) => {
  // Toggle the sorting order between -1 and 1
  const sortedByDate = sortByDate === -1 ? 1 : -1;

  Blog.find()
    .sort({ createdAt: sortedByDate }) // Sort by 'createdAt' field
    .then(result => {
      res.render('index', { blogs: result, title: 'All blogs' });

      sortByDate = sortByDate === -1 ? 1 : -1;
    })
    .catch(err => {
      console.log(err);
    });
});


let sortPriority = -1; // Initialize with -1 for descending order

app.get('/sort', (req, res) => {
  Blog.find()
    .then(result => {
      // Define the priority order
      const priorityOrder = sortPriority === -1 ? ['Low', 'Medium', 'Important', 'Urgent'] : ['Urgent', 'Important', 'Medium', 'Low'];

      // Sort the result array based on the priority order
      result.sort((a, b) => {
        const priorityA = priorityOrder.indexOf(a.priority);
        const priorityB = priorityOrder.indexOf(b.priority);
        return priorityA - priorityB;
      });

      // Toggle the sorting order between -1 and 1
      sortPriority = sortPriority === -1 ? 1 : -1;

      res.render('index', { blogs: result, title: 'All blogs' });
    })
    .catch(err => {
      console.log(err);
    });
});



// post is used to create stuff, we can see that by us invoking the blog constructor
app.post('/blogs', (req,res)=>{
  const blog = new Blog(req.body)

  blog.save().then((result)=>{
    res.redirect('./blogs')
  }).catch((err)=>console.log(err))
})


// this is to view the details of the objects, for example if we were to click on a task
// we can view the details, we do this by extracting the unique id of the dataset
// if we were to view the details of task one, it would take us to localhost:3000/blogs/asdfasdfasdf
// note that "asdfasdfasdf" is the id 
app.get('/blogs/:id', (req, res) => {
  const id = req.params.id;
  Blog.findById(id)
    .then(result => {
      res.render('details', { blog: result, title: 'Blog Details' });
    })
    .catch(err => {
      console.log(err);
    });
});


// this is a bit more complicated, we are still deleting by their id
// but for delete, we have to return a redirect in a form of JSON
// refer to details.ejs for further explanation
app.delete('/blogs/:id', (req,res)=>{
  const id = req.params.id;
  Blog.findByIdAndDelete(id)
  .then(result => {
    // we use this redirect in front end (s1)
    res.json({redirect: '/blogs'})
  }).catch((err)=>console.log(err))
})


// 404 page
app.use((req, res) => {
  res.status(404).render('404', { title: '404' });
});