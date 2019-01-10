const express = require('express');

/**
 * importing lodash
 */
const _ = require('lodash');

const cookieParser = require('cookie-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const passport = require('passport');
const mongoStore = require('connect-mongo')(session);
const fs = require('fs');
/**
 * requiring the authenticate middleware
 */
const authenticate = require('../auth/authenticate');

/**
 * it is used so that both socketIO and express can run simultaneously
 * it is available in core library.
 */
const http = require('http');

/**
 * setting up express app
 */
const app = express();

/**
 * import user model and mongoose
 */
let User = require('../models/user');

/**
 * it is used in-order to create the path towards the folder or file nice and readable
 * it is available in core library.
 */
const path = require('path');

/**
 * It is used for parsing the data send by the clients.
 */
const bodyparser = require('body-parser');

/**
 * Public path defination
 */
const publicPath = path.join(__dirname, '../..', '/public'),
    views = path.join(__dirname, '../..', '/public/views');

/**
 * setting up middleware at public directory which is displayed in browser
 * in the main directory '/' file should be index.ejs
 */
app.use(express.static(publicPath));

app.set('views', views);

app.set('view engine', 'ejs');

/**
 * to parse json objects
 */
app.use(bodyparser.json());

/**
 * to parse post request or urlencoded data
 */
app.use(bodyparser.urlencoded({
    extended: true
}));

/**
 * Session based login middleware and the data is stored in mongodb
 */
app.use(session({
    name: 'session-id',
    secret: process.env.secret,
    cookie: {
        maxAge: new Date(Date.now() + 86400000)
    },
    saveUninitialized: false,
    resave: false,
    store: new mongoStore({
        url: process.env.MONGODB_URI,
        autoRemove: 'native'
    })
}));

app.use(passport.initialize());
app.use(passport.session());

/**
 * created a http server to use express
 */
const server = http.createServer(app);

/**
 * get and post route of '/'
 * get is used for rendering the index.ejs file
 * post is used for authenticating of the user for login
 * and redirect to '/status' if success or to '/' if
 * failed
 */
app.get('/', (req, res) => {
    res.status(200).render('index',{title:'Drone | login'});
});

app.post('/', (req, res, next) => {
    let body = _.pick(req.body,['location']);
    passport.authenticate('local', function(err, user, info) {
        if (err) {
            return res.redirect('/');
        }
        if (!user) {
            return res.redirect('/');
        }
        if (!user.validLocation(body.location)){
            return res.redirect('/');
        }
        req.logIn(user, function(err) {
            if (err) {
                return res.redirect('/');
            }
            res.statusCode = 200;
            return res.redirect('/'+ body.location);
        });
    })(req, res, next);
});
/********************************************************************/

/**
 * TODO: need to upgrade according to the app
 * for login in android
 */
app.post('/android', passport.authenticate('local'), (req, res) => {
    let body = _.pick(req.body,['username','password']);
      
    res.statusCode = 200;
    res.setHeader('Content-Type','text/plain');
    res.send('OK');
});
/********************************************************************/

/**
 * for creating user
 */
app.post('/signup',(req,res) => {
    User.register(new User({username: req.body.username}),
        req.body.password,(err,user)=> {
            if (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type',
                    'application/json');
                res.json({err: err});
            } else {
                if (req.body.location)
                    user.location = req.body.location;
                user.save((err,user) => {
                    if (err) {
                        res.statusCode = 500;
                        res.setHeader('Content-Type','application/json');
                        res.json({err:err});
                        return;
                    }
                    passport.authenticate('local')
                    (req, res, () => {
                        res.statusCode = 200;
                        res.setHeader('Content-Type',
                            'application/json');
                        res.json({success: true,
                            status: 'Registration Successful'});
                    });
                });
            }
        });
});
/********************************************************************/

function auth (req, res, next)  {
    if (!req.user) {
        let err = new Error('You are not authenticated!');
        err.status = 403;
        return res.redirect('/');
    } else {
        next();
    }
}

app.use(auth);

/**
 * to render the status.ejs in /status
 */
app.get('/default',(req, res) => {
    User.findById(req.session.passport.user,(err,user) => {
        if (err) {
            return res.redirect('/');
        }
        var urlString = '/'+user.location;
        if (urlString != req.url){
            res.statusCode = 401;
            return res.redirect('/');
        }
        res.render('status',{href:"../datadefault.txt"});
    });
});
/********************************************************************/

/**
 * to render the status.ejs in /status
 */
app.get('/nangi', (req, res) => {
    User.findById(req.session.passport.user,(err,user) => {
        if (err) {
            return res.redirect('/');
        }
        var urlString = '/'+user.location;
        if (urlString != req.url){
            res.statusCode = 401;
            return res.redirect('/');
        }
        res.render('status', {href:"/nangidata"});
    });
});
/********************************************************************/

/**
 * to render the file.ejs to show data that can be downloaded by the user
 */
