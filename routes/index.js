const express = require('express');
const router = express.Router();
const User = require('../models/user');
const multer = require('multer');
const path = require('path');

const helpers = require('./helpers');

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'views/uploads/');
    },

    // By default, multer removes file extensions so let's add them back
    filename: function(req, file, cb) {
        cb(null, file.fieldname + path.extname(file.originalname));
    }
});

let r = (Math.random() + 1).toString(36).substring(7); //generate a random string for passwd reset

const tf = require('@tensorflow/tfjs');

const sendgrid = require('@sendgrid/mail');
const SENDGRID_API_KEY = "api_key_here"
sendgrid.setApiKey(SENDGRID_API_KEY)

router.get('/', (req, res, next) => {
	return res.render('index.ejs');
});


router.post('/', (req, res, next) => {
	let personInfo = req.body;

	if (!personInfo.email || !personInfo.username || !personInfo.password || !personInfo.passwordConf) {
		res.send();
	} else {
		if (personInfo.password == personInfo.passwordConf) {

			User.findOne({ email: personInfo.email }, (err, data) => {
				if (!data) {
					let c;
					User.findOne({}, (err, data) => {

						if (data) {
							c = data.unique_id + 1;
						} else {
							c = 1;
						}

						let newPerson = new User({
							unique_id: c,
							email: personInfo.email,
							username: personInfo.username,
							password: personInfo.password,
							passwordConf: personInfo.passwordConf
						});

						newPerson.save((err, Person) => {
							if (err)
								console.log(err);
							else
								console.log('Success');
						});

					}).sort({ _id: -1 }).limit(1);
					res.send({ "Success": "You are regestered,You can login now." });
				} else {
					res.send({ "Error": "Email is already used." });
				}

			});
		} else {
			res.send({ "Error": "password is not matched" });
		}
	}
});

router.get('/login', (req, res, next) => {
	return res.render('login.ejs');
});

router.post('/login', (req, res, next) => {
	User.findOne({ email: req.body.email }, (err, data) => {
		if (data) {

			if (data.password == req.body.password) {
				req.session.userId = data.unique_id;
				res.send({ "Success": "Success!" });
			} else {
				res.send({ "Success": "Wrong password!" });
			}
		} else {
			res.send({ "Success": "This Email Is not regestered!" });
		}
	});
});

router.get('/profile', (req, res, next) => {
	User.findOne({ unique_id: req.session.userId }, (err, data) => {
		if (!data) {
			res.redirect('/');
		} else {
			return res.render('data.ejs', { "name": data.username, "email": data.email });
		}
	});
});

router.post('/profile', (req, res) => {
    // 'xray' is the name of our file input field in the HTML form
    let upload = multer({ storage: storage, fileFilter: helpers.imageFilter }).single('xray');

    upload(req, res, function(err) {

        if (req.fileValidationError) {
            return res.send(req.fileValidationError);
        }
        else if (!req.file) {
            return res.send('Please select an image to upload');
        }
        else if (err instanceof multer.MulterError) {
            return res.send(err);
        }
        else if (err) {
            return res.send(err);
        }
        res.redirect('/diagnosis');
    });
});

router.get("/diagnosis", (req, res) => {
  res.render("diagnosis.ejs")
});


router.get('/logout', (req, res, next) => {
	if (req.session) {
		// delete session object
		req.session.destroy((err) => {
			if (err) {
				return next(err);
			} else {
				return res.redirect('/');
			}
		});
	}
});

router.get('/about', (req, res, next)=>{
	res.render("about.ejs")
});

router.get('/forgetpass', (req, res, next) => {
	res.render("forget.ejs");
});

router.post('/forgetpass', (req, res, next) => {
	User.findOne({ email: req.body.email }, (err, data) => {
		if (!data) {
			res.send({ "Success": "This Email Is not registered!" });
		} else {
		    const msg = {
                from: 'health.informatics.team@gmail.com',
                to: req.body.email,
                subject: 'HI App: Password Reset Link',
                text: 'Please find password reset link:http://localhost:3000/'+r,
                html: '<p>Please find password reset link:</p><a>http://localhost:3000/'+r+'</a>',
            }
            sendgrid.send(msg).then((resp) => {
                res.send({ "Success": "E-mail Sent!" });
            })
            .catch((error) => {
                res.send({ "Success": "Error, please try again later" });
            })
		}
	});
});

router.get('/'+r, (req, res, next) => {
	res.render("resetpass.ejs");
});

router.post('/'+r, (req, res, next) => {
	User.findOne({ email: req.body.email }, (err, data) => {
		if (!data) {
			res.send({ "Success": "This Email Is not registered!" });
		} else {
			if (req.body.password == req.body.passwordConf) {
				data.password = req.body.password;
				data.passwordConf = req.body.passwordConf;

				data.save((err, Person) => {
					if (err)
						console.log(err);
					else
					    res.send({ "Success": "Password changed!" });
				});
			} else {
				res.send({ "Success": "Password do not match! Both Password should be same." });
			}
		}
	});

});

module.exports = router;