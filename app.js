const express = require('express')
const morgan = require('morgan')
const mongoose = require('mongoose')
const Blog = require('./models/blog')
const Sprints = require('./models/sprints')
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

app.route('/test/:id')
  .get((req, res) => {
    const id = req.params.id;
    Blog.findById(id)
      .then(result => {
        res.render('edit', { blog: result, title: 'Edit Blog' });
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

      res.render('edittasks', { blog: result, sprint: sprint, title: 'Edit Blog' });
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
  res.redirect('/scrumboard');
});




// for ejs files, we use render to update stuff
app.get('/about', (req, res) => {
  res.render('about', { title: 'About' });
});

app.get('/filter', (req, res) => {
  res.render('filter', { title: 'About' });
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
    res.render('filteredindex', { blogs: filteredBlogs, title: 'Filtered Index', sortPriority, sortByDate, currentSort });
  } catch (error) {
    console.error('Error fetching filtered Blogs:', error);
    // Handle the error if needed
    res.status(500).send('Internal server error');
  }
});





// blog routes
app.get('/blogs/create', (req, res) => {
  res.render('create', { title: 'Create a new blog' });
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
  .get((req, res) => {
    // Fetch the entire Blog objects
    Blog.find() // No need to specify fields, it fetches all fields by default
      .then(blogTasks => {
        res.render('createSprint', { title: 'Create a new sprint', blogTasks });
      })
      .catch(err => {
        console.log(err);
      });
  })

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
app.get('/blogs', (req, res) => {

  currentSort = false
  sortByDate = true

  Blog.find()
    .then(result => {
      res.render('index', { blogs: result, title: 'All blogs', sortPriority, sortByDate, currentSort });
    })
    .catch(err => {
      console.log(err);
    });
});

let sortByDate = true; // Initialize with -1 for descending order

let currentSort = true

app.get('/sort-by-date', (req, res) => {
  // Toggle the sorting order between -1 and 1
  const sortedByDate = 1;
  currentSort = false
  sortByDate = true;

  Blog.find()
    .sort({ createdAt: sortedByDate }) // Sort by 'createdAt' field
    .then(result => {
      res.render('index', { blogs: result, title: 'All blogs', sortPriority, sortByDate, currentSort });

    })
    .catch(err => {
      console.log(err);
    });
});

app.get('/sort-by-date2', (req, res) => {
  // Toggle the sorting order between -1 and 1
  const sortedByDate = -1;
  currentSort = false
  sortByDate = false;

  Blog.find()
    .sort({ createdAt: sortedByDate }) // Sort by 'createdAt' field
    .then(result => {
      res.render('index', { blogs: result, title: 'All blogs', sortPriority, sortByDate, currentSort });

    })
    .catch(err => {
      console.log(err);
    });
});


let sortPriority = true; // Initialize with -1 for descending order

app.get('/sort', (req, res) => {
  Blog.find()
    .then(result => {
      // Define the priority order
      const priorityOrder = ['Low', 'Medium', 'Important', 'Urgent']
      currentSort = true

      // Sort the result array based on the priority order
      result.sort((a, b) => {
        const priorityA = priorityOrder.indexOf(a.priority);
        const priorityB = priorityOrder.indexOf(b.priority);
        return priorityA - priorityB;
      });

      // Toggle the sorting order between -1 and 1
      sortPriority = true;

      res.render('index', { blogs: result, title: 'All blogs', sortPriority, sortByDate, currentSort });
    })
    .catch(err => {
      console.log(err);
    });
});

app.get('/sort2', (req, res) => {
  Blog.find()
    .then(result => {
      // Define the priority order
      const priorityOrder = ['Urgent', 'Important', 'Medium', 'Low'];
      currentSort = true

      // Sort the result array based on the priority order
      result.sort((a, b) => {
        const priorityA = priorityOrder.indexOf(a.priority);
        const priorityB = priorityOrder.indexOf(b.priority);
        return priorityA - priorityB;
      });

      // Toggle the sorting order between -1 and 1
      sortPriority = false;

      res.render('index', { blogs: result, title: 'All blogs', sortPriority, sortByDate, currentSort });
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



app.get('/logging/:id', async (req, res) => {
  try {
    const blogTaskId = req.params.id; // Get the Blog task ID from the URL parameters

    // Find the Blog task based on its ID
    const task = await Blog.findById(blogTaskId); // Replace 'Blog' with your actual Blog model

    if (!task) {
      // Handle the case when the Blog task is not found
      res.status(404).send('Blog task not found');
      return;
    }

    // Find the Sprint that contains the Blog task
    const sprint = await Sprints.findOne({ tasks: blogTaskId });

    const tasks = sprint.tasks
    if (!sprint) {
      // Handle the case when the Sprint is not found
      res.status(404).send('Sprint not found for this task');
      return;
    }

    // Render the EJS file and pass the specific task, sprint, and other necessary data to it
    res.render('logging', { Blog: Blog,tasks,task, sprint, title: "Logging" });
  } catch (error) {
    console.error('Error fetching data:', error);
    // Handle the error if needed
    res.status(500).send('Internal server error');
  }
});

app.post('/logging/:id', async (req, res) => {
  try {
    const blogTaskId = req.params.id; // Get the Blog task ID from the URL parameters
    const { member, logdate, storypoint } = req.body;

    // Find the Blog task based on its ID
    const task = await Blog.findById(blogTaskId); // Replace 'Blog' with your actual Blog model

    if (!task) {
      // Handle the case when the Blog task is not found
      res.status(404).send('Blog task not found');
      return;
    }

    // Determine which inner list to update based on the selected member
    const memberIndex = parseInt(member);
    const sprint = await Sprints.findOne({ tasks: blogTaskId });

    if (!isNaN(memberIndex) && memberIndex >= 0 && memberIndex < 5) {
      // Ensure memberIndex is a valid index
      const loggedHours = parseInt(storypoint);
    
      // Calculate the index based on the log date and sprint dates
      const startDate = new Date(sprint.startdate);
      const endDate = new Date(sprint.enddate);
      const logDate = new Date(logdate);

      // Check if the log date is within the sprint's start and end date
      if (logDate >= startDate && logDate <= endDate) {
        // Calculate the index based on the difference in days
        const daysDifference = Math.floor((logDate - startDate) / (24 * 60 * 60 * 1000));
        
        // Ensure the index is within bounds
        if (daysDifference >= 0 && daysDifference < task.hours[memberIndex].length) {
          // Increment the selected element of the inner list
          task.hours[memberIndex][daysDifference] += loggedHours;

          // Calculate the cumulative sum for each member's indices
          for (let i = 0; i < task.hours[5].length; i++) {
            task.hours[5][i] = task.hours.slice(0, 5).reduce((acc, innerArray) => acc + (innerArray[i] || 0), 0);
          }

          // Save the updated task
          await task.save();

          // Redirect back to the '/scrumboard/:id' route
          res.redirect(`/scrumboard/${sprint._id}`); // Assuming 'sprint._id' contains the ID of the current sprint
        } else {
          // Handle invalid date selection
          res.status(400).send('Invalid log date selection');
        }
      } else {
        // Handle log date outside sprint's date range
        res.status(400).send('Log date is outside the sprint date range');
      }
    } else {
      // Handle invalid member selection
      res.status(400).send('Invalid member selection');
    }

  } catch (error) {
    console.error('Error logging hours:', error);
    // Handle the error if needed
    res.status(500).send('Internal server error');
  }
});






// ---------------------------------------------------------------------------------------------

// You will need to create a ejs page called createSprint which will be like the ones with
// creating tasks but you must modify it to accept only the 5 fields that are listed in 
// the new schema which is inside /models/sprints.js

// Then you must link the create sprint button in scrumboard page to redirect to createSprint
// (which you must create as I mentioned above)

app.get('/scrumboard/:id', (req, res) => {
  const sprintId = req.params.id;

  // Retrieve the Sprint by ID
  Sprints.findById(sprintId)
    .populate('tasks')
    .then(sprint => {
      if (!sprint) {
        console.log('Sprint not found');
        res.render('sprintdetail', { sprint: null, title: 'Sprint Details' });
      } else {
        const tasks = sprint.tasks;

        // Loop through the tasks (blog objects) and set their visibility to false
        tasks.forEach(task => {
          // Assuming task is a Blog object, update its visibility property
          task.visibility = false;
        });

        // Save the updated blog objects
        Promise.all(tasks.map(task => task.save()))
          .then(() => {
            console.log('Visibility updated successfully.');

            // Now render your view or perform other actions as needed
            res.render('sprintdetail', { sprint, tasks, title: 'Sprint Details' });
          })
          .catch(error => {
            console.error('Error updating visibility:', error);
            // Handle errors here if needed
          });
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
});

app.get('/burndown/:id', (req, res) => {
  const sprintId = req.params.id;

  // Retrieve the Sprint by ID
  Sprints.findById(sprintId)
    .populate('tasks')
    .then(sprint => {
      if (!sprint) {
        console.log('Sprint not found');
        res.render('burndown', { sprint: null, title: 'Burndown Chart', sprintId });
      } else {
        const tasks = sprint.tasks;

        // Loop through the tasks (blog objects) and set their visibility to false
        tasks.forEach(task => {
          // Assuming task is a Blog object, update its visibility property
          task.visibility = false;
        });

        // Save the updated blog objects
        Promise.all(tasks.map(task => task.save()))
          .then(() => {
            console.log('Visibility updated successfully.');

            // Now render your view or perform other actions as needed
            res.render('burndown', { sprint, tasks, title: 'Burndown Chart', sprintId });
          })
          .catch(error => {
            console.error('Error updating visibility:', error);
            // Handle errors here if needed
          });
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
});


app.route('/editsprint/:id')
  .get(async (req, res) => {
    try {
      const id = req.params.id;
      const sprint = await Sprints.findById(id);
      
      // Fetch the entire Blog objects
      const blogTasks = await Blog.find();
      
      if (sprint) {
        res.render('editsprint', { sprint, title: 'Edit Sprint', blogTasks });
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





app.get('/scrumboard', (req, res) => {
  sortStatusSprint = true
  Sprints.find()
    .then(result => {
      // Define the status order for sprints
      const statusOrderSprint = ['Not Started','In Progress', 'Completed'];

      // Sort the result array based on the status order for sprints
      result.sort((a, b) => {
        const check1 = (new Date() > a.startdate & new Date() < a.enddate)? "In Progress" : (new Date() < a.startdate)? "Not Started" : "Completed"
        const check2 = (new Date() > b.startdate & new Date() < b.enddate)? "In Progress" : (new Date() < b.startdate)? "Not Started" : "Completed"
        const statusA = statusOrderSprint.indexOf(check1);
        const statusB = statusOrderSprint.indexOf(check2);
        return statusA - statusB;
      });

      // Toggle the sorting order between -1 and 1

      res.render('scrumboard', { sprints: result, title: 'All sprints', sortStatusSprint});
    })
    .catch(err => {
      console.log(err);
    });
});


app.post('/scrumboard', async (req, res) => {
  const taskIds = req.body.tasks; // Assuming taskIds is an array of Blog IDs

  // Calculate the number of days between startdate and enddate
  const startDate = new Date(req.body.startdate);
  const endDate = new Date(req.body.enddate);
  const numberOfDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

  // Create an array of zeros with a length equal to numberOfDays
  const hoursArray = Array(numberOfDays+1).fill(0);

  let totalStoryPoints = 0;

// Loop through the taskIds and retrieve the story points for each task
for (const taskId of taskIds) {
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

console.log('Total Story Points:', totalStoryPoints);

  // Create an array filled with the total sum of story points
  const burndownArray = Array(numberOfDays).fill(totalStoryPoints);

  // Loop through the taskIds and update the hours and burndown arrays of each Blog object
  const updateTasks = taskIds.map(async taskId => {
    try {
      const task = await Blog.findById(taskId);
      if (task) {
        task.hours = Array(6).fill([...hoursArray]); // Clone the hoursArray for each inner array
        task.burndown = [...burndownArray]; // Clone the burndownArray
        task.visibility = false;
        return task.save();
      }
    } catch (err) {
      console.error('Error updating task:', err);
    }
  });

  // Wait for all tasks to be updated before creating the sprints object
  Promise.all(updateTasks)
    .then(async () => {
      const sprints = new Sprints({
        sprintname: req.body.sprintname,
        tasks: taskIds, // Use the Blog IDs as they are
        status: req.body.status,
        startdate: req.body.startdate,
        enddate: req.body.enddate,
        burndown: burndownArray, // Clone the burndownArray
      });

      try {
        const savedSprints = await sprints.save();
        res.redirect('./scrumboard');
      } catch (err) {
        console.error('Error saving sprints:', err);
        // Handle error if needed
      }
    })
    .catch(err => {
      console.error('Error updating task visibility:', err);
      // Handle error if needed
    });
});


app.get('/sortsprint', (req, res) => {
  sortStatusSprint = true
  Sprints.find()
    .then(result => {
      // Define the status order for sprints
      const statusOrderSprint = ['Not Started','In Progress', 'Completed'];

      // Sort the result array based on the status order for sprints
      result.sort((a, b) => {
        const check1 = (new Date() > a.startdate & new Date() < a.enddate)? "In Progress" : (new Date() < a.startdate)? "Not Started" : "Completed"
        const check2 = (new Date() > b.startdate & new Date() < b.enddate)? "In Progress" : (new Date() < b.startdate)? "Not Started" : "Completed"
        const statusA = statusOrderSprint.indexOf(check1);
        const statusB = statusOrderSprint.indexOf(check2);
        return statusA - statusB;
      });

      // Toggle the sorting order between -1 and 1

      res.render('scrumboard', { sprints: result, title: 'All sprints', sortStatusSprint});
    })
    .catch(err => {
      console.log(err);
    });
});

app.get('/sortsprint2', (req, res) => {
  sortStatusSprint = false
  Sprints.find()
    .then(result => {
      // Define the status order for sprints
      const statusOrderSprint = ['Completed', 'In Progress', 'Not Started'];

      // Sort the result array based on the status order for sprints
      result.sort((a, b) => {
        const check1 = (new Date() > a.startdate & new Date() < a.enddate)? "In Progress" : (new Date() < a.startdate)? "Not Started" : "Completed"
        const check2 = (new Date() > b.startdate & new Date() < b.enddate)? "In Progress" : (new Date() < b.startdate)? "Not Started" : "Completed"
        const statusA = statusOrderSprint.indexOf(check1);
        const statusB = statusOrderSprint.indexOf(check2);
        return statusA - statusB;
      });

      // Toggle the sorting order between -1 and 1

      res.render('scrumboard', { sprints: result, title: 'All sprints', sortStatusSprint});
    })
    .catch(err => {
      console.log(err);
    });
});




// ---------------------------------------------------------------------------------------------






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

app.get('/scrumboard/task/:id', (req, res) => {
  const id = req.params.id;
  Blog.findById(id)
    .then(result => {
      res.render('sprinttask', { blog: result, title: 'Blog Details' });
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

    // Find the Blog task based on its ID
    const task = await Blog.findById(blogTaskId); // Replace 'Blog' with your actual Blog model

    if (!task) {
      // Handle the case when the Blog task is not found
      res.status(404).send('Blog task not found');
      return;
    }

    // Find the Sprint that contains the Blog task
    const sprint = await Sprints.findOne({ tasks: blogTaskId });

    const tasks = sprint.tasks
    if (!sprint) {
      // Handle the case when the Sprint is not found
      res.status(404).send('Sprint not found for this task');
      return;
    }

    // Render the EJS file and pass the specific task, sprint, and other necessary data to it
    res.render('accumulation', { Blog: Blog,tasks,task, sprint, title: "Accumulation" });
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