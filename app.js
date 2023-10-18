const express = require('express')
const morgan = require('morgan')
const mongoose = require('mongoose')
const Blog = require('./models/blog')
const Sprints = require('./models/sprints')
const Tables = require('./models/table')
const Users = require('./models/users')
const bodyParser = require('body-parser'); 
const { identity } = require('lodash')

//connect to mongoDB
const dbURI = 'mongodb+srv://myin0010:fit2101efficiency@cluster0.pci6sal.mongodb.net/?retryWrites=true&w=majority'

const port = process.env.PORT || 3000;

// express app
const app = express();
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(result => app.listen(port))
  .catch(err => console.log(err));


// register view engine
app.set('view engine', 'ejs');


// middleware & static files
app.use(express.static('public'));
app.use(express.urlencoded({extended: true}))
app.use(bodyParser.json());


app.use(morgan('dev'));


app.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});



// You can comment this or uncomment this block out, once u uncomment this,
// whenever you run the app, it will add this sample data to the mongoDB. u can use
// this for testing 

// const newSprint = new Sprints({
//   sprintname: 'New Sprint',
//   tasks: [
//     {
//       tasknames: 'Blog Post 1',
//       tags: ['tag1', 'tag2'],
//       priority: 'High',
//       storypoint: '5',
//       stage: 'Planning',
//       status: 'In Progress',
//       member: ['John', 'Alice'],
//       type: 'Technical',
//       description: 'This is the first blog post.',
//     },
//     {
//       tasknames: 'Blog Post 2',
//       tags: ['tag2', 'tag3'],
//       priority: 'Medium',
//       storypoint: '3',
//       stage: 'Drafting',
//       status: 'Not Started',
//       member: ['Bob', 'Eve'],
//       type: 'Non-Technical',
//       description: 'This is the second blog post.',
//     },
//   ],
//   status: 'Active',
//   startdate: new Date('2023-10-02T14:30:00.000Z'),
//   enddate: new Date('2023-10-10T14:30:00.000Z'),
// });



// newSprint.save()
//   .then(savedSprint => {
//       console.log('Sprint saved:', savedSprint);
//   })
//   .catch(error => {
//       console.error('Error saving sprint:', error);
//   });


const currentuser = Users.findOne({ currentuser: "true" });
const alluser = Users.find();
const admin = Users.findOne({ admin: "true" });
const members = Users.find({ admin: "false" });


let colorBlind = false 