app.get('/nangidata',(req, res) => {
    User.findById(req.session.passport.user,(err,user) => {
        let href=[];
        let status = [];
        let i = 0;
        if (err) {
            return res.redirect('/');
        }
        let urlString = '/'+user.location+'data';
        if (urlString != req.url){
            res.statusCode = 401;
            return res.redirect('/');
        }
        let nangipath = path.join(__dirname,'../..','/public/data/nangi/');
        let files = fs.readdirSync(nangipath);
        files = files.splice(1);
        files.forEach( file => {
            let data = {
                fileName: '../data/nangi/'+file,
                fileTime: fs.statSync(path.join(nangipath, file)).birthtime.toUTCString()
            };
            href.push(data);
        });
        res.render('file',{
            title: "data of nangi",
            data: href
        });
    });
});
/********************************************************************/

/**
 * to render the status.ejs in /status
 */
app.get('/pulchowk',(req, res) => {
    User.findById(req.session.passport.user,(err,user) => {
        if (err) {
            return res.redirect('/');
        }
        var urlString = '/'+user.location;
        if (urlString != req.url){
            res.statusCode = 401;
            return res.redirect('/');
        }
        res.render('status', {href: "/pulchowkdata"});
    });
});
/********************************************************************/

/**
 * to render the file.ejs to show data that can be downloaded by the user
 */
app.get('/pulchowkdata',(req, res) => {
    User.findById(req.session.passport.user,(err,user) => {
        let href=[];
        let status = [];
        let i = 0;
        if (err) {
            return res.redirect('/');
        }
        let urlString = '/'+user.location+'data';
        if (urlString != req.url){
            res.statusCode = 401;
            return res.redirect('/');
        }
        let pulchowkpath = path.join(__dirname,'../..','/public/data/pulchowk/');
        let files = fs.readdirSync(pulchowkpath);
        files = files.splice(1);
        files.forEach( file => {
            let data = {
                fileName: '../data/pulchowk/'+file,
                fileTime: fs.statSync(path.join(pulchowkpath, file)).birthtime.toUTCString()
            };
            href.push(data);
        });
        res.render('file',{
            title: "data of Pulchowk",
            data: href
        });
    });
});
/********************************************************************/

/**
 * to render the status.ejs in /status
 */
app.get('/dharan',(req, res) => {
    User.findById(req.session.passport.user,(err,user) => {
        if (err) {
            return res.redirect('/');
        }
        var urlString = '/'+user.location;
        if (urlString != req.url){
            res.statusCode = 401;
            return res.redirect('/');
        }
        res.render('status', {href: "/dharandata"});
    });
});
/********************************************************************/

/**
 * to render the file.ejs to show data that can be downloaded by the user
 */
app.get('/dharandata',(req, res) => {
    User.findById(req.session.passport.user,(err,user) => {
        let href=[];
        let status = [];
        let i = 0;
        if (err) {
            return res.redirect('/');
        }
        let urlString = '/'+user.location+'data';
        if (urlString != req.url){
            res.statusCode = 401;
            return res.redirect('/');
        }
        let dharanpath = path.join(__dirname,'../..','/public/data/dharan/');
        let files = fs.readdirSync(dharanpath);
        files = files.splice(1);
        files.forEach( file => {
            let data = {
                fileName: '../data/dharan/'+file,
                fileTime: fs.statSync(path.join(dharanpath, file)).birthtime.toUTCString()
            };
            href.push(data);
        });
        res.render('file',{
            title: "data of Dharan",
            data: href
        });
    });
});
/********************************************************************/

/**
 * to render the status.ejs in /status
 */
app.get('/dhangadi',(req, res) => {
    User.findById(req.session.passport.user,(err,user) => {
        if (err) {
            return res.redirect('/');
        }
        var urlString = '/'+user.location;
        if (urlString != req.url){
            res.statusCode = 401;
            return res.redirect('/');
        }
        res.render('status', {href: "/dhangadidata"});
    });
});
/********************************************************************/

/**
 * to render the file.ejs to show data that can be downloaded by the user
 */
app.get('/dhangadidata',(req, res) => {
    User.findById(req.session.passport.user,(err,user) => {
        let href=[];
        let status = [];
        let i = 0;
        if (err) {
            return res.redirect('/');
        }
        let urlString = '/'+user.location+'data';
        if (urlString != req.url){
            res.statusCode = 401;
            return res.redirect('/');
        }
        let dhangadipath = path.join(__dirname,'../..','/public/data/dhangadi/');
        let files = fs.readdirSync(dhangadipath);
        files = files.splice(1);
        files.forEach( file => {
            let data = {
                fileName: '../data/dhangadi/'+file,
                fileTime: fs.statSync(path.join(dhangadipath, file)).birthtime.toUTCString()
            };
            href.push(data);
        });
        res.render('file',{
            title: "data of Dhangadi",
            data: href
        });
    });
});
/********************************************************************/

/**
 * to render the statusall.ejs in /stautsall
 */
app.get('/all',(req, res) => {
    User.findById(req.session.passport.user,(err,user) => {
        if (err) {
            return res.redirect('/');
        }
        var urlString = '/'+user.location;
        if (urlString != req.url){
            res.statusCode = 401;
            return res.redirect('/');
        }
        res.render('statusall');
    });
});
/********************************************************************/

module.exports = server;