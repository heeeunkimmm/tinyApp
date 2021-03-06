const express = require("express");
const app = express();
const PORT = process.env.PORT || 8080;
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: 'session',
  keys: ['itsSuperSecret']
}));

const urlDatabase = {};
const users = {};

//Generate a Random ShortURL
function generateRandomString() {
  var result = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 6; i++) {
    result += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return result;
}


// Landing page of TinyApp
app.get("/", (req, res) => {
  res.render("url_landing");
});


// Json version of urlDatabase
app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});



//Show the list of URLs with their shortened forms
app.get("/urls", (req, res) => {
  const userCookie = req.session.user_id;

  function urlsForUser(id) {
    const urls = {};
    let userSpecificURLs;
    for (const shortURL in urlDatabase) {
      if (urlDatabase[shortURL]["user_id"] === id) {
        urls[shortURL] = urlDatabase[shortURL];
      }
    }
    return urls;
  }

  if (!userCookie) {
    res.status(400).send("Please log in first to view your shortend URLs!");
    return;
  } else {
    userSpecificURLs = urlsForUser(userCookie);
  }

  let templateVars = {
    urlDatabase: urlDatabase,
    userSpecificURLs: userSpecificURLs,
    user: users[userCookie]["email"]
  };

  res.render("urls_index", templateVars);
});


//add new URLs
app.post("/urls", (req, res) => {
  const userCookie = req.session.user_id;

  if (!userCookie) {
    res.status(400).send("You are not logged in!");
  } else {
    const newURL = req.body.longURL;
    const shortURL = generateRandomString();
    urlDatabase[shortURL] = {
      longURL: newURL,
      user_id: userCookie
    };
    res.redirect("/urls/" + shortURL);
  }

});


//show /urls/new page
app.get("/urls/new", (req, res) => {
  const userCookie = req.session.user_id;
  if (!userCookie) {
    res.redirect("/login");
    return;
  } else {
    let templateVars = {
      user: users[userCookie]["email"]
    };
    res.render("urls_new", templateVars);
  }
});


//delete URLs
app.post("/urls/:shortURL/delete", (req, res) => {
  const selectedShortURL = req.params.shortURL;
  delete urlDatabase[selectedShortURL];
  res.redirect("/urls");
});


//update URLs
app.post("/urls/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  const newlongURL = req.body.newLongURL;
  const userCookie = req.session.user_id;

  if (userCookie !== urlDatabase[shortURL]["user_id"]) {
    res.status(401).send("This is not your URL to update!");
    return;
  } else {
    urlDatabase[shortURL]["longURL"] = newlongURL;
    res.redirect("/urls");
  }
});


// show the individual URL (individual page)
app.get("/urls/:id", (req, res) => {
  const userCookie = req.session.user_id;
  const user = users[userCookie];
  const shortURL = req.params.id;

  if (userCookie) {
    if (!urlDatabase[shortURL]) {
      res.status(400).send("This short URL does not exist..");
      return;
    }
    let templateVars = {
      user: user["email"],
      shortURL: shortURL,
      longURL: urlDatabase[shortURL]["longURL"]
    };
    res.render("urls_show", templateVars);
  } else {
      res.status(401).send("Please log in to view this page!");
    }
});



//user registration page
app.get("/register", (req, res) => {
  const userCookie = req.session.user_id;
  const templateVars = {
    user: userCookie
  };
  if (userCookie) {
    res.redirect("/urls");
  } else {
    res.render("urls_register", templateVars);
  }
});


app.post("/register", (req, res) => {
  const newID = generateRandomString();
  const newEmail = req.body.email;

  const newPassword = req.body.password;
  const hashed_newPassword = bcrypt.hashSync(newPassword, 10);

  if (!newEmail || !newPassword) {
    res.status(401).send("Please enter your email address and password!");
    return;
  }

  for (const user in users) {
    if (newEmail === users[user].email) {
      res.status(401).send("This email already exists! Please log in.");
      return;
    }
  }
  // Putting new user to the database
  users[newID] = {
    id: newID,
    email: newEmail,
    password: hashed_newPassword
  };
  req.session.user_id = newID;
  res.redirect("/urls");
});



//create login page
app.get("/login", (req, res) => {
  const userCookie = req.session.user_id;
  const templateVars = {
    user: userCookie
  };
  if (userCookie) {
    res.redirect("/urls");
  } else {
    res.render("urls_login", templateVars);
  }
});


//handling login submissions
app.post("/login", (req, res) => {
  const userEmail = req.body.email;
  const userPassword = req.body.password;
  if (!userEmail || !userPassword) {
    res.status(400).send("Please enter email and password!");
    return;
  }
  for (let user in users) {
    if (users[user].email === userEmail && bcrypt.compareSync(userPassword, users[user]["password"])) {
      const ID = users[user].id;
      req.session.user_id = ID;
      res.redirect("/urls");
      return;
    }
  }
  res.status(401).send("Either your email address or password seems to be wrong! Try again.");
});


// when user logs out, redirect to /urls
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/urls");
});



//redirect short URL to actual, long URL site
app.get("/u/:shortURL", (req, res) => {
  const userCookie = req.session.user_id;
  const shortURL = req.params.shortURL;
  const longURL = urlDatabase[shortURL].longURL;
  res.redirect(longURL);
});



//server console msg
app.listen(PORT, () => {
  console.log(`tinyApp listening on port ${PORT}!`);
});