app.get('/colorblind', (req, res) => {
  // Toggle the colorBlind value
  colorBlind = !colorBlind;

  // Redirect to the referring page or a default page if the referrer is not available
  const referer = req.header('Referer');
  if (referer) {
      res.redirect(referer);
  } else {
      res.redirect('/'); // This redirects to the root of your application; change this if needed
  }
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


app.get('/delete-table-reset', async (req, res) => {
  try {
    const user = await Tables.findOne();

    if (!user) {
      res.status(404).send("User not found");
      return;
    }

    // Reset the 2D array property to an empty array
    user.array = [];

    // Save the changes
    await user.save();

    res.send("2D array reset successfully!");
  } catch (error) {
    console.error('Error resetting the 2D array:', error);
    res.status(500).send('Internal server error');
  }
});

app.post('/newmember', async (req, res) => {
  try {
      // Capture username, email, and password from the form
      const { username, email, password } = req.body;
      console.log(req.body);

      // Check if user with the same email already exists
      const existingUser = await Users.findOne({ email });
      if (existingUser) {
          console.log("User with this email already exists.");
          return res.render('newmember', { errorMessage: 'Email already in use.' });
      }

      // Create a new user with the provided username, email, and password
      const newUser = new Users({
          username,
          email,
          password
          // Add other fields here if your User schema has more fields
      });

      await newUser.save();  // Save the new user to the database

      console.log("New user created successfully!");

      // Redirect to /members after the user has been successfully created
      res.redirect('/members');
  } catch (error) {
      console.error('Error during user creation:', error);
      res.status(500).send('Internal Server Error');
  }
});

// POST request to handle login form submission
app.post('/loginpage', async (req, res) => {
  try {
    // Capture email and password from the form
    const { email, password } = req.body;
    console.log(req.body);
    console.log(email);
    console.log(password);
    // Find the user with the provided email and password
    const user = await Users.findOne({ email, password });
    
    if (user) {
      console.log("User is found");

      // Set all users' currentuser property to false
      await Users.updateMany({}, { currentuser: "false" });

      // Now, set the currentuser property of this user to true
      user.currentuser = "true";
      await user.save();

      // If a user is found, redirect to /blogs
      res.redirect('/blogs');
    } else {
      console.log("User is not found");
      // If no user is found, render the login page with an error message
      res.render('loginpage', { errorMessage: 'Invalid email or password.' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send('Internal Server Error');
  }
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

app.route('/test/:id')
  .get((req, res) => {
    const id = req.params.id;
    
    Blog.findById(id)
      .then(result => {
        res.render('edit', { blog: result, title: 'Edit Blog',colorBlind });
      })
      .catch(err => {
        console.log(err);
      });
  })
  .post((req, res) => {
    const id = req.params.id;
    // Update the blog post in the database with the new values from req.body
    Blog.findByIdAndUpdate(id, req.body)
      .then(result => {
        res.redirect('/blogs/' + id); // Redirect to the updated post's details page
      })
      .catch(err => {
        console.log(err);
      });
  });

  app.route('/edittask/:id')
  .get(async (req, res) => {
    const id = req.params.id;
    try {
      // Fetch the blog task by ID
      const result = await Blog.findById(id);

      // Find the sprint that contains the current blog task
      const sprint = await Sprints.findOne({ tasks: id });
      const currentuser = await Users.findOne({ currentuser: "true" });
const alluser = await Users.find();
const admin = await Users.find({ admin: false });

      res.render('edittasks', { blog: result, sprint: sprint, title: 'Edit Blog', currentuser:currentuser,alluser:alluser,admin:admin,colorBlind });
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal server error');
    }
  })
  .post(async (req, res) => {
    const id = req.params.id;
    const updatedData = req.body;

    try {
      // Fetch the existing blog task
      const existingTask = await Blog.findById(id);

      if (existingTask) {
        // Find the sprint that contains the current blog task
        const sprint = await Sprints.findOne({ tasks: id });

        // Get the current date
        const currentDate = new Date();

        // Calculate the index based on the date and date range
        const startDate = new Date(sprint.startdate);
        const endDate = new Date(sprint.enddate);
        const numberOfDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const currentIndex = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));

        console.log(numberOfDays, currentIndex)

        // Calculate the difference in story points
        const originalStoryPoints = parseInt(existingTask.storypoint, 10);
        const updatedStoryPoints = parseInt(updatedData.storypoint, 10);
        const storyPointDifference = originalStoryPoints - updatedStoryPoints;

        console.log(updatedStoryPoints, storyPointDifference, existingTask.storypoint, updatedData.storypoint)



        // Fetch the current burndown array of the sprint
        const burndownArray = sprint.burndown;

        console.log(updatedData.status,existingTask.status)

        // Update the burndown array at the corresponding index for tasks with status not "Completed"
        if (currentIndex < numberOfDays) {
          // Update the current index and subsequent indices with the decreased value
          for (let i = (currentIndex < 0) ? 0 : currentIndex; i < numberOfDays; i++) {
            // Check if the task status is not "Completed" before updating
            if (updatedData.status == "Completed" && existingTask.status != "Completed") {
              burndownArray[i] -= existingTask.storypoint
            } else if (updatedData.status != "Completed" && existingTask.status == "Completed") {
              burndownArray[i] += originalStoryPoints;
            } else if (updatedData.status == existingTask.status){
              burndownArray[i] -= storyPointDifference;
            }
          }
        }

        console.log(burndownArray)

        // Update the blog task in the database with the new values from req.body
        await Blog.findByIdAndUpdate(id, updatedData);

        // Update the burndown array in the sprint document
        await Sprints.updateOne({ tasks: id }, { burndown: burndownArray });

        // Redirect to the updated post's details page
        res.redirect('/scrumboard/task/' + id);
      } else {
        // Handle the case when the task is not found
        res.status(404).send('Task not found');
      }
    } catch (err) {
      console.error('Error updating task:', err);
      // Handle other errors if needed
      res.status(500).send('Internal server error');
    }
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
  res.redirect('/loginpage');
});


app.get('/loginpage', (req, res) => {
  res.render('loginpage', { title: 'About',colorBlind });
});

app.get('/addmember', (req, res) => {
  res.render('newmember', { title: 'About',currentuser:currentuser, admin:admin,alluser:alluser,colorBlind});
});



app.get('/changepassword/:id', async (req, res) => {
  try {
    // Use await here to get the user document
    let user = await Users.findById(req.params.id);

    // Check if the user was found
    if (!user) {
        return res.status(404).send('User not found.');
    }

    const [currentUser, admin, allUsers] = await Promise.all([
      Users.findOne({ currentuser: "true" }),
      Users.findOne({ admin: "true" }),
      Users.find({ admin: "false" })
    ]);

    // Now you can render the page and pass the user object
    res.render('password', { title: 'Change Password', user: user, currentuser: currentUser, admin: admin, alluser: allUsers,colorBlind });
  } catch (error) {
      console.error('Error retrieving user:', error);
      res.status(500).send('Server error.');
  }
});


// for ejs files, we use render to update stuff
app.get('/about', (req, res) => {
  res.render('about', { title: 'About',currentuser:currentuser, admin:admin,alluser:alluser,colorBlind });
});

app.get('/filter', (req, res) => {
  res.render('filter', { title: 'About',currentuser:currentuser, admin:admin,alluser:alluser,colorBlind });
});

app.get('/datepage', async (req, res) => {
  try {
    currentSort = false;
    sortByDate = true;

    const [blogs, admin, members, currentUser, table, earliestSprint, latestSprint] = await Promise.all([
      Blog.find(),
      Users.findOne({ admin: "true" }),
      Users.find({ admin: "false" }),
      Users.findOne({ currentuser: "true" }),
      Tables.findOne(),
      Sprints.find().sort('startdate').limit(1),
      Sprints.find().sort('-enddate').limit(1)
    ]);

    // Extract dates and convert to JavaScript Date objects
    const start = new Date(earliestSprint[0].startdate);
    const end = new Date(latestSprint[0].enddate);
    const startindex = 0;
    const endindex = (end - start)/(1000 * 60 * 60 * 24)
    console.log(startindex,endindex)

    res.render('date', { 
      blogs: blogs, 
      admin: admin, 
      members: members,
      currentUser: currentUser,
      title: 'All blogs', 
      sortPriority, 
      sortByDate, 
      currentSort,colorBlind,table,start,end,startindex,endindex
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});


app.post('/filteredcontribution', async (req, res) => {
  try {
    // Extract 'start' and 'end' from the body and convert to Date objects
    const start = new Date(req.body.startdate);
    const end = new Date(req.body.enddate);

    // Retrieve the earliest start date from Sprints
    const earliestSprint = await Sprints.find().sort('startdate').limit(1);
    if (!earliestSprint || !earliestSprint[0]) {
      return res.status(404).send('No sprints found.');
    }
    const subtractor = new Date(earliestSprint[0].startdate);

    // Subtract the start and end dates from the subtractor to get startindex and endindex
    const startindex = (start - subtractor)/(1000 * 60 * 60 * 24);
    const endindex = (end - subtractor)/(1000 * 60 * 60 * 24);

    // Fetch the required data
    const [blogs, admin, members, currentUser, table] = await Promise.all([
      Blog.find(),
      Users.findOne({ admin: "true" }),
      Users.find({ admin: "false" }),
      Users.findOne({ currentuser: "true" }),
      Tables.findOne()
    ]);

    // Render the page with the calculated indices and the fetched data
    res.render('avgcontribution', {
      startindex,
      endindex,
      blogs,
      admin,
      members,
      currentUser,
      table,start,end,colorBlind
    });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send('Server error.');
  }
});

app.post('/changepassword/:id', async (req, res) => {
  const userId = req.params.id;
  const newPassword = req.body.password;

  try {
      let user = await Users.findById(userId);
      console.log(user.username);
      if (!user) {
          return res.status(404).send('User not found.');
      }

      user.password = newPassword; // Here you'd ideally hash the password before saving
      await user.save();

      res.redirect('/members'); // Redirect after changing the password

  } catch (error) {
      console.error('Error updating password:', error);
      res.status(500).send('Server error.');
  }
});



app.post('/filteredindex', async (req, res) => {
  try {
    const selectedTags = req.body.selectedTags.split(','); // Split the comma-separated string into an array of tag strings
    console.log(selectedTags);

    // Convert selectedTags into a 2D array
    const selectedTags2D = selectedTags.map(tag => [tag]);

    console.log('Selected Tags 2D:', selectedTags2D);

    // Fetch Blog objects that have at least one of the selected tags within the arrays
    const filteredBlogs = await Blog.find({ tags: { $in: selectedTags2D } }).exec();
    console.log(filteredBlogs);

    // Render the filteredindex.ejs template and pass the filtered Blogs
    res.render('filteredindex', { blogs: filteredBlogs, title: 'Filtered Index', sortPriority, sortByDate, currentSort,currentuser:currentuser, admin:admin,alluser:alluser });
  } catch (error) {
    console.error('Error fetching filtered Blogs:', error);
    // Handle the error if needed
    res.status(500).send('Internal server error');
  }
});





app.get('/blogs/create', async (req, res) => {
  try {
    const [currentUser, admin, allUsers] = await Promise.all([
      Users.findOne({ currentuser: "true" }),
      Users.findOne({ admin: "true" }),
      Users.find({ admin: "false" })
    ]);

    res.render('create', { 
      title: 'Create a new blog',
      currentuser: currentUser, 
      admin: admin, 
      alluser: allUsers,colorBlind
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal server error.');
  }
});

app.get('/loginpage', async (req, res) => {
  try {
    const [currentUser, admin, allUsers] = await Promise.all([
      Users.findOne({ currentuser: "true" }),
      Users.findOne({ admin: "true" }),
      Users.find({ admin: "false" })
    ]);

    res.render('loginpage', { 
      title: 'Log In',
      currentuser: currentUser, 
      admin: admin, 
      alluser: allUsers ,colorBlind
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal server error.');
  }
});





// app.route('/scrumboard/createSprint')
//   .get((req, res) => {
//   // Fetch the entire Blog objects
//   Blog.find() // No need to specify fields, it fetches all fields by default
//     .then(blogTasks => {
//       res.render('createSprint', { title: 'Create a new sprint', blogTasks });
//     })
//     .catch(err => {
//       console.log(err);
//     });
// })

app.route('/scrumboard/createSprint')
  .get(async (req, res) => {
    try {
      const [blogTasks, currentUser, admin, allUsers] = await Promise.all([
        Blog.find(),
        Users.findOne({ currentuser: "true" }),
        Users.findOne({ admin: "true" }),
        Users.find({ admin: "false" })
      ]);

      res.render('createSprint', { 
        title: 'Create a new sprint', 
        blogTasks: blogTasks,
        currentuser: currentUser, 
        admin: admin, 
        alluser: allUsers,colorBlind 
      });
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal server error.');
    }
  });


// app.route('/test/:id')
//   .get((req, res) => {
//     const id = req.params.id;
//     Blog.findById(id)
//       .then(result => {
//         res.render('edit', { blog: result, title: 'Edit Blog' });
//       })
//       .catch(err => {
//         console.log(err);
//       });
//   })
  // .post((req, res) => {
  //   const id = req.params.id;
  //   // Update the blog post in the database with the new values from req.body
  //   Blog.findByIdAndUpdate(id, req.body)
  //     .then(result => {
  //       res.redirect('/blogs/' + id); // Redirect to the updated post's details page
  //     })
  //     .catch(err => {
  //       console.log(err);
  //     });
  // });





// whenever /blogs has been called
// we view all the blogs 
app.get('/blogs', async (req, res) => {
  try {
    currentSort = false;
    sortByDate = true;

    const [blogs, currentUser, admin, allUsers] = await Promise.all([
      Blog.find(),
      Users.findOne({ currentuser: "true" }),
      Users.findOne({ admin: "true" }),
      Users.find({ admin: "false" })
    ]);

    res.render('index', { 
      blogs: blogs, 
      title: 'All blogs', 
      sortPriority, 
      sortByDate, 
      currentSort,
      currentuser: currentUser, 
      admin: admin, 
      alluser: allUsers,colorBlind 
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal server error.');
  }
});


app.get('/members', async (req, res) => {
  try {
    const currentUser = await Users.findOne({ currentuser: "true" });

      const [admin, members, blogs] = await Promise.all([
        Users.findOne({ admin: "true" }),
        Users.find({ admin: "false" }),
        Blog.find()
      ]);

      res.render('adminmembers', { 
        blogs: blogs, 
        admin: admin,  // Admin user
        members: members,  // Non-admin members
        currentUser: currentUser, 
        title: 'All blogs', colorBlind
        //... (your other variables like sortPriority, sortByDate, currentSort)
      });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});


app.get('/contribution', async (req, res) => {
  try {
    currentSort = false;
    sortByDate = true;

    const [blogs, admin, members, currentUser, table, earliestSprint] = await Promise.all([
      Blog.find(),
      Users.findOne({ admin: "true" }),
      Users.find({ admin: "false" }),
      Users.findOne({ currentuser: "true" }),
      Tables.findOne(),
      Sprints.find().sort('startdate').limit(1),
    ]);

    const start = new Date(earliestSprint[0].startdate);

    res.render('contribution', { 
      blogs: blogs, 
      admin: admin, 
      members: members,
      currentUser: currentUser,
      title: 'All blogs', 
      sortPriority, 
      sortByDate, 
      currentSort,colorBlind,table,start
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get('/avgcontribution', async (req, res) => {
  try {
    currentSort = false;
    sortByDate = true;

    const [blogs, admin, members, currentUser, table, earliestSprint, latestSprint] = await Promise.all([
      Blog.find(),
      Users.findOne({ admin: "true" }),
      Users.find({ admin: "false" }),
      Users.findOne({ currentuser: "true" }),
      Tables.findOne(),
      Sprints.find().sort('startdate').limit(1),
      Sprints.find().sort('-enddate').limit(1)
    ]);

    // Extract dates and convert to JavaScript Date objects
    const start = new Date(earliestSprint[0].startdate);
    const end = new Date(latestSprint[0].enddate);
    const startindex = 0;
    const endindex = (end - start)/(1000 * 60 * 60 * 24)
    console.log(startindex,endindex)

    res.render('avgcontribution', { 
      blogs: blogs, 
      admin: admin, 
      members: members,
      currentUser: currentUser,
      title: 'All blogs', 
      sortPriority, 
      sortByDate, 
      currentSort,colorBlind,table,start,end,startindex,endindex
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});


let sortByDate = true; // Initialize with -1 for descending order

let currentSort = true

app.get('/sort-by-date', async (req, res) => {
  try {
    // Toggle the sorting order between -1 and 1
    const sortedByDate = 1;
    currentSort = false;
    sortByDate = true;

    const [blogs, admin, members, currentUser] = await Promise.all([
      Blog.find().sort({ createdAt: sortedByDate }),  // Sort by 'createdAt' field
      Users.findOne({ admin: "true" }),
      Users.find({ admin: "false" }),
      Users.findOne({ currentuser: "true" })
    ]);

    res.render('index', { 
      blogs: blogs, 
      admin: admin, 
      members: members,  // Assuming you want to include the non-admin members
      currentuser: currentUser, 
      title: 'All blogs', 
      sortPriority, 
      sortByDate, 
      currentSort,
      currentuser: currentUser, // Pass the current user with `currentuser: "true"`
      alluser: members,colorBlind
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get('/sort-by-date2', async (req, res) => {
  try {
    // Toggle the sorting order between -1 and 1
    const sortedByDate = -1;
    currentSort = false;
    sortByDate = false;

    const [blogs, admin, members, currentUser] = await Promise.all([
      Blog.find().sort({ createdAt: sortedByDate }),  // Sort by 'createdAt' field
      Users.findOne({ admin: "true" }),
      Users.find({ admin: "false" }),
      Users.findOne({ currentuser: "true" })
    ]);

    res.render('index', { 
      blogs: blogs, 
      admin: admin, 
      members: members,  // Assuming you want to include the non-admin members
      currentuser: currentUser, 
      title: 'All blogs', 
      sortPriority, 
      sortByDate, 
      currentSort,
      colorBlind,
      currentuser: currentUser, // Pass the current user with `currentuser: "true"`
      alluser: members  // Assuming `alluser` should be the non-admin members list
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});


let sortPriority = true; // Initialize with -1 for descending order

app.get('/sort', async (req, res) => {
  try {
    const [blogs, admin, members, currentUser] = await Promise.all([
      Blog.find(),
      Users.findOne({ admin: "true" }),
      Users.find({ admin: "false" }),
      Users.findOne({ currentuser: "true" })
    ]);

    // Define the priority order
    const priorityOrder = ['Low', 'Medium', 'Important', 'Urgent'];
    currentSort = true;

    // Sort the result array based on the priority order
    blogs.sort((a, b) => {
      const priorityA = priorityOrder.indexOf(a.priority);
      const priorityB = priorityOrder.indexOf(b.priority);
      return priorityA - priorityB;
    });

    sortPriority = true;

    res.render('index', { 
      blogs: blogs, 
      admin: admin, 
      members: members,
      currentuser: currentUser, 
      title: 'All blogs', 
      sortPriority, 
      sortByDate, 
      currentSort,colorBlind 
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get('/sort2', async (req, res) => {
  try {
    const [blogs, admin, members, currentUser] = await Promise.all([
      Blog.find(),
      Users.findOne({ admin: "true" }),
      Users.find({ admin: "false" }),
      Users.findOne({ currentuser: "true" })
    ]);

    // Define the priority order
    const priorityOrder = ['Urgent', 'Important', 'Medium', 'Low'];
    currentSort = true;

    // Sort the result array based on the priority order
    blogs.sort((a, b) => {
      const priorityA = priorityOrder.indexOf(a.priority);
      const priorityB = priorityOrder.indexOf(b.priority);
      return priorityA - priorityB;
    });

    sortPriority = false;

    res.render('index', { 
      blogs: blogs, 
      admin: admin, 
      members: members,
      currentuser: currentUser, 
      title: 'All blogs', 
      sortPriority, 
      sortByDate, 
      currentSort,colorBlind
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});



// post is used to create stuff, we can see that by us invoking the blog constructor
app.post('/blogs', (req,res)=>{
  const blog = new Blog(req.body)

  blog.save().then((result)=>{
    res.redirect('./blogs')
  }).catch((err)=>console.log(err))
})



app.get('/logging/:id', async (req, res) => {
  try {
    const blogTaskId = req.params.id; // Get the Blog task ID from the URL parameters

    // Parallelize the database calls for efficiency
    const [task, sprint, admin, members, currentUser] = await Promise.all([
      Blog.findById(blogTaskId),  // Find the Blog task based on its ID
      Sprints.findOne({ tasks: blogTaskId }), // Find the Sprint that contains the Blog task
      Users.findOne({ admin: "true" }), // Fetch the admin user
      Users.find({ admin: "false" }), // Fetch the non-admin users
      Users.findOne({ currentuser: "true" })  // Fetch the current user
    ]);

    if (!task) {
      // Handle the case when the Blog task is not found
      res.status(404).send('Blog task not found');
      return;
    }

    if (!sprint) {
      // Handle the case when the Sprint is not found
      res.status(404).send('Sprint not found for this task');
      return;
    }

    const tasks = sprint.tasks;

    // Render the EJS file and pass the specific task, sprint, and other necessary data to it
    res.render('logging', { 
      Blog: Blog,
      tasks: tasks,
      task: task, 
      sprint: sprint, 
      title: "Logging",
      currentuser: currentUser,
      admin: admin,
      alluser: members,colorBlind
    });

  } catch (error) {
    console.error('Error fetching data:', error);
    // Handle the error if needed
    res.status(500).send('Internal server error');
  }
});

app.post('/logging/:id', async (req, res) => {
  try {
    const blogTaskId = req.params.id; 
    const { member, logdate, storypoint } = req.body;

    const allmembers = await Users.find();
    const nonAdminUserCount = allmembers.length;

    // Original Logic
    const task = await Blog.findById(blogTaskId); 
    if (!task) {
      res.status(404).send('Blog task not found');
      return;
    }
    console.log("TEST THE INPUTS");
    console.log(member);
    console.log(logdate);
    console.log(storypoint);

    const memberIndex = allmembers.findIndex(user => user.username === member);
    const sprint = await Sprints.findOne({ tasks: blogTaskId });
    console.log("This is a member index and non admin user count");
    console.log(memberIndex);
    console.log(nonAdminUserCount);
    console.log((task.hours).length);

    if (!isNaN(memberIndex) && memberIndex >= 0 && memberIndex < nonAdminUserCount) {
      const loggedHours = parseInt(storypoint);
      const startDate = new Date(sprint.startdate);
      const endDate = new Date(sprint.enddate);
      const logDate = new Date(logdate);
      const differentdays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

      if (logDate >= startDate && logDate <= endDate) {
        const daysDifference = Math.floor((logDate - startDate) / (24 * 60 * 60 * 1000));
        if (daysDifference >= 0 && daysDifference < task.hours[memberIndex].length) {
          for (let i = daysDifference; i < differentdays; i++) {
            task.hours[memberIndex][i] += loggedHours;
          }

          const members = await Users.find({ admin: "false" });
          

          for (let i = 0; i < task.hours[nonAdminUserCount-1].length; i++) {
            console.log(task.hours[nonAdminUserCount-1])
            task.hours[nonAdminUserCount-1][i] = task.hours.slice(0, nonAdminUserCount-1).reduce((acc, innerArray) => acc + (innerArray[i] || 0), 0);
          }

          await task.save();
          res.redirect(`/scrumboard/${sprint._id}`);
        } else {
          res.status(400).send('Invalid log date selection');
        }
      } else {
        res.status(400).send('Log date is outside the sprint date range');
      }
    } else {
      res.status(400).send('Invalid member selection');
    }

    // New Logic
    const earliestSprint = await Sprints.find().sort('startdate').limit(1);
    if (!earliestSprint || !earliestSprint.length) {
      console.error('No sprints found');
      res.status(400).send('No sprints found');
      return;
    }
    const earliestStartDate = new Date(earliestSprint[0].startdate);
    console.log(`Earliest Start Date: ${earliestStartDate}`); // ADD THIS

    const newlogDate = new Date(logdate);
    const daysDifferenceFromEarliest = Math.ceil((newlogDate - earliestStartDate) / (1000 * 60 * 60 * 24))

    const tableRecord = await Tables.findOne();
    if (!tableRecord) {
      console.error('Table record not found');
      res.status(400).send('Table record not found');
      return;
    }

    while (tableRecord.array.length < nonAdminUserCount) {
      tableRecord.array.push([]);
    }

    console.log(`Day difference ${daysDifferenceFromEarliest}`); // ADD THIS


    const targetInnerArray = tableRecord.array[memberIndex];
    console.log(`Target array length ${targetInnerArray.length}`); // ADD THIS
    for (let idx = 0; idx < tableRecord.array.length; idx++) {
      const targetInnerArray = tableRecord.array[idx];
      
      while (targetInnerArray.length <= daysDifferenceFromEarliest) {
          if (targetInnerArray.length === daysDifferenceFromEarliest) {
              if (idx === memberIndex) {
                  targetInnerArray.push(parseInt(storypoint));
                  console.log("PUSHEDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD");
              } else {
                  targetInnerArray.push(0);
                  console.log("PUSHEDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD");
              }
          } else {
              targetInnerArray.push(0);
              console.log("PUSHEDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD");
          }
      }

      if (targetInnerArray.length > daysDifferenceFromEarliest && idx === memberIndex) {
        targetInnerArray[daysDifferenceFromEarliest] += parseInt(storypoint);
        console.log("INCREMENTEDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD");
    }
  }
  

    await tableRecord.save();

  } catch (error) {
    console.error('Error logging hours:', error);
    res.status(500).send('Internal server error');
  }
});






// ---------------------------------------------------------------------------------------------

// You will need to create a ejs page called createSprint which will be like the ones with
// creating tasks but you must modify it to accept only the 5 fields that are listed in 
// the new schema which is inside /models/sprints.js

// Then you must link the create sprint button in scrumboard page to redirect to createSprint
// (which you must create as I mentioned above)

app.get('/scrumboard/:id', async (req, res) => {
  try {
    const sprintId = req.params.id;

    const [sprint, admin, members, currentUser,allsprints] = await Promise.all([
      Sprints.findById(sprintId).populate('tasks'),
      Users.findOne({ admin: "true" }),
      Users.find({ admin: "false" }),
      Users.findOne({ currentuser: "true" }),
      Sprints.find()
    ]);

    if (!sprint) {
      console.log('Sprint not found');
      res.render('sprintdetail', { sprint: null, title: 'Sprint Details', currentuser: currentUser, admin: admin, alluser: members });
    } else {
      const tasks = sprint.tasks;
      tasks.forEach(task => {
        task.visibility = false; // Update the visibility property
      });

      // Save the updated blog objects
      await Promise.all(tasks.map(task => task.save()));

      console.log('Visibility updated successfully.');
      res.render('sprintdetail', { allsprints, sprint, tasks, title: 'Sprint Details', currentuser: currentUser, admin: admin, alluser: members,colorBlind });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/accountdetails', async (req, res) => {
  try {
    currentSort = false;
    sortByDate = true;

    const [blogs, currentUser, admin, members] = await Promise.all([
      Blog.find(),
      Users.findOne({ currentuser: "true" }),
      Users.findOne({ admin: "true" }),
      Users.find({ admin: "false" })
    ]);

    // console.log(currentUser.username);
    res.render('accountdetails', { 
      blogs: blogs, 
      user: currentUser, 
      admin: admin,
      alluser: members,
      title: 'All blogs', 
      sortPriority, 
      sortByDate, 
      currentSort,colorBlind 
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
});



app.get('/burndown/:id', async (req, res) => {
  try {
    const sprintId = req.params.id;

    const [sprint, admin, members, currentUser] = await Promise.all([
      Sprints.findById(sprintId).populate('tasks'),
      Users.findOne({ admin: "true" }),
      Users.find({ admin: "false" }),
      Users.findOne({ currentuser: "true" })
    ]);

    if (!sprint) {
      console.log('Sprint not found');
      res.render('burndown', { sprint: null, title: 'Burndown Chart', sprintId, currentuser: currentUser, admin: admin, alluser: members });
      return;
    }

    const tasks = sprint.tasks;
    tasks.forEach(task => {
      task.visibility = false;  // Update the visibility property
    });

    await Promise.all(tasks.map(task => task.save()));  // Save the updated blog objects

    console.log('Visibility updated successfully.');
    res.render('burndown', { 
      sprint: sprint, 
      tasks: tasks, 
      title: 'Burndown Chart', 
      sprintId, 
      currentuser: currentUser, 
      admin: admin, 
      alluser: members,colorBlind 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});


// app.get('/burndown/:id', (req, res) => {
//   const sprintId = req.params.id;

//   // Retrieve the Sprint by ID
//   Sprints.findById(sprintId)
//     .populate('tasks')
//     .then(sprint => {
//       if (!sprint) {
//         console.log('Sprint not found');
//         res.render('burndown', { sprint: null, title: 'Burndown Chart', sprintId,currentuser:currentuser, admin:admin,alluser:alluser });
//       } else {
//         const tasks = sprint.tasks;

//         // Loop through the tasks (blog objects) and set their visibility to false
//         tasks.forEach(task => {
//           // Assuming task is a Blog object, update its visibility property
//           task.visibility = false;
//         });

//         // Save the updated blog objects
//         Promise.all(tasks.map(task => task.save()))
//           .then(() => {
//             console.log('Visibility updated successfully.');

//             // Now render your view or perform other actions as needed
//             res.render('burndown', { sprint, tasks, title: 'Burndown Chart', sprintId,currentuser:currentuser, admin:admin,alluser:alluser });
//           })
//           .catch(error => {
//             console.error('Error updating visibility:', error);
//             // Handle errors here if needed
//           });
//       }
//     })
//     .catch(error => {
//       console.error('Error:', error);
//     });
// });




app.route('/editsprint/:id')
  .get(async (req, res) => {
    try {
      const id = req.params.id;

      const [sprint, blogTasks, admin, members, currentUser] = await Promise.all([
        Sprints.findById(id),          // Fetch the sprint by ID
        Blog.find(),                   // Fetch the entire Blog objects
        Users.findOne({ admin: "true" }),  // Fetch the admin user
        Users.find({ admin: "false" }),   // Fetch the non-admin users
        Users.findOne({ currentuser: "true" }) // Fetch the current user
      ]);

      if (sprint) {
        res.render('editsprint', { 
          sprint: sprint, 
          blogTasks: blogTasks, 
          title: 'Edit Sprint',
          currentuser: currentUser, 
          admin: admin, 
          alluser: members,colorBlind 
        });
      } else {
        // Handle the case when the sprint is not found
        res.status(404).send('Sprint not found');
      }
    } catch (err) {
      console.log(err);
      // Handle other errors if needed
      res.status(500).send('Internal server error');
    }
  })
  .post(async (req, res) => {
    try {
      const id = req.params.id;
      const updatedSprintData = req.body;

      // Fetch the existing sprint
      const existingSprint = await Sprints.findById(id);

      if (existingSprint) {
        // Get the list of tasks before the update
        const previousTasks = existingSprint.tasks;

        // Find the tasks that were removed (unchecked)
        const removedTasks = previousTasks.filter(taskId => !updatedSprintData.tasks.includes(taskId));

        // Update the visibility property of removed tasks to true
        const updateVisibilityTasks = removedTasks.map(async taskId => {
          try {
            const task = await Blog.findById(taskId);
            if (task) {
              task.visibility = true;
              return task.save();
            }
          } catch (err) {
            console.error('Error updating task visibility:', err);
          }
        });

        // Wait for all tasks to be updated before updating the sprint
        await Promise.all(updateVisibilityTasks);

        // Calculate the total story points for the remaining tasks
        let totalStoryPoints = 0;

        // Loop through the updated tasks and retrieve the story points
        for (const taskId of updatedSprintData.tasks) {
          try {
            const task = await Blog.findById(taskId);
            if (task && (task.status === "Not Started" || task.status === "In Progress")) {
              // Convert the storypoint to a number and add it to the total
              totalStoryPoints += parseInt(task.storypoint, 10); // Assuming storypoint is a string containing a number
            }
          } catch (err) {
            console.error('Error retrieving task:', err);
          }
        }

        console.log("New story points: ", totalStoryPoints);

        // Calculate the number of days between startdate and enddate
        const startDate = new Date(updatedSprintData.startdate);
        const endDate = new Date(updatedSprintData.enddate);
        const numberOfDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

        // Create an array of zeros with a length equal to numberOfDays
        const burndownArray = Array(numberOfDays).fill(totalStoryPoints);

        console.log("New burndown array after edit: ", burndownArray);

        // Update the sprint in the database with the new values from req.body
        const updatedSprint = await Sprints.findByIdAndUpdate(id, {
          ...updatedSprintData,
          burndown: burndownArray, // Update the burndown array with the new values
        });

        if (updatedSprint) {
          res.redirect('/scrumboard/' + id); // Redirect to the updated sprint's details page
        } else {
          // Handle the case when the sprint update fails
          res.status(500).send('Failed to update sprint');
        }
      } else {
        // Handle the case when the sprint is not found
        res.status(404).send('Sprint not found');
      }
    } catch (err) {
      console.log(err);
      // Handle other errors if needed
      res.status(500).send('Internal server error');
    }
  });





  app.get('/scrumboard', async (req, res) => {
    try {
      sortStatusSprint = true;
  
      const [sprints, admin, members, currentUser] = await Promise.all([
        Sprints.find(),
        Users.findOne({ admin: "true" }),
        Users.find({ admin: "false" }),
        Users.findOne({ currentuser: "true" })
      ]);

      // Get the earliest sprint start date.
    const earliestSprint = await Sprints.find().sort('startdate').limit(1);
    const earliestStartDate = new Date(earliestSprint[0].startdate);
    console.log(`Earliest Start Date: ${earliestStartDate}`); // ADD
    // Get the latest sprint end date.
    const latestSprint = await Sprints.find().sort('-enddate').limit(1);
    const latestEndDate = new Date(latestSprint[0].enddate);
    console.log(`Latest Start Date: ${latestEndDate}`); // ADD
  
    // Calculate the difference between these two dates.
    const numberOfDaysToAdd = Math.ceil((latestEndDate - earliestStartDate) / (1000 * 60 * 60 * 24));
    console.log(`Number of days to add: ${numberOfDaysToAdd}`); // ADD
  
    // Fetch the `Tables` object.
    const tables = await Tables.findOne();
  
    if (tables && tables.array) {
      for (let i = 0; i < tables.array.length; i++) {
        let innerArray = tables.array[i];
        const currentLength = innerArray.length;
        console.log(`Inner Array Length: ${currentLength}`); // ADD
  
        if (numberOfDaysToAdd > currentLength) {
          const numberOfZerosToAdd = numberOfDaysToAdd - currentLength;
          
          // Append zeros
          for (let j = 0; j < numberOfZerosToAdd; j++) {
            innerArray.push(0);
          }
        }
      }
  
      // Save the modified `tables` object.
      await tables.save();
    }
  
      // Define the status order for sprints
      const statusOrderSprint = ['Not Started', 'In Progress', 'Completed'];
  
      // Sort the sprints array based on the status order for sprints
      sprints.sort((a, b) => {
        const check1 = (new Date() > a.startdate && new Date() < a.enddate) ? "In Progress" : 
                      (new Date() < a.startdate) ? "Not Started" : "Completed";
        const check2 = (new Date() > b.startdate && new Date() < b.enddate) ? "In Progress" : 
                      (new Date() < b.startdate) ? "Not Started" : "Completed";
        const statusA = statusOrderSprint.indexOf(check1);
        const statusB = statusOrderSprint.indexOf(check2);
        return statusA - statusB;
      });
  
      // Render the scrumboard view
      res.render('scrumboard', { 
        sprints: sprints, 
        title: 'All sprints', 
        sortStatusSprint,
        currentuser: currentUser, 
        admin: admin, 
        alluser: members,colorBlind 
      });
    } catch (err) {
      console.log(err);
      res.status(500).send('Internal Server Error');
    }
  });


  app.post('/scrumboard', async (req, res) => {
    const taskIds = req.body.tasks;
  
    // Calculate the number of days between startdate and enddate
    const startDate = new Date(req.body.startdate);
    const endDate = new Date(req.body.enddate);
    const numberOfDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  
    // Create an array of zeros with a length equal to numberOfDays
    const hoursArray = Array(numberOfDays).fill(0);
  
    let totalStoryPoints = 0;
  
    for (const taskId of taskIds) {
      try {
        const task = await Blog.findById(taskId);
        if (task && (task.status === "Not Started" || task.status === "In Progress")) {
          totalStoryPoints += parseInt(task.storypoint, 10);
        }
      } catch (err) {
        console.error('Error retrieving task:', err);
      }
    }
  
    const nonAdminUserCount = await Users.find();
    console.log(nonAdminUserCount.length);
  
    const burndownArray = Array(numberOfDays).fill(totalStoryPoints);
  
    const updateTasks = taskIds.map(async taskId => {
      try {
        const task = await Blog.findById(taskId);
        if (task) {
          task.hours = Array((nonAdminUserCount.length)+1).fill([...hoursArray]);
          task.burndown = [...burndownArray];
          task.visibility = false;
          return task.save();
        }
      } catch (err) {
        console.error('Error updating task:', err);
      }
    });
  
    Promise.all(updateTasks)
      .then(async () => {
        const sprints = new Sprints({
          sprintname: req.body.sprintname,
          tasks: taskIds,
          status: req.body.status,
          startdate: req.body.startdate,
          enddate: req.body.enddate,
          burndown: burndownArray,
        });
  
        try {
          const savedSprints = await sprints.save();
          res.redirect('./scrumboard');
        } catch (err) {
          console.error('Error saving sprints:', err);
        }
      })
      .catch(err => {
        console.error('Error updating task visibility:', err);
      });
  
    // New Feature Addition Starts Here
  
    
  });

  app.post('/scrumboard', async (req, res) => {
    const taskIds = req.body.tasks;
  
    // Calculate the number of days between startdate and enddate
    const startDate = new Date(req.body.startdate);
    const endDate = new Date(req.body.enddate);
    const numberOfDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  
    // Create an array of zeros with a length equal to numberOfDays
    const hoursArray = Array(numberOfDays).fill(0);
  
    let totalStoryPoints = 0;
  
    for (const taskId of taskIds) {
      try {
        const task = await Blog.findById(taskId);
        if (task && (task.status === "Not Started" || task.status === "In Progress")) {
          totalStoryPoints += parseInt(task.storypoint, 10);
        }
      } catch (err) {
        console.error('Error retrieving task:', err);
      }
    }
  
    const nonAdminUserCount = await Users.find();
    console.log(nonAdminUserCount.length);
  
    const burndownArray = Array(numberOfDays).fill(totalStoryPoints);
  
    const updateTasks = taskIds.map(async taskId => {
      try {
        const task = await Blog.findById(taskId);
        if (task) {
          task.hours = Array((nonAdminUserCount.length)+1).fill([...hoursArray]);
          task.burndown = [...burndownArray];
          task.visibility = false;
          return task.save();
        }
      } catch (err) {
        console.error('Error updating task:', err);
      }
    });
  
    Promise.all(updateTasks)
      .then(async () => {
        const sprints = new Sprints({
          sprintname: req.body.sprintname,
          tasks: taskIds,
          status: req.body.status,
          startdate: req.body.startdate,
          enddate: req.body.enddate,
          burndown: burndownArray,
        });
  
        try {
          const savedSprints = await sprints.save();
          res.redirect('./scrumboard');
        } catch (err) {
          console.error('Error saving sprints:', err);
        }
      })
      .catch(err => {
        console.error('Error updating task visibility:', err);
      });
  
    // New Feature Addition Starts Here
  
    // Get the earliest sprint start date.
    const earliestSprint = await Sprints.find().sort('startdate').limit(1);
    const earliestStartDate = new Date(earliestSprint[0].startdate);
    console.log(`Earliest Start Date: ${earliestStartDate}`); // ADD
  
    // Get the latest sprint end date.
    const latestSprint = await Sprints.find().sort('-enddate').limit(1);
    const latestEndDate = new Date(latestSprint[0].enddate);
    console.log(`Latest Start Date: ${latestEndDate}`); // ADD
  
    // Calculate the difference between these two dates.
    const numberOfDaysToAdd = Math.ceil((latestEndDate - earliestStartDate) / (1000 * 60 * 60 * 24));
    console.log(`Number of days to add: ${numberOfDaysToAdd}`); // ADD
  
    // Fetch the `Tables` object.
    const tables = await Tables.findOne();
  
    if (tables && tables.array) {
      for (let i = 0; i < tables.array.length; i++) {
        let innerArray = tables.array[i];
        const currentLength = innerArray.length;
        console.log(`Inner Array Length: ${currentLength}`); // ADD
  
        if (numberOfDaysToAdd > currentLength) {
          const numberOfZerosToAdd = numberOfDaysToAdd - currentLength;
          
          // Append zeros
          for (let j = 0; j < numberOfZerosToAdd; j++) {
            innerArray.push(0);
          }
        }
      }
  
      // Save the modified `tables` object.
      await tables.save();
    }
  });


app.get('/sortsprint', async (req, res) => {
  try {
    sortStatusSprint = true;

    const [sprints, admin, members, currentUser] = await Promise.all([
      Sprints.find(),
      Users.findOne({ admin: "true" }),
      Users.find({ admin: "false" }),
      Users.findOne({ currentuser: "true" })
    ]);

    const statusOrderSprint = ['Not Started', 'In Progress', 'Completed'];
    sprints.sort((a, b) => {
      const check1 = (new Date() > a.startdate & new Date() < a.enddate) ? "In Progress" : 
                     (new Date() < a.startdate) ? "Not Started" : "Completed";
      const check2 = (new Date() > b.startdate & new Date() < b.enddate) ? "In Progress" : 
                     (new Date() < b.startdate) ? "Not Started" : "Completed";
      return statusOrderSprint.indexOf(check1) - statusOrderSprint.indexOf(check2);
    });

    res.render('scrumboard', { 
      sprints: sprints, 
      title: 'All sprints', 
      sortStatusSprint,
      currentuser: currentUser, 
      admin: admin, 
      alluser: members,colorBlind 
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/sortsprint2', async (req, res) => {
  try {
    sortStatusSprint = false;

    const [sprints, admin, members, currentUser] = await Promise.all([
      Sprints.find(),
      Users.findOne({ admin: "true" }),
      Users.find({ admin: "false" }),
      Users.findOne({ currentuser: "true" })
    ]);

    const statusOrderSprint = ['Completed', 'In Progress', 'Not Started'];
    sprints.sort((a, b) => {
      const check1 = (new Date() > a.startdate & new Date() < a.enddate) ? "In Progress" : 
                     (new Date() < a.startdate) ? "Not Started" : "Completed";
      const check2 = (new Date() > b.startdate & new Date() < b.enddate) ? "In Progress" : 
                     (new Date() < b.startdate) ? "Not Started" : "Completed";
      return statusOrderSprint.indexOf(check1) - statusOrderSprint.indexOf(check2);
    });

    res.render('scrumboard', { 
      sprints: sprints, 
      title: 'All sprints', 
      sortStatusSprint,
      currentuser: currentUser, 
      admin: admin, 
      alluser: members,colorBlind 
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
});





// ---------------------------------------------------------------------------------------------






// this is to view the details of the objects, for example if we were to click on a task
// we can view the details, we do this by extracting the unique id of the dataset
// if we were to view the details of task one, it would take us to localhost:3000/blogs/asdfasdfasdf
// note that "asdfasdfasdf" is the id 
app.get('/blogs/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [blog, admin, members, currentUser] = await Promise.all([
      Blog.findById(id),
      Users.findOne({ admin: "true" }),
      Users.find({ admin: "false" }),
      Users.findOne({ currentuser: "true" })
    ]);

    res.render('details', { 
      blog: blog, 
      title: 'Blog Details', 
      currentuser: currentUser, 
      admin: admin, 
      alluser: members,colorBlind 
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/scrumboard/task/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [blog, admin, members, currentUser] = await Promise.all([
      Blog.findById(id),
      Users.findOne({ admin: "true" }),
      Users.find({ admin: "false" }),
      Users.findOne({ currentuser: "true" })
    ]);

    res.render('sprinttask', { 
      blog: blog, 
      title: 'Blog Details', 
      currentuser: currentUser, 
      admin: admin, 
      alluser: members,colorBlind 
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
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

app.delete('/adminmembers/:id', (req,res)=>{
  const id = req.params.id;
  Users.findByIdAndDelete(id)
  .then(result => {
    // we use this redirect in front end (s1)
    res.json({redirect: '/adminmembers'})
  }).catch((err)=>console.log(err))
})

app.delete('/scrumboard/:id', (req,res)=>{
  const id = req.params.id;
  Sprints.findByIdAndDelete(id)
  .then(result => {
    // we use this redirect in front end (s1)
    res.json({redirect: '/scrumboard'})
  }).catch((err)=>console.log(err))
})

app.get('/accumulation/:id', async (req, res) => {
  try {
    const blogTaskId = req.params.id; // Get the Blog task ID from the URL parameters

    const [task, sprint, admin, members, currentUser] = await Promise.all([
      Blog.findById(blogTaskId),
      Sprints.findOne({ tasks: blogTaskId }),
      Users.findOne({ admin: "true" }),
      Users.find({ admin: "false" }),
      Users.findOne({ currentuser: "true" })
    ]);

    if (!task) {
      // Handle the case when the Blog task is not found
      res.status(404).send('Blog task not found');
      return;
    }

    if (!sprint) {
      // Handle the case when the Sprint is not found
      res.status(404).send('Sprint not found for this task');
      return;
    }

    const tasks = sprint.tasks;

    // Render the EJS file and pass the specific task, sprint, and other necessary data to it
    res.render('accumulation', { 
      Blog: Blog, 
      tasks: tasks, 
      task: task, 
      sprint: sprint, 
      title: "Accumulation",
      currentuser: currentUser, 
      admin: admin, 
      alluser: members,colorBlind 
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    // Handle the error if needed
    res.status(500).send('Internal server error');
  }
});


// THIS BLOCK IS TO SHOW THE TASKS AGAIN WHEN SPRINT IS DELETED. IF USING THIS,
// DELETE THE APP.DELETE BLOCK ABOVE

// app.delete('/scrumboard/:id', async (req, res) => {
//   const id = req.params.id;

//   try {
//     const sprint = await Sprints.findByIdAndDelete(id);

//     // Check if the sprint was found and deleted successfully
//     if (sprint) {
//       // Get the list of task IDs associated with the sprint
//       const taskIds = sprint.tasks;

//       // Loop through the taskIds and update their visibility property to true
//       const updateTasks = taskIds.map(async taskId => {
//         try {
//           const task = await Blog.findById(taskId);
//           if (task) {
//             task.visibility = true;
//             return task.save();
//           }
//         } catch (err) {
//           console.error('Error updating task visibility:', err);
//         }
//       });

//       // Wait for all tasks to be updated before responding to the client
//       await Promise.all(updateTasks);
//     }

//     // Send a response to the client
//     res.json({ redirect: '/scrumboard' });
//   } catch (err) {
//     console.error('Error deleting sprint:', err);
//     // Handle error if needed
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });


// 404 page
app.use((req, res) => {
  res.status(404).render('404', { title: '404' });
});