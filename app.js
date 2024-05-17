const express = require("express");
const userModel = require("./models/user");
const postModel = require("./models/post");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const cookieParser = require("cookie-parser");
const user = require("./models/user");
// const user = require("./models/user");

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

function isLoggedin(req, res, next) {
  if (!req.cookies.token) return res.redirect("/signup");
  let data = jwt.verify(req.cookies.token, "ook");
  req.user = data;
  next();
}

app.get("/signup", (req, res) => {
  res.render("signup");
});
app.get("/profile", isLoggedin, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email }).populate('posts')
  console.log(user);
  res.render("profile", { user });
});
app.post("/signup", (req, res) => {
  const { name, email, password } = req.body;
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      let user = await userModel.create({
        name: name,
        email: email,
        password: hash,
      });
      let token = jwt.sign({ email: user.email, userid: user._id }, "ook");
      res.cookie("token", token);
      res.redirect("/profile");
    });
  });
});

app.get('/login',(req, res) => {
    res.render('login')
})

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  let user = await userModel.findOne({email : email})
  if (!user) return res.redirect("/login");
  bcrypt.compare(password, user.password, (err, result) => {
    if (result) {
      let token = jwt.sign({ email: user.email, userid: user._id }, "ook");
      res.cookie("token", token);
      res.redirect("/profile");
    }else{
        res.redirect('/login')
    }
  });
});
app.post("/post", isLoggedin, async (req, res) => {
    let user =await  userModel.findOne({email : req.user.email})
    const { content } = req.body;
    let post = await postModel.create({
        content : content,
        user : user._id
    })
    user.posts.push(post._id)
    await user.save()
    res.redirect('/profile')
  });

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/signup");
});

app.get('/delete/:id' , async (req, res) => {
    let post = await postModel.findOneAndDelete({_id : req.params.id})
    res.redirect('/profile')
})

app.get('/like/:id', isLoggedin ,async(req, res) => {
  let post = await postModel.findOne({_id : req.params.id})
  if(post.likes.indexOf(req.user.userid) === -1){
    post.likes.push(req.user.userid)
  }  else{
    post.likes.splice(post.likes.indexOf(req.user.userid) , 1)
  }
  await post.save()
  res.redirect('/profile')
})

app.post('/edit/:id' , isLoggedin , async(req, res) => {
  let post = await postModel.findOneAndUpdate({_id : req.params.id}, {content : req.body.content})
  res.redirect('/profile')
})

app.get('/edit/:id' , isLoggedin ,async (req,res) => {
  let post = await postModel.findOne({_id : req.params.id})
  res.render('edit' , {post})
})

app.listen(3000, () => {
  console.log("server is running");
});
